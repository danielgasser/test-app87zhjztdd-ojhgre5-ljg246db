import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import {
  generateSafeRoute,
  generateSmartRoute,
  setSelectedRoute,
  updateRoutePreferences,
  searchLocations,
  RouteRequest,
  setSmartRouteComparison,
  startNavigation,
  saveRouteToDatabase,
  startNavigationSession,
  setRouteRequest,
} from "../store/locationsSlice";
import RouteComparisonCard from "./RouteComparisonCard";
import { googlePlacesService } from "@/services/googlePlaces";
import ProfileBanner from "./ProfileBanner";
import { checkProfileCompleteness } from "@/utils/profileValidation";
import { shouldShowBanner } from "@/store/profileBannerSlice";
import { theme } from "@/styles/theme";
import { APP_CONFIG } from "@/utils/appConfig";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";

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

  const currentUser = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.user.profile);

  const bannerState = useAppSelector((state) => state.profileBanner);

  // Check profile completeness for safe routing
  const profileCheck = React.useMemo(() => {
    if (!userProfile) return { canUse: true, missingFields: [] };

    const validation = checkProfileCompleteness(userProfile, "SAFE_ROUTING");
    return {
      canUse: validation.canUseFeature,
      missingFields: validation.missingFieldsForFeature,
    };
  }, [userProfile]);

  // Determine if we should show the banner
  const showProfileBanner = React.useMemo(() => {
    if (profileCheck.canUse) return false;
    return shouldShowBanner(
      bannerState,
      APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES.ROUTING_INCOMPLETE
    );
  }, [profileCheck.canUse, bannerState]);

  // Location state
  const [fromLocation, setFromLocation] = useState<LocationResult | null>(null);
  const [toLocation, setToLocation] = useState<LocationResult | null>(null);
  // NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API

  // Search state
  const [activeInput, setActiveInput] = useState<"from" | "to" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapboxResults, setMapboxResults] = useState<LocationResult[]>([]);

  const [dangerMessage, setDangerMessage] = useState<string>("");
  const [routeLoadingMessage, setRouteLoadingMessage] = useState(
    "Finding Safe Route..."
  );

  // Initialize from location with current location
  useEffect(() => {
    if (visible && userLocation && !fromLocation) {
      setFromLocation({
        id: "current_location",
        name: "Current Location",
        address: "Your current location",
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

  // Mapbox search function
  // Google Places Autocomplete search
  const searchGoogle = async (query: string): Promise<LocationResult[]> => {
    try {
      const country = userCountry || "us";

      const results = await googlePlacesService.autocomplete({
        query,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
        radius: 50000, // 50km radius for location bias
        components: `country:${country}`,
      });

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
        })
      );

      // NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API
      // Search Mapbox
      const mapboxResults = await searchGoogle(query);
      setMapboxResults(mapboxResults);
    },
    [dispatch, userLocation]
  );

  // Handle starting navigation
  const handleStartNavigation = async () => {
    console.log("🚀 handleStartNavigation CALLED");

    if (
      !smartRouteComparison?.optimized_route ||
      !selectedRoute ||
      !fromLocation ||
      !toLocation
    ) {
      notify.error("No route selected for navigation");
      return;
    }

    dispatch(
      setRouteRequest({
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
      })
    );

    const savedRoute = await dispatch(
      saveRouteToDatabase({
        route_coordinates: selectedRoute.coordinates,
        origin_name: fromLocation.name,
        destination_name: toLocation.name,
        distance_km: selectedRoute.distance_kilometers,
        duration_minutes: selectedRoute.estimated_duration_minutes,
        safety_score: selectedRoute.safety_analysis.overall_route_score,
      })
    ).unwrap();
    const optimizedRoute = {
      ...smartRouteComparison.optimized_route,
      databaseId: savedRoute.id,
    };
    dispatch(setSelectedRoute(optimizedRoute));

    if (optimizedRoute.databaseId) {
      await dispatch(startNavigationSession(savedRoute.id));
    }

    // Dispatch start navigation action
    dispatch(startNavigation());
    onClose();
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
                1
              )}/5.0).`
        );
      } else {
        setDangerMessage(""); // Clear message for safe routes
      }
    }
  }, [selectedRoute]);

  // Handle input focus
  const handleInputFocus = (inputType: "from" | "to") => {
    setActiveInput(inputType);
    setSearchQuery("");
    setMapboxResults([]);
  };

  // Handle location selection
  // Handle location selection
  const handleLocationSelect = async (location: LocationResult) => {
    // If location already has coordinates (database result), use it directly
    if (location.latitude !== 0 && location.longitude !== 0) {
      if (activeInput === "from") {
        setFromLocation(location);
      } else if (activeInput === "to") {
        setToLocation(location);
      }
      setActiveInput(null);
      setSearchQuery("");
      setMapboxResults([]);
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

        setActiveInput(null);
        setSearchQuery("");
        setMapboxResults([]);
      } else {
        notify.error("Unable to get location details. Please try again.");
      }
    } catch (error) {
      logger.error("Error fetching place details:", error);
      notify.error("Unable to get location details. Please try again.");
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

  // Handle route generation
  const handleGenerateRoute = async () => {
    if (!fromLocation || !toLocation) {
      notify.error(
        "Please set both origin and destination",
        "Missing Information"
      );
      return;
    }

    if (!userProfile) {
      notify.error(
        "Please complete your profile to get personalized safety routes",
        "Profile Required"
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

    try {
      const messages = [
        "Analyzing route segments...",
        "Checking danger zones...",
        "Finding safer alternatives...",
        "Calculating safety scores...",
        "Optimizing your route...",
      ];

      let messageIndex = 0;
      const messageInterval = setInterval(() => {
        if (messageIndex < messages.length) {
          setRouteLoadingMessage(messages[messageIndex]);
          messageIndex++;
        }
      }, 2000);
      const result = await dispatch(generateSmartRoute(routeRequest)).unwrap();

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
                1
              )}/5.0).`
        );
      }
    } catch (error) {
      logger.error("Route generation error:", error);
      notify.error(
        error instanceof Error ? error.message : "Failed to generate route",
        "Route Error"
      );

      // Fallback to basic route generation
      try {
        await dispatch(generateSafeRoute(routeRequest)).unwrap();
      } catch (fallbackError) {
        notify.error("Unable to generate route. Please try again.");
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
    placeholder: string
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
    <Modal
      visible={visible && !navigationActive}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Plan Safe Route</Text>
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
                  Route passes through danger zones
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
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={`Search for ${
                  activeInput === "from" ? "starting point" : "destination"
                }`}
                autoFocus
              />
              {searchLoading && (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              )}
            </View>

            <FlatList
              style={styles.searchResults}
              data={allResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                searchQuery.length > 0 && !searchLoading ? (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>No results found</Text>
                  </View>
                ) : null
              }
            />
          </View>
        ) : (
          /* Route Planning Mode */
          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View>
                {/* Location Inputs */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Route Details</Text>
                  <View style={styles.locationInputs}>
                    {renderLocationInput(
                      "from",
                      fromLocation,
                      "Choose starting point"
                    )}
                    {renderLocationInput(
                      "to",
                      toLocation,
                      "Choose destination"
                    )}
                  </View>
                </View>

                {/* Safety Preferences */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Safety Preferences</Text>

                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>
                      Avoid evening dangers
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
                          })
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
                      styles.disabledButton,
                  ]}
                  onPress={handleGenerateRoute}
                  disabled={routeLoading || !fromLocation || !toLocation}
                >
                  {routeLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.background}
                    />
                  ) : (
                    <Ionicons
                      name="navigate"
                      size={20}
                      color={theme.colors.background}
                    />
                  )}
                  <Text style={styles.generateButtonText}>
                    {routeLoading ? routeLoadingMessage : "Generate Safe Route"}
                  </Text>
                </TouchableOpacity>

                {/* Error Display */}
                {routeError && (
                  <View style={styles.errorContainer}>
                    <Ionicons
                      name="warning"
                      size={20}
                      color={theme.colors.error}
                    />
                    <Text style={styles.errorText}>{routeError}</Text>
                  </View>
                )}

                {/* Smart Route Comparison */}
                {showSmartRouteComparison && smartRouteComparison && (
                  <RouteComparisonCard
                    comparison={smartRouteComparison}
                    onSelectOriginal={handleSelectOriginalRoute}
                    onSelectOptimized={handleSelectOptimizedRoute}
                    onStartNavigation={handleStartNavigation}
                  />
                )}

                {/* Selected Route Display */}
                {selectedRoute && !showSmartRouteComparison && (
                  <View style={styles.routesSection}>
                    <Text style={styles.sectionTitle}>Your Route</Text>
                    <View style={[styles.routeCard, styles.selectedRouteCard]}>
                      <View style={styles.routeHeader}>
                        <View style={styles.routeInfo}>
                          <Text style={styles.routeName}>
                            {selectedRoute.name}
                          </Text>
                          <Text style={styles.routeType}>
                            {selectedRoute.route_type} route
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.safetyBadge,
                            {
                              backgroundColor: getSafetyBadgeColor(
                                selectedRoute.safety_analysis
                                  ?.overall_route_score || 0
                              ),
                            },
                          ]}
                        >
                          <Text style={styles.safetyScore}>
                            {Math.round(
                              selectedRoute.safety_analysis
                                ?.overall_route_score || 0
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
                            {selectedRoute.estimated_duration_minutes} min
                          </Text>
                        </View>
                        <View style={styles.metric}>
                          <Ionicons
                            name="navigate"
                            size={16}
                            color={theme.colors.textSecondary}
                          />
                          <Text style={styles.metricText}>
                            {selectedRoute.distance_kilometers} km
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
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
    flex: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 16,
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
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
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
