// Enhanced Route Planning Modal with Search Integration
// src/components/RoutePlanning/ImprovedRoutePlanningModal.tsx

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
import { APP_CONFIG } from "@/utils/appConfig";

interface RouteLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  source: "database" | "mapbox" | "current_location";
}

interface ImprovedRoutePlanningModalProps {
  visible: boolean;
  onClose: () => void;
}

const ImprovedRoutePlanningModal: React.FC<ImprovedRoutePlanningModalProps> = ({
  visible,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { userLocation } = useAppSelector((state) => state.locations);
  const currentUser = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.user.profile);

  // Route planning state
  const [fromLocation, setFromLocation] = useState<RouteLocation | null>(null);
  const [toLocation, setToLocation] = useState<RouteLocation | null>(null);
  const [activeInput, setActiveInput] = useState<"from" | "to" | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RouteLocation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RouteLocation[]>([]);

  // Route preferences
  const [routePreferences, setRoutePreferences] = useState({
    safetyPriority: "balanced" as
      | "speed_focused"
      | "balanced"
      | "safety_focused",
    avoidEveningDanger: true,
    maxDetourMinutes: 15,
  });

  // Initialize with current location as "from"
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

  // Mock search function (you'll replace this with actual Mapbox search)
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);

    try {
      // TODO: Replace with actual Mapbox Geocoding API call
      const mockResults: RouteLocation[] = [
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
        {
          id: "search_3",
          name: "Union Square",
          address: "Union Square, San Francisco, CA, USA",
          latitude: 37.7879,
          longitude: -122.4075,
          place_type: "plaza",
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
  const handleLocationSelect = (location: RouteLocation) => {
    if (activeInput === "from") {
      setFromLocation(location);
    } else if (activeInput === "to") {
      setToLocation(location);
    }

    // Add to recent searches
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.id !== location.id);
      return [location, ...filtered].slice(0, 5);
    });

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

  // Swap locations
  const handleSwapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  // Start route generation
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

    // TODO: Implement actual route generation
    console.log(
      "🚀 Generating route from",
      fromLocation.name,
      "to",
      toLocation.name
    );
    Alert.alert(
      "Route Generation",
      "This will integrate with Mapbox API and our safety scoring system"
    );
  };

  // Render location input
  const renderLocationInput = (
    type: "from" | "to",
    location: RouteLocation | null,
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
      {location && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() =>
            type === "from" ? setFromLocation(null) : setToLocation(null)
          }
        >
          <Ionicons name="close-circle" size={20} color="#999" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // Render search result item
  const renderSearchResult = ({ item }: { item: RouteLocation }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleLocationSelect(item)}
    >
      <View style={styles.searchResultIcon}>
        <Ionicons
          name={getLocationIcon(item.place_type)}
          size={20}
          color="#666"
        />
      </View>
      <View style={styles.searchResultContent}>
        <Text style={styles.searchResultName}>{item.name}</Text>
        <Text style={styles.searchResultAddress}>{item.address}</Text>
      </View>
      <Ionicons name="arrow-back" size={16} color="#999" />
    </TouchableOpacity>
  );

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
          <Text style={styles.title}>Plan Your Route</Text>
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
                onSubmitEditing={() => performSearch(searchQuery)}
              />
              {searchLoading && (
                <ActivityIndicator size="small" color="#8E24AA" />
              )}
            </View>

            {/* Search Results */}
            <ScrollView style={styles.searchResults}>
              {searchQuery.length > 0 ? (
                searchResults.length > 0 ? (
                  <FlatList
                    data={searchResults}
                    renderItem={renderSearchResult}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                ) : (
                  !searchLoading && (
                    <View style={styles.noResults}>
                      <Text style={styles.noResultsText}>No results found</Text>
                    </View>
                  )
                )
              ) : (
                /* Recent Searches */
                recentSearches.length > 0 && (
                  <View>
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    <FlatList
                      data={recentSearches}
                      renderItem={renderSearchResult}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                    />
                  </View>
                )
              )}

              {/* Quick Options */}
              {searchQuery.length === 0 && (
                <View style={styles.quickOptions}>
                  <Text style={styles.sectionTitle}>Quick Options</Text>
                  <TouchableOpacity
                    style={styles.quickOption}
                    onPress={() =>
                      handleLocationSelect({
                        id: "current_location",
                        name: "Current Location",
                        address: "Your current location",
                        latitude: userLocation?.latitude || 0,
                        longitude: userLocation?.longitude || 0,
                        source: "current_location",
                      })
                    }
                  >
                    <Ionicons name="locate" size={20} color="#4CAF50" />
                    <Text style={styles.quickOptionText}>
                      Use Current Location
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        ) : (
          /* Route Planning Mode */
          <ScrollView style={styles.content}>
            {/* Location Inputs */}
            <View style={styles.locationInputs}>
              {renderLocationInput(
                "from",
                fromLocation,
                "Choose starting point"
              )}

              {/* Swap Button */}
              <View style={styles.swapButtonContainer}>
                <TouchableOpacity
                  style={styles.swapButton}
                  onPress={handleSwapLocations}
                  disabled={!fromLocation || !toLocation}
                >
                  <Ionicons name="swap-vertical" size={20} color="#8E24AA" />
                </TouchableOpacity>
              </View>

              {renderLocationInput("to", toLocation, "Choose destination")}
            </View>

            {/* Route Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Route Preferences</Text>

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
                      onPress={() =>
                        setRoutePreferences((prev) => ({
                          ...prev,
                          safetyPriority: priority,
                        }))
                      }
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
                    setRoutePreferences((prev) => ({
                      ...prev,
                      avoidEveningDanger: !prev.avoidEveningDanger,
                    }))
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
                (!fromLocation || !toLocation) && styles.disabledButton,
              ]}
              onPress={handleGenerateRoute}
              disabled={!fromLocation || !toLocation}
            >
              <Ionicons name="navigate" size={20} color="#FFF" />
              <Text style={styles.generateButtonText}>Generate Safe Route</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

// Helper function to get appropriate icon for location type
const getLocationIcon = (
  placeType?: string
): keyof typeof Ionicons.glyphMap => {
  switch (placeType) {
    case "airport":
      return "airplane";
    case "restaurant":
      return "restaurant";
    case "gas_station":
      return "car";
    case "hotel":
      return "bed";
    case "hospital":
      return "medical";
    case "school":
      return "school";
    case "landmark":
      return "flag";
    case "plaza":
      return "business";
    default:
      return "location";
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

  // Search Mode Styles
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

  // Location Input Styles
  locationInputs: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 24,
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
  clearButton: {
    padding: 4,
  },
  swapButtonContainer: {
    position: "absolute",
    right: 16,
    top: "45%",
    zIndex: 10,
  },
  swapButton: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Quick Options
  quickOptions: {
    padding: 16,
  },
  quickOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginTop: 8,
  },
  quickOptionText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#000",
  },

  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },

  // Priority Buttons
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

  // Toggle
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

  // Generate Button
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8E24AA",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
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
});

export default ImprovedRoutePlanningModal;
