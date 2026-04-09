import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { AppText as Text } from "@/components/AppText";
import { AppTextInput as TextInput } from "../../src/components/AppTextInput";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import {
  generateSafeRoute,
  generateSmartRoute,
  setSelectedRoute,
  updateRoutePreferences,
  searchLocations,
  RouteRequest,
  startNavigation,
  saveRouteToDatabase,
  startNavigationSession,
  setRouteRequest,
  setNavigationSessionId,
  fetchSearchHistory,
  addToSearchHistory,
} from "../store/locationsSlice";
import RouteComparisonCard from "./RouteComparisonCard";
import { googlePlacesService } from "@/services/googlePlaces";
import ProfileBanner from "./ProfileBanner";
import { checkProfileCompleteness } from "@/utils/profileValidation";
import { shouldShowBanner } from "@/store/profileBannerSlice";
import { theme } from "@/styles/theme";
import { APP_CONFIG } from "@/config/appConfig";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import * as Crypto from "expo-crypto";
import { useAuth } from "@/providers/AuthProvider";
import {
  canSearch,
  incrementSearchCount,
  DAILY_LIMIT,
} from "@/utils/searchLimitService";
import { SubscriptionTier } from "@/config/features";
import { showPremiumPrompt } from "@/store/premiumPromptSlice";
import { GlobalPremiumPromptModal } from "./PremiumGate";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { commonStyles } from "@/styles/common";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
interface RoutePlanningModalProps {
  visible: boolean;
  onClose: () => void;
  initialSearchQuery?: string;
  initialDestination?: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    source?: "database" | "mapbox";
  } | null;
}

// NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API

interface LocationResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  source: "database" | "mapbox" | "current_location";
}

