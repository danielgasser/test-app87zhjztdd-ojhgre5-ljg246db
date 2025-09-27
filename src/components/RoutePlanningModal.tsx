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
  generateRouteAlternatives,
  setSelectedRoute,
  clearRoutes,
  updateRoutePreferences,
  searchLocations,
  RouteCoordinate,
  RouteRequest,
  SafeRoute,
} from "src/store/locationsSlice";

interface RoutePlanningModalProps {
  visible: boolean;
  onClose: () => void;
}

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
    routeAlternatives,
    routeLoading,
    routeError,
    routePreferences,
    searchResults,
    searchLoading,
  } = useAppSelector((state) => state.locations);
  const { userLocation } = useAppSelector((state) => state.locations);
  const currentUser = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.user.profile);

  // Location state
  const [fromLocation, setFromLocation] = useState<LocationResult | null>(null);
  const [toLocation, setToLocation] = useState<LocationResult | null>(null);

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

  // Mapbox search function (copied from existing SearchBar logic)
  const searchMapbox = async (query: string): Promise<LocationResult[]> => {
    const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

    if (!mapboxToken) {
      console.warn("Mapbox token not found - using database search only");
      return [];
    }

    try {
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${mapboxToken}&types=poi,address&limit=5&country=us,ca`;

      if (userLocation) {
        url += `&proximity=${userLocation.longitude},${userLocation.latitude}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.features) {
        return data.features.map((feature: any) => ({
          id: `mapbox_${feature.id}`,
          name: feature.text || feature.place_name.split(",")[0],
          address: feature.place_name,
          latitude: feature.center[1],
          longitude: feature.center[0],
          place_type: feature.place_type?.[0] || "location",
          source: "mapbox" as const,
        }));
      }

      return [];
    } catch (error) {
      console.error("Mapbox search error:", error);
      Alert.alert(
        "Search Error",
        "Unable to search locations. Please check your internet connection."
      );
      return [];
    }
  };

  // Combined search function (database + mapbox)
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
          userLocation: userLocation
            ? { lat: userLocation.latitude, lng: userLocation.longitude }
            : undefined,
        })
      );

      // Search Mapbox
      const mapboxResults = await searchMapbox(query);
      setMapboxResults(mapboxResults);
    },
    [dispatch, userLocation]
  );

  // Debounced search
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
  const handleLocationSelect = (location: LocationResult) => {
    if (activeInput === "from") {
      setFromLocation(location);
    } else if (activeInput === "to") {
      setToLocation(location);
    }

    setActiveInput(null);
    setSearchQuery("");
    setMapboxResults([]);
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
        race_ethnicity: userProfile.race_ethnicity,
        gender: userProfile.gender,
        lgbtq_status: userProfile.lgbtq_status,
        religion: userProfile.religion,
        disability_status: userProfile.disability_status,
        age_range: userProfile.age_range,
      },
      route_preferences: {
        prioritize_safety: routePreferences.safetyPriority === "safety_focused",
        avoid_evening_danger: routePreferences.avoidEveningDanger,
        max_detour_minutes: routePreferences.maxDetourMinutes,
      },
    };

    try {
      console.log("🚀 Generating safe route...");
      await dispatch(generateSafeRoute(routeRequest)).unwrap();

      // Generate alternatives after main route
      dispatch(generateRouteAlternatives(routeRequest));
    } catch (error) {
      console.error("❌ Route generation failed:", error);
      Alert.alert("Route Error", "Failed to generate route. Please try again.");
    }
  };

  // Handle route selection
  const handleSelectRoute = (route: SafeRoute) => {
    dispatch(setSelectedRoute(route));
    Alert.alert("Route Selected", `Selected: ${route.name}`);
  };

  // Handle safety priority change
  const handleSafetyPriorityChange = (
    priority: "speed_focused" | "balanced" | "safety_focused"
  ) => {
    dispatch(updateRoutePreferences({ safetyPriority: priority }));
  };

  // Close modal and clear routes
  const handleClose = () => {
    dispatch(clearRoutes());
    onClose();
  };

  // Get combined search results
  const dbResultsWithSource = searchResults.map((result) => ({
    ...result,
    source: (result.source || "database") as "database" | "mapbox",
  }));

  const mapboxResultsWithSource = mapboxResults.map((result) => ({
    ...result,
    source: (result.source || "mapbox") as "database" | "mapbox",
  }));

  const allResults = [...dbResultsWithSource, ...mapboxResultsWithSource];

  // Render location input field
  const renderLocationInput = (
    type: "from" | "to",
    location: LocationResult | null,
    placeholder: string
  ) => (
    <View style={styles.inputContainer}>
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
            <View>
              <Text style={styles.locationName}>{location.name}</Text>
              <Text style={styles.locationAddress}>{location.address}</Text>
            </View>
          ) : (
            <Text style={styles.placeholder}>{placeholder}</Text>
          )}
        </View>
        {location && (
          <TouchableOpacity
            style={styles.clearLocationButton}
            onPress={() => {
              if (type === "from") setFromLocation(null);
              else setToLocation(null);
            }}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Search input when active */}
      {activeInput === type && (
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for places..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {(searchLoading ||
            (searchQuery.length > 0 && allResults.length === 0)) && (
            <View style={styles.searchIndicator}>
              {searchLoading ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <Text style={styles.noResultsText}>No results found</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Search results */}
      {activeInput === type && allResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={allResults}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleLocationSelect(item)}
              >
                <View style={styles.resultIconContainer}>
                  <Ionicons
                    name={
                      item.source === "database"
                        ? "storefront"
                        : "location-outline"
                    }
                    size={20}
                    color={item.source === "database" ? "#4CAF50" : "#666"}
                  />
                </View>
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultAddress}>{item.address}</Text>
                  {item.source === "database" && (
                    <Text style={styles.hasReviewsText}>• Has reviews</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );

  // Get safety badge color
  const getSafetyBadgeColor = (score: number) => {
    if (score >= 7) return "#4CAF50"; // Green
    if (score >= 4) return "#FF9800"; // Orange
    return "#F44336"; // Red
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
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Plan Route</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Location Inputs */}
          <View style={styles.locationsSection}>
            <Text style={styles.sectionTitle}>Route</Text>

            {renderLocationInput("from", fromLocation, "Choose starting point")}

            <View style={styles.swapButtonContainer}>
              <TouchableOpacity
                style={styles.swapButton}
                onPress={() => {
                  const temp = fromLocation;
                  setFromLocation(toLocation);
                  setToLocation(temp);
                }}
                disabled={!fromLocation || !toLocation}
              >
                <Ionicons name="swap-vertical" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {renderLocationInput("to", toLocation, "Choose destination")}
          </View>

          {/* Safety Preferences */}
          <View style={styles.preferencesSection}>
            <Text style={styles.sectionTitle}>Safety Preferences</Text>

            {/* Priority Buttons */}
            <View style={styles.priorityButtons}>
              {[
                { key: "speed_focused", label: "Speed" },
                { key: "balanced", label: "Balanced" },
                { key: "safety_focused", label: "Safety" },
              ].map((priority) => (
                <TouchableOpacity
                  key={priority.key}
                  style={[
                    styles.priorityButton,
                    routePreferences.safetyPriority === priority.key &&
                      styles.activePriorityButton,
                  ]}
                  onPress={() =>
                    handleSafetyPriorityChange(
                      priority.key as
                        | "speed_focused"
                        | "balanced"
                        | "safety_focused"
                    )
                  }
                >
                  <Text
                    style={[
                      styles.priorityButtonText,
                      routePreferences.safetyPriority === priority.key &&
                        styles.activePriorityButtonText,
                    ]}
                  >
                    {priority.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Avoid Evening Dangers Toggle */}
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() =>
                dispatch(
                  updateRoutePreferences({
                    avoidEveningDanger: !routePreferences.avoidEveningDanger,
                  })
                )
              }
            >
              <Text style={styles.toggleLabel}>Avoid evening dangers</Text>
              <View
                style={[
                  styles.toggle,
                  routePreferences.avoidEveningDanger && styles.toggleActive,
                ]}
              >
                {routePreferences.avoidEveningDanger && (
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Generate Route Button */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              (!fromLocation || !toLocation || routeLoading) &&
                styles.disabledButton,
            ]}
            onPress={handleGenerateRoute}
            disabled={!fromLocation || !toLocation || routeLoading}
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

          {/* Route Results */}
          {selectedRoute && (
            <View style={styles.routesSection}>
              <Text style={styles.sectionTitle}>Primary Route</Text>
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
                          selectedRoute.safety_analysis?.overall_route_score ||
                            0
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.safetyScore}>
                      {Math.round(
                        selectedRoute.safety_analysis?.overall_route_score || 0
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
                    <Ionicons name="shield-checkmark" size={16} color="#666" />
                    <Text style={styles.metricText}>
                      {selectedRoute.safety_analysis?.confidence_score}%
                      confident
                    </Text>
                  </View>
                </View>
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.selectedText}>Selected Route</Text>
                </View>
              </View>
            </View>
          )}

          {/* Alternative Routes */}
          {routeAlternatives.length > 0 && (
            <View style={styles.routesSection}>
              <Text style={styles.sectionTitle}>Alternative Routes</Text>
              {routeAlternatives.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  style={styles.routeCard}
                  onPress={() => handleSelectRoute(route)}
                >
                  <View style={styles.routeHeader}>
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeName}>{route.name}</Text>
                      <Text style={styles.routeType}>
                        {route.route_type} route
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.safetyBadge,
                        {
                          backgroundColor: getSafetyBadgeColor(
                            route.safety_analysis?.overall_route_score || 0
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.safetyScore}>
                        {Math.round(
                          route.safety_analysis?.overall_route_score || 0
                        )}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.routeMetrics}>
                    <View style={styles.metric}>
                      <Ionicons name="time" size={16} color="#666" />
                      <Text style={styles.metricText}>
                        {route.estimated_duration_minutes} min
                      </Text>
                    </View>
                    <View style={styles.metric}>
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color="#666"
                      />
                      <Text style={styles.metricText}>
                        {route.safety_analysis?.confidence_score}% confident
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  locationsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeLocationInput: {
    borderColor: "#8E24AA",
  },
  locationInputIcon: {
    marginRight: 12,
  },
  locationInputContent: {
    flex: 1,
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
  placeholder: {
    fontSize: 16,
    color: "#999",
  },
  clearLocationButton: {
    marginLeft: 8,
  },
  searchInputContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginTop: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchInput: {
    fontSize: 16,
    color: "#000",
  },
  searchIndicator: {
    alignItems: "center",
    paddingVertical: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: "#666",
  },
  resultsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  resultIconContainer: {
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  hasReviewsText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
  },
  swapButtonContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  preferencesSection: {
    marginTop: 32,
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
    marginBottom: 12,
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
  selectedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  selectedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    marginLeft: 4,
  },
});

export default RoutePlanningModal;
