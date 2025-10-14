import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
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
  endNavigation,
} from "../store/locationsSlice";
import RouteComparisonCard from "./RouteComparisonCard";
import { googlePlacesService } from "@/services/googlePlaces";
import NavigationMode from "./NavigationMode";
interface RoutePlanningModalProps {
  visible: boolean;
  onClose: () => void;
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
  } = useAppSelector((state) => state.locations);

  const currentUser = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.user.profile);

  // Location state
  const [fromLocation, setFromLocation] = useState<LocationResult | null>(null);
  const [toLocation, setToLocation] = useState<LocationResult | null>(null);
  // NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API

  // Search state
  const [activeInput, setActiveInput] = useState<"from" | "to" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapboxResults, setMapboxResults] = useState<LocationResult[]>([]);

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
      console.error("Google Places search error:", error);
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
  const handleStartNavigation = () => {
    if (!smartRouteComparison?.optimized_route) {
      Alert.alert("Error", "No route selected for navigation");
      return;
    }
    dispatch(setSelectedRoute(smartRouteComparison.optimized_route));

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
        Alert.alert(
          "Error",
          "Unable to get location details. Please try again."
        );
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      Alert.alert("Error", "Unable to get location details. Please try again.");
    }
  };

  // Handle selecting original route
  const handleSelectOriginalRoute = () => {
    if (smartRouteComparison?.original_route) {
      dispatch(setSelectedRoute(smartRouteComparison.original_route));
      dispatch(setSmartRouteComparison(null));
      onClose();
    }
  };

  // Handle selecting optimized route
  const handleSelectOptimizedRoute = () => {
    if (smartRouteComparison?.optimized_route) {
      dispatch(setSelectedRoute(smartRouteComparison.optimized_route));
      dispatch(setSmartRouteComparison(null));
      /*
      Alert.alert(
        "Route Selected",
        "Using safer route with danger zone avoidance."
      );
      */
      onClose();
    }
  };

  // Handle route generation
  const handleGenerateRoute = async () => {
    if (!fromLocation || !toLocation) {
      Alert.alert(
        "Missing Information",
        "Please set both origin and destination"
      );
      return;
    }

    if (!userProfile) {
      Alert.alert(
        "Profile Required",
        "Please complete your profile to get personalized safety routes"
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
        prioritize_safety: routePreferences.safetyPriority === "safety_focused",
        avoid_evening_danger: routePreferences.avoidEveningDanger,
        max_detour_minutes: routePreferences.maxDetourMinutes || 30,
      },
    };

    try {
      const result = await dispatch(generateSmartRoute(routeRequest)).unwrap();

      if (result.optimized_route && result.original_route) {
        console.log("✅ Smart route comparison available");
      } else {
        console.log("ℹ️ Original route is already optimal");
      }
    } catch (error) {
      console.error("Route generation error:", error);
      Alert.alert(
        "Route Error",
        error instanceof Error ? error.message : "Failed to generate route"
      );

      // Fallback to basic route generation
      try {
        await dispatch(generateSafeRoute(routeRequest)).unwrap();
      } catch (fallbackError) {
        Alert.alert("Unable to generate route. Please try again.");
      }
    }
  };

  // Handle safety priority change
  const handleSafetyPriorityChange = (
    priority: "speed_focused" | "balanced" | "safety_focused"
  ) => {
    dispatch(updateRoutePreferences({ safetyPriority: priority }));
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
          color={type === "from" ? "#4CAF50" : "#F44336"}
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
      <Ionicons name="search" size={20} color="#999" />
    </TouchableOpacity>
  );

  // Render search result
  const renderSearchResult = ({ item }: { item: LocationResult }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleLocationSelect(item)}
    >
      <View style={styles.searchResultIcon}>
        <Ionicons name="location" size={20} color="#666" />
      </View>
      <View style={styles.searchResultContent}>
        <Text style={styles.searchResultName}>{item.name}</Text>
        <Text style={styles.searchResultAddress}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  // Get safety badge color
  const getSafetyBadgeColor = (score: number): string => {
    if (score >= 4.0) return "#4CAF50";
    if (score >= 3.0) return "#FFC107";
    return "#F44336";
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Plan Safe Route</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Mode */}
        {activeInput ? (
          <View style={styles.searchMode}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" />
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
                <ActivityIndicator size="small" color="#8E24AA" />
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
          <ScrollView style={styles.content}>
            {/* Location Inputs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Route Details</Text>
              <View style={styles.locationInputs}>
                {renderLocationInput(
                  "from",
                  fromLocation,
                  "Choose starting point"
                )}
                {renderLocationInput("to", toLocation, "Choose destination")}
              </View>
            </View>

            {/* Safety Preferences */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Safety Preferences</Text>
              <View style={styles.priorityButtons}>
                {(["speed_focused", "balanced", "safety_focused"] as const).map(
                  (priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButton,
                        routePreferences.safetyPriority === priority &&
                          styles.activePriorityButton,
                      ]}
                      onPress={() => handleSafetyPriorityChange(priority)}
                    >
                      <Text
                        style={[
                          styles.priorityButtonText,
                          routePreferences.safetyPriority === priority &&
                            styles.activePriorityButtonText,
                        ]}
                      >
                        {priority.replace("_", " ").toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Avoid evening dangers</Text>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    routePreferences.avoidEveningDanger && styles.toggleActive,
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
                    <Ionicons name="checkmark" size={16} color="#FFF" />
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
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="navigate" size={20} color="#FFF" />
              )}
              <Text style={styles.generateButtonText}>
                {routeLoading ? "Finding safe route..." : "Generate Safe Route"}
              </Text>
            </TouchableOpacity>

            {/* Error Display */}
            {routeError && (
              <View style={styles.errorContainer}>
                <Ionicons name="warning" size={20} color="#F44336" />
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
                      <Text style={styles.routeName}>{selectedRoute.name}</Text>
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
                          selectedRoute.safety_analysis?.overall_route_score ||
                            0
                        )}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.routeMetrics}>
                    <View style={styles.metric}>
                      <Ionicons name="time" size={16} color="#666" />
                      <Text style={styles.metricText}>
                        {selectedRoute.estimated_duration_minutes} min
                      </Text>
                    </View>
                    <View style={styles.metric}>
                      <Ionicons name="navigate" size={16} color="#666" />
                      <Text style={styles.metricText}>
                        {selectedRoute.distance_kilometers} km
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
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
    color: "#000",
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
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
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
    borderBottomColor: "#F0F0F0",
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
    color: "#000",
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: 14,
    color: "#666",
  },
  noResults: {
    padding: 32,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: "#666",
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
    color: "#000",
    marginBottom: 16,
  },
  locationInputs: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  activeLocationInput: {
    backgroundColor: "#F8F9FA",
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
    color: "#000",
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: "#666",
  },
  locationPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  priorityButtons: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  activePriorityButton: {
    backgroundColor: "#8E24AA",
  },
  priorityButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  activePriorityButtonText: {
    color: "#FFF",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: "#000",
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: "#4CAF50",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8E24AA",
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
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#F44336",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  routesSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  routeCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedRouteCard: {
    borderColor: "#4CAF50",
    backgroundColor: "#F8FFF8",
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
    color: "#000",
    marginBottom: 2,
  },
  routeType: {
    fontSize: 12,
    color: "#666",
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
    color: "#FFF",
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
    color: "#666",
    marginLeft: 4,
  },
});

export default RoutePlanningModal;
