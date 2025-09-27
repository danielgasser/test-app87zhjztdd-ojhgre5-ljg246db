// Replace your existing RoutePlanningModal.tsx with this simplified version
// src/components/RoutePlanningModal.tsx

import React, { useState, useEffect } from "react";
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
  RouteCoordinate,
  RouteRequest,
  SafeRoute,
} from "src/store/locationsSlice";
import { APP_CONFIG } from "@/utils/appConfig";

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
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

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
      setSearchResults([]);
    }
  }, [visible]);

  // Mock search function (replace with your existing SearchBar logic)
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);

    try {
      // TODO: Replace with your existing search logic from SearchBar
      // For now, mock some results
      const mockResults: LocationResult[] = [
        {
          id: "search_1",
          name: "San Francisco Airport",
          address: "San Francisco, CA 94128, USA",
          latitude: 37.6213,
          longitude: -122.379,
          place_type: "airport",
          source: "mapbox" as "mapbox",
        },
        {
          id: "search_2",
          name: "Golden Gate Bridge",
          address: "Golden Gate Bridge, San Francisco, CA, USA",
          latitude: 37.8199,
          longitude: -122.4783,
          place_type: "landmark",
          source: "mapbox" as "mapbox",
        },
      ].filter(
        (result) =>
          result.name.toLowerCase().includes(query.toLowerCase()) ||
          result.address.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(mockResults);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (activeInput && searchQuery) {
        performSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, activeInput]);

  // Handle location selection
  const handleLocationSelect = (location: LocationResult) => {
    if (activeInput === "from") {
      setFromLocation(location);
    } else if (activeInput === "to") {
      setToLocation(location);
    }

    setActiveInput(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Handle input focus
  const handleInputFocus = (inputType: "from" | "to") => {
    setActiveInput(inputType);
    setSearchQuery("");
    setSearchResults([]);
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

  // Render search result item
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

  // Render route card (keep your existing implementation)
  const renderRouteCard = (route: SafeRoute, isSelected: boolean = false) => {
    const safety = route.safety_analysis;
    const safetyColor = getSafetyColor(safety.overall_route_score);
    const safetyLabel = getSafetyLabel(safety.overall_route_score);

    return (
      <TouchableOpacity
        key={route.id}
        style={[styles.routeCard, isSelected && styles.selectedRouteCard]}
        onPress={() => handleSelectRoute(route)}
      >
        {/* Route Header */}
        <View style={styles.routeHeader}>
          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{route.name}</Text>
            <Text style={styles.routeType}>
              {route.route_type.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.safetyBadge, { backgroundColor: safetyColor }]}>
            <Text style={styles.safetyScore}>
              {safety.overall_route_score.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Route Metrics */}
        <View style={styles.routeMetrics}>
          <View style={styles.metric}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.metricText}>
              {route.estimated_duration_minutes} min
            </Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="speedometer-outline" size={16} color="#666" />
            <Text style={styles.metricText}>
              {(safety.total_distance_meters / 1000).toFixed(1)} km
            </Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="shield-outline" size={16} color={safetyColor} />
            <Text style={[styles.metricText, { color: safetyColor }]}>
              {safetyLabel}
            </Text>
          </View>
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.selectedText}>Selected Route</Text>
          </View>
        )}
      </TouchableOpacity>
    );
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
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Plan Route</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Mode */}
        {activeInput ? (
          <View style={styles.searchMode}>
            {/* Search Input */}
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

            {/* Search Results */}
            <FlatList
              style={styles.searchResults}
              data={searchResults}
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

            {/* Safety Preferences (keep your existing implementation) */}
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
                routeLoading && styles.disabledButton,
              ]}
              onPress={handleGenerateRoute}
              disabled={routeLoading || !fromLocation || !toLocation}
            >
              {routeLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="navigate" size={20} color="#FFF" />
                  <Text style={styles.generateButtonText}>
                    Generate Safe Route
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Error Display */}
            {routeError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#F44336" />
                <Text style={styles.errorText}>{routeError}</Text>
              </View>
            )}

            {/* Primary Route */}
            {selectedRoute && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommended Route</Text>
                {renderRouteCard(selectedRoute, true)}
              </View>
            )}

            {/* Alternative Routes */}
            {routeAlternatives.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Alternative Routes</Text>
                {routeAlternatives.map((route) => renderRouteCard(route))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

// Helper functions (keep your existing ones)
const getSafetyColor = (score: number): string => {
  if (score >= APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD) {
    return APP_CONFIG.ROUTE_DISPLAY.COLORS.SAFE_ROUTE;
  } else if (score >= APP_CONFIG.ROUTE_PLANNING.MIXED_ROUTE_THRESHOLD) {
    return APP_CONFIG.ROUTE_DISPLAY.COLORS.MIXED_ROUTE;
  } else {
    return APP_CONFIG.ROUTE_DISPLAY.COLORS.UNSAFE_ROUTE;
  }
};

const getSafetyLabel = (score: number): string => {
  if (score >= APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD) {
    return "Safe";
  } else if (score >= APP_CONFIG.ROUTE_PLANNING.MIXED_ROUTE_THRESHOLD) {
    return "Mixed";
  } else {
    return "Caution";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#000",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },

  // Search Mode
  searchMode: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: "#000",
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

  // Location Inputs
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
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

  // Keep all your existing styles for route cards, buttons, etc.
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

  // Route Card styles (keep your existing ones)
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