const RoutePlanningModal: React.FC<RoutePlanningModalProps> = ({
  visible,
  onClose,
  initialDestination,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    selectedRoute,
    routeLoading,
    routeError,
    routePreferences,
    smartRouteComparison,
    showSmartRouteComparison,
    searchResults,
    searchLoading,
    userLocation,
    userCountry,
    navigationActive,
  } = useAppSelector((state) => state.locations);
  const searchRadiusKm = useAppSelector((state) => state.user.searchRadiusKm);

  const { user: currentUser } = useAuth();
  const userProfile = useAppSelector((state) => state.user.profile);
  const userTier = (userProfile?.subscription_tier ||
    "free") as SubscriptionTier;

  const bannerState = useAppSelector((state) => state.profileBanner);

  const searchHistory = useAppSelector(
    (state) => state.locations.searchHistory,
  );
  const { hasAccess: hasSearchHistoryAccess } =
    useFeatureAccess("searchHistory");
  const { hasAccess: hasRoutePlanningAccess } =
    useFeatureAccess("routePlanning");

  const scrollViewRef = useRef<ScrollView>(null);
  // Check profile completeness for safe routing
  const profileCheck = React.useMemo(() => {
    if (!userProfile) return { canUse: true, missingFields: [] };

    const validation = checkProfileCompleteness(userProfile, "SAFE_ROUTING");
    return {
      canUse: validation.canUseFeature,
      missingFields: validation.missingFieldsForFeature,
    };
  }, [userProfile]);

  useEffect(() => {
    if (smartRouteComparison && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [smartRouteComparison]);

  // Determine if we should show the banner
  const showProfileBanner = React.useMemo(() => {
    if (profileCheck.canUse) return false;
    return shouldShowBanner(
      bannerState,
      APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES.ROUTING_INCOMPLETE,
    );
  }, [profileCheck.canUse, bannerState]);

  // Location state
  const [fromLocation, setFromLocation] = useState<LocationResult | null>(null);
  const [toLocation, setToLocation] = useState<LocationResult | null>(null);
  const [isStartingNavigation, setIsStartingNavigation] = useState(false);
  // NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API

  // Search state
  const [activeInput, setActiveInput] = useState<"from" | "to" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapboxResults, setMapboxResults] = useState<LocationResult[]>([]);

  const [dangerMessage, setDangerMessage] = useState<string>("");
  const [routeLoadingMessage, setRouteLoadingMessage] = useState(
    t("navigation.find_safe_route"),
  );

  // Initialize from location with current location
  useEffect(() => {
    if (visible && userLocation && !fromLocation) {
      setFromLocation({
        id: "current_location",
        name: t("navigation.current_location"),
        address: t("navigation.your_current_location"),
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        source: "current_location",
      });
    }
  }, [visible, userLocation, fromLocation]);

  useEffect(() => {
    if (visible && initialDestination && !toLocation) {
      setToLocation({
        id: initialDestination.id,
        name: initialDestination.name,
        address: initialDestination.address,
        latitude: initialDestination.latitude,
        longitude: initialDestination.longitude,
        source: (initialDestination.source || "mapbox") as
          | "database"
          | "mapbox"
          | "current_location",
      });
    }
  }, [visible, initialDestination, toLocation]);

  // Clear state when modal closes
  useEffect(() => {
    if (!visible) {
      setFromLocation(null);
      setToLocation(null);
      setActiveInput(null);
      setSearchQuery("");
      setMapboxResults([]);
    }
  }, [visible]);

  const reverseGeocodeLocation = async (
    latitude: number,
    longitude: number,
  ): Promise<string> => {
    try {
      const results = await googlePlacesService.reverseGeocode({
        latitude,
        longitude,
      });
      if (results && results.length > 0) {
        // Return a short name like "Winterthur" or "Main Street 5, Winterthur"
        return (
          results[0].formatted_address
            ?.split(",")
            .slice(0, 2)
            .join(",")
            .trim() || "Unknown Location"
        );
      }
    } catch (error) {
      logger.error("Reverse geocode failed:", error);
    }
    return "Unknown Location";
  };

  // Mapbox search function
  // Google Places Autocomplete search
  const searchGoogle = async (query: string): Promise<LocationResult[]> => {
    try {
      const country = userCountry || "us";

      const autocompleteParams: any = {
        query,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
      };

      if (searchRadiusKm < 999999) {
        autocompleteParams.radius = searchRadiusKm * 1000; // Convert km to meters
        autocompleteParams.components = `country:${country}`;
      }

      const results =
        await googlePlacesService.autocomplete(autocompleteParams);

      return results.slice(0, 5).map((result) => ({
        id: `google_${result.place_id}`,
        name: result.structured_formatting.main_text,
        address:
          result.structured_formatting.secondary_text || result.description,
        latitude: 0, // Will be fetched when user selects
        longitude: 0, // Will be fetched when user selects
        place_type: result.types[0] || "location",
        source: "mapbox" as const, // Legacy naming
      }));
    } catch (error) {
      logger.error("Google Places search error:", error);
      return [];
    }
  };

  // Combined search function
  const performSearch = useCallback(
    async (query: string) => {
      if (query.length < 3) {
        setMapboxResults([]);
        return;
      }

      // Search database
      dispatch(
        searchLocations({
          query,
          latitude: userLocation ? userLocation.latitude : undefined,
          longitude: userLocation ? userLocation.longitude : undefined,
        }),
      );

      // NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API
      // Search Mapbox
      const mapboxResults = await searchGoogle(query);
      setMapboxResults(mapboxResults);
    },
    [dispatch, userLocation, userTier],
  );

  // Handle starting navigation
  const handleStartNavigation = async () => {
    setIsStartingNavigation(true);
    try {
      if (!userProfile) {
        notify.error(
          i18n.t("profile.profile_not_ready"),
          i18n.t("common.not_ready"),
        );
        return;
      }
      const navigationSessionId = Crypto.randomUUID();
      dispatch(setNavigationSessionId(navigationSessionId));

      if (
        !smartRouteComparison?.optimized_route ||
        !selectedRoute ||
        !fromLocation ||
        !toLocation
      ) {
        notify.error(t("navigation.no_route_selected_for_navigation"));
        return;
      }

      // Create the route request data object
      const routeRequestData = {
        origin: {
          latitude: fromLocation.latitude,
          longitude: fromLocation.longitude,
        },
        destination: {
          latitude: toLocation.latitude,
          longitude: toLocation.longitude,
        },
        user_demographics: {
          race_ethnicity: userProfile?.race_ethnicity?.[0] || "",
          gender: userProfile?.gender || "",
          lgbtq_status: String(userProfile?.lgbtq_status ?? ""),
          religion: userProfile?.religion || "",
          disability_status: userProfile?.disability_status?.[0] || "",
          age_range: userProfile?.age_range || "",
        },
        route_preferences: {
          prioritize_safety: true,
          avoid_evening_danger: routePreferences.avoidEveningDanger,
          max_detour_minutes: routePreferences.maxDetourMinutes || 30,
        },
      };

      dispatch(setRouteRequest(routeRequestData));
      const resolvedOriginName =
        fromLocation.source === "current_location"
          ? await reverseGeocodeLocation(
              fromLocation.latitude,
              fromLocation.longitude,
            )
          : fromLocation.name;

      const savedRoute = await dispatch(
        saveRouteToDatabase({
          route_coordinates: selectedRoute.coordinates,
          steps: selectedRoute.steps,
          origin_name: resolvedOriginName,
          destination_name: toLocation.name,
          distance_km: selectedRoute.distance_kilometers,
          duration_minutes: selectedRoute.estimated_duration_minutes,
          safety_score: selectedRoute.safety_analysis.overall_route_score,
          navigation_session_id: navigationSessionId,
        }),
      ).unwrap();

      const optimizedRoute = {
        ...smartRouteComparison.optimized_route,
        route_points: smartRouteComparison.optimized_route.coordinates,
        databaseId: savedRoute.id,
        navigationSessionId: navigationSessionId,
      };
      dispatch(setSelectedRoute(optimizedRoute));

      if (optimizedRoute.databaseId) {
        await dispatch(startNavigationSession(savedRoute.id));
      }

      // Dispatch start navigation action
      dispatch(startNavigation());
      onClose();
    } finally {
      setIsStartingNavigation(false);
    }
  };

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (activeInput && searchQuery) {
        performSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, activeInput, performSearch]);

  // Update danger message when selected route changes
  useEffect(() => {
    if (selectedRoute?.safety_analysis) {
      const dangerZones =
        selectedRoute.safety_analysis.danger_zones_intersected ?? 0;
      const safetyScore = selectedRoute.safety_analysis.overall_route_score;
      const safetyNotes = [
        selectedRoute?.safety_analysis.safety_notes?.[0],
        selectedRoute?.safety_analysis.safety_notes?.[2],
        selectedRoute?.safety_analysis.safety_notes?.[3],
      ]
        .filter(Boolean)
        .map((note) => `⚠️ ${note}`)
        .join(".\n\n");
      if (dangerZones > 0 || safetyScore < 3.0) {
        setDangerMessage(
          dangerZones > 0
            ? `${safetyNotes}.`
            : `⚠️ This route has a low safety score (${safetyScore.toFixed(
                1,
              )}/5.0).`,
        );
      } else {
        setDangerMessage(""); // Clear message for safe routes
      }
    }
  }, [selectedRoute]);

  useEffect(() => {
    if (currentUser?.id && hasSearchHistoryAccess && visible) {
      dispatch(
        fetchSearchHistory({
          userId: currentUser.id,
          context: "route",
          limit: 10,
        }),
      );
    }
  }, [currentUser?.id, hasSearchHistoryAccess, visible, dispatch]);

  // Handle input focus
  const handleInputFocus = (inputType: "from" | "to") => {
    setActiveInput(inputType);
    setSearchQuery("");
    setMapboxResults([]);
  };

  // Handle close
  const handleClose = () => {
    //setFromLocation(null);
    setToLocation(null);
    setActiveInput(null);
    setSearchQuery("");
    setMapboxResults([]);
    onClose();
  };

  // Handle location selection
  const handleLocationSelect = async (location: LocationResult) => {
    // Check search limit for free users
    const allowed = await canSearch(userTier);

    if (!allowed) {
      Keyboard.dismiss();

      dispatch(
        showPremiumPrompt({
          feature: "unlimitedSearches",
          description: `You've used all ${DAILY_LIMIT} free searches today. Upgrade to Premium for unlimited searches.`,
        }),
      );
      return;
    }
    await incrementSearchCount();
    setActiveInput(null);
    setSearchQuery("");
    setMapboxResults([]);
    // If location already has coordinates (database result), use it directly

    if (location.latitude !== 0 && location.longitude !== 0) {
      if (activeInput === "from") {
        setFromLocation(location);
      } else if (activeInput === "to") {
        setToLocation(location);
      }
      if (currentUser?.id) {
        dispatch(
          addToSearchHistory({
            userId: currentUser.id,
            query: location.name,
            selectedLocationId:
              location.source === "database" ? location.id : undefined,
            selectedName: location.name,
            selectedLatitude: location.latitude,
            selectedLongitude: location.longitude,
            searchContext: "route",
          }),
        );
      }

      return;
    }

    // Google Places result - fetch full details
    try {
      const details = await googlePlacesService.getDetails({
        place_id: location.id.replace("google_", ""),
        fields: ["place_id", "name", "formatted_address", "geometry", "types"],
      });

      if (details) {
        const completeLocation: LocationResult = {
          id: details.place_id,
          name: details.name,
          address: details.formatted_address,
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
          place_type: details.types[0] || "location",
          source: "mapbox" as const,
        };

        if (activeInput === "from") {
          setFromLocation(completeLocation);
        } else if (activeInput === "to") {
          setToLocation(completeLocation);
        }
        if (currentUser?.id) {
          dispatch(
            addToSearchHistory({
              userId: currentUser.id,
              query: location.name,
              selectedLocationId:
                location.source === "database" ? location.id : undefined,
              selectedName: location.name,
              selectedLatitude: location.latitude,
              selectedLongitude: location.longitude,
              searchContext: "route",
            }),
          );
        }
      } else {
        notify.error(t("navigation.unable_to_get_location_details_please"));
      }
    } catch (error) {
      logger.error("Error fetching place details:", error);
      notify.error(t("navigation.unable_to_get_location_details_please"));
    }
  };

  // Handle selecting original route
  const handleSelectOriginalRoute = () => {
    if (smartRouteComparison?.original_route) {
      dispatch(setSelectedRoute(smartRouteComparison.original_route));
    }
  };

  // Handle selecting optimized route
  const handleSelectOptimizedRoute = async () => {
    if (smartRouteComparison?.optimized_route) {
      dispatch(setSelectedRoute(smartRouteComparison.optimized_route));
    }
  };

  const getLoadingMessages = (t: (key: string) => string) => [
    t("navigation.analyzing_route_segments"),
    t("navigation.checking_danger_zones"),
    t("navigation.finding_safer_alternatives"),
    t("navigation.calculating_safety_scores"),
    t("navigation.optimizing_your_route"),
  ];

  // Handle route generation
  const handleGenerateRoute = async () => {
    if (!hasRoutePlanningAccess) {
      dispatch(
        showPremiumPrompt({
          feature: "routePlanning",
          description: t("premium.feature_route_planning_text"),
        }),
      );
      return;
    }
    if (!fromLocation || !toLocation) {
      notify.error(
        t("navigation.missing_to_from_locations"),
        t("common.missing_information"),
      );
      return;
    }

    if (!userProfile) {
      notify.error(
        t("navigation.profile_required_text"),
        t("navigation.profile_required"),
      );
      return;
    }

    const routeRequest: RouteRequest = {
      origin: {
        latitude: fromLocation.latitude,
        longitude: fromLocation.longitude,
      },
      destination: {
        latitude: toLocation.latitude,
        longitude: toLocation.longitude,
      },
      user_demographics: {
        race_ethnicity: userProfile.race_ethnicity?.[0] || "",
        gender: userProfile.gender || "",
        lgbtq_status: String(userProfile.lgbtq_status ?? ""),
        religion: userProfile.religion || "",
        disability_status: userProfile.disability_status?.[0] || "",
        age_range: userProfile.age_range || "",
      },
      route_preferences: {
        prioritize_safety: true,
        avoid_evening_danger: routePreferences.avoidEveningDanger,
        max_detour_minutes: routePreferences.maxDetourMinutes || 30,
      },
    };
    const messages = getLoadingMessages(t);
    let messageIndex = 0;
    let intervalId: NodeJS.Timeout;
    try {
      setRouteLoadingMessage(messages[0]);

      intervalId = setInterval(() => {
        if (messageIndex < messages.length) {
          setRouteLoadingMessage(messages[messageIndex]);
          messageIndex++;
        } else {
          clearInterval(intervalId);
        }
      }, 1500);

      const result = await dispatch(generateSmartRoute(routeRequest)).unwrap();
      clearInterval(intervalId);

      const originalSafety =
        result.original_safety || result.original_route?.safety_analysis;
      const dangerZones =
        originalSafety?.danger_zones_intersected ??
        result.original_route?.safety_analysis?.danger_zones_intersected ?? // ← Correct fallback
        0;
      const safetyScore =
        originalSafety?.overall_route_score ??
        result.improvement_summary?.original_safety_score ??
        3.0;

      const safetyNotes = [
        selectedRoute?.safety_analysis.safety_notes?.[0],
        selectedRoute?.safety_analysis.safety_notes?.[2],
        selectedRoute?.safety_analysis.safety_notes?.[3],
      ]
        .filter(Boolean)
        .map((note) => `⚠️ ${note}`)
        .join(".\n\n");
      // ✅ CHECK: Warn if original route passes through danger zones
      if (dangerZones > 0 || safetyScore < 3.0) {
        setDangerMessage(
          dangerZones > 0
            ? `⚠️ This route passes through ${dangerZones} danger zone(s) for your demographics. ${safetyNotes}`
            : `⚠️ This route has a low safety score (${safetyScore.toFixed(
                1,
              )}/5.0).`,
        );
      }
    } catch (error) {
      clearInterval(intervalId!);
      logger.error("Route generation error:", error);
      notify.error(
        error instanceof Error ? error.message : "Failed to generate route",
        "Route Error",
      );

      // Fallback to basic route generation
      try {
        await dispatch(generateSafeRoute(routeRequest)).unwrap();
      } catch (fallbackError) {
        notify.error(t("navigation.unable_to_generate_route_please_try"));
      }
    }
  };

  // NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API
  // Get combined search results
  const allResults: LocationResult[] = [
    ...searchResults.map((result) => ({
      ...result,
      source: (result.source || "database") as
        | "database"
        | "mapbox"
        | "current_location",
    })),
    ...mapboxResults,
  ];
  // Render location input
  const renderLocationInput = (
    type: "from" | "to",
    location: LocationResult | null,
    placeholder: string,
  ) => (
    <TouchableOpacity
      style={[
        styles.locationInput,
        activeInput === type && styles.activeLocationInput,
      ]}
      onPress={() => handleInputFocus(type)}
    >
      <View style={styles.locationInputIcon}>
        <Ionicons
          name={type === "from" ? "radio-button-on" : "location"}
          size={20}
          color={type === "from" ? theme.colors.secondary : theme.colors.error}
        />
      </View>
      <View style={styles.locationInputContent}>
        {location ? (
          <>
            <Text style={styles.locationName} numberOfLines={1}>
              {location.name}
            </Text>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {location.address}
            </Text>
          </>
        ) : (
          <Text style={styles.locationPlaceholder}>{placeholder}</Text>
        )}
      </View>
      <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  // Render search result
  const renderSearchResult = ({ item }: { item: LocationResult }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleLocationSelect(item)}
    >
      <View style={styles.searchResultIcon}>
        <Ionicons
          name="location"
          size={20}
          color={theme.colors.textSecondary}
        />
      </View>
      <View style={styles.searchResultContent}>
        <Text style={styles.searchResultName}>{item.name}</Text>
        <Text style={styles.searchResultAddress}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  // Get safety badge color
  const getSafetyBadgeColor = (score: number): string => {
    if (score >= 4.0) return APP_CONFIG.MAP_MARKERS.COLOR_SAFE;
    if (score >= 3.0) return APP_CONFIG.MAP_MARKERS.COLOR_MEDIUM;
    return theme.colors.error;
  };
  if (!visible || navigationActive) return null;

  return (
    <View style={commonStyles.container}>
      {showProfileBanner && (
        <ProfileBanner
          bannerType={
            APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES
              .ROUTING_INCOMPLETE
          }
          missingFields={profileCheck.missingFields}
          visible={showProfileBanner}
        />
      )}
      {/* Header */}
      <View style={styles.specHeader}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("navigation.plan_safe_route")}</Text>
        <View style={styles.headerSpacer} />
      </View>
      {/* Warning banner for low safety routes */}
      {selectedRoute?.safety_analysis?.overall_route_score &&
        selectedRoute.safety_analysis.overall_route_score <
          APP_CONFIG.NAVIGATION.OVERALL_ROUTE_SCORE && (
          <View style={styles.dangerWarningBanner}>
            <Ionicons name="warning" size={24} color={theme.colors.accent} />
            <View style={styles.dangerWarningContent}>
              <Text style={styles.dangerWarningTitle}>
                {t("navigation.route_passes_through_danger_zones")}
              </Text>
              <Text style={styles.dangerWarningText}>{dangerMessage}</Text>
            </View>
          </View>
        )}
      {/* Search Mode */}
      {activeInput ? (
        <View style={styles.searchMode}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <TextInput
                filtered={false}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={
                  activeInput === "from"
                    ? t("navigation.search_for_starting_point")
                    : t("navigation.search_for_destination")
                }
                autoFocus
              />
            </View>
            {searchLoading && (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </View>

          {/* Recent Searches (Premium) - show when no search query */}
          {searchQuery.length === 0 &&
          hasSearchHistoryAccess &&
          searchHistory.length > 0 ? (
            <View style={styles.searchResults}>
              <View style={styles.recentHeader}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.recentHeaderText}>
                  {t("navigation.recent_searches")}
                </Text>
              </View>
              <FlatList
                data={searchHistory}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => {
                      if (item.selected_latitude && item.selected_longitude) {
                        const capturedInput = activeInput;
                        setActiveInput(null);
                        console.log("Search Query:", searchQuery);
                        setSearchQuery("");
                        setMapboxResults([]);
                        const location: LocationResult = {
                          id:
                            item.selected_location_id ||
                            item.selected_place_id ||
                            item.id,
                          name: item.selected_name || item.query,
                          address: "",
                          latitude: Number(item.selected_latitude),
                          longitude: Number(item.selected_longitude),
                          source: item.selected_location_id
                            ? "database"
                            : "mapbox",
                        };
                        if (capturedInput === "from") {
                          setFromLocation(location);
                        } else if (capturedInput === "to") {
                          setToLocation(location);
                        }
                      } else {
                        setSearchQuery(item.query);
                        performSearch(item.query);
                      }
                    }}
                  >
                    <View style={styles.searchResultIcon}>
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </View>
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultName}>
                        {item.selected_name || item.query}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          ) : (
            <FlatList
              style={styles.searchResults}
              data={allResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                searchQuery.length > 0 && !searchLoading ? (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>
                      {t("navigation.no_results_found")}
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      ) : (
        /* Route Planning Mode */
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              {/* Location Inputs */}
              <View style={styles.section}>
                <Text style={commonStyles.sectionTitle}>
                  {t("navigation.route_details")}
                </Text>
                <View style={styles.locationInputs}>
                  {renderLocationInput(
                    "from",
                    fromLocation,
                    "Choose starting point",
                  )}
                  {renderLocationInput(
                    "to",
                    toLocation,
                    t("navigation.choose_destination"),
                  )}
                </View>
              </View>

              {/* Safety Preferences */}
              <View style={styles.section}>
                <Text style={commonStyles.sectionTitle}>
                  {t("navigation.safety_preferences")}
                </Text>

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>
                    {t("navigation.avoid_evening_dangers")}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      routePreferences.avoidEveningDanger &&
                        styles.toggleActive,
                    ]}
                    onPress={() =>
                      dispatch(
                        updateRoutePreferences({
                          avoidEveningDanger:
                            !routePreferences.avoidEveningDanger,
                        }),
                      )
                    }
                  >
                    {routePreferences.avoidEveningDanger && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={theme.colors.background}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              {/* Generate Route Button */}
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  (routeLoading || !fromLocation || !toLocation) &&
                    commonStyles.buttonDisabled,
                ]}
                onPress={handleGenerateRoute}
                disabled={routeLoading || !fromLocation || !toLocation}
              >
                {routeLoading ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.background}
                    />
                    <Text style={styles.generateButtonText}>
                      {routeLoadingMessage ||
                        t("navigation.generate_safe_route")}
                    </Text>
                  </>
                ) : !hasRoutePlanningAccess ? (
                  <>
                    <Ionicons
                      name="lock-closed"
                      size={20}
                      color={theme.colors.background}
                    />
                    <Text style={styles.generateButtonText}>
                      {t("navigation.generate_safe_route")}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="navigate"
                      size={20}
                      color={theme.colors.background}
                    />
                    <Text style={styles.generateButtonText}>
                      {smartRouteComparison
                        ? t("navigation.safe_route_found")
                        : t("navigation.generate_safe_route")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Error Display */}
              {routeError && (
                <View style={styles.errorContainer}>
                  <Ionicons
                    name="warning"
                    size={20}
                    color={theme.colors.error}
                  />
                  <Text style={commonStyles.textError}>{routeError}</Text>
                </View>
              )}

              {/* Smart Route Comparison */}
              {showSmartRouteComparison && smartRouteComparison && (
                <RouteComparisonCard
                  comparison={smartRouteComparison}
                  onSelectOriginal={handleSelectOriginalRoute}
                  onSelectOptimized={handleSelectOptimizedRoute}
                  onStartNavigation={handleStartNavigation}
                  isStartingNavigation={isStartingNavigation}
                />
              )}

              {/* Selected Route Display */}
              {selectedRoute && !showSmartRouteComparison && (
                <View style={styles.routesSection}>
                  <Text style={commonStyles.sectionTitle}>
                    {t("navigation.your_route")}
                  </Text>
                  <View style={[styles.routeCard, styles.selectedRouteCard]}>
                    <View style={styles.routeHeader}>
                      <View style={styles.routeInfo}>
                        <Text style={styles.routeName}>
                          {selectedRoute.name}
                        </Text>
                        <Text style={styles.routeType}>
                          {t("navigation.type_route", {
                            type: selectedRoute.route_type,
                          })}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.safetyBadge,
                          {
                            backgroundColor: getSafetyBadgeColor(
                              selectedRoute.safety_analysis
                                ?.overall_route_score || 0,
                            ),
                          },
                        ]}
                      >
                        <Text style={styles.safetyScore}>
                          {Math.round(
                            selectedRoute.safety_analysis
                              ?.overall_route_score || 0,
                          )}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.routeMetrics}>
                      <View style={styles.metric}>
                        <Ionicons
                          name="time"
                          size={16}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.metricText}>
                          {t("map.number_unit_minutes", {
                            count: selectedRoute.estimated_duration_minutes,
                          })}
                        </Text>
                      </View>
                      <View style={styles.metric}>
                        <Ionicons
                          name="navigate"
                          size={16}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.metricText}>
                          {t("map.number_unit_km", {
                            count: selectedRoute.distance_kilometers,
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      )}
      <GlobalPremiumPromptModal />
    </View>
  );
};

const styles = StyleSheet.create({
  specHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  searchMode: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.backgroundSecondary,
  },
  searchInput: {
    marginLeft: 12,
    fontSize: 16,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.backgroundSecondary,
  },
  searchResultIcon: {
    width: 40,
    alignItems: "center",
  },
  searchResultContent: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  noResults: {
    padding: 32,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
  },
  recentHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    marginTop: 20,
  },
  locationInputs: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    overflow: "hidden",
  },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.backgroundSecondary,
  },
  activeLocationInput: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  locationInputIcon: {
    width: 24,
    alignItems: "center",
  },
  locationInputContent: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  locationPlaceholder: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: theme.colors.secondary,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dangerWarningBanner: {
    flexDirection: "row",
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    zIndex: 100000,
    elevation: 20,
  },
  dangerWarningContent: {
    flex: 1,
    marginLeft: 12,
  },
  dangerWarningTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.accent,
    marginBottom: 4,
  },
  dangerWarningText: {
    fontSize: 16,
    color: theme.colors.accent,
    lineHeight: 20,
  },
  routesSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  routeCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedRouteCard: {
    borderColor: theme.colors.secondary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  routeType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  safetyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  safetyScore: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: "700",
  },
  routeMetrics: {
    flexDirection: "row",
    alignItems: "center",
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  metricText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
});

export default RoutePlanningModal;
