import React, { useState, useCallback, useEffect } from "react";
import { theme } from "src/styles/theme";
import { TouchableWithoutFeedback, Keyboard } from "react-native";

import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Text,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import {
  addToSearchHistory,
  fetchSearchHistory,
  searchLocations,
} from "src/store/locationsSlice";
import { googlePlacesService } from "@/services/googlePlaces";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { APP_CONFIG } from "@/config/appConfig";
import { useAuth } from "@/providers/AuthProvider";
import { store } from "@/store";
import {
  canSearch,
  incrementSearchCount,
  DAILY_LIMIT,
} from "@/utils/searchLimitService";
import { SubscriptionTier } from "@/config/features";
import { router } from "expo-router";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

// NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API

interface SearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  source?: "database" | "mapbox";
}

interface SearchBarProps {
  onLocationSelect: (location: SearchResult) => void;
  onSearchToggle?: (isVisible: boolean) => void;
  userLocation?: { latitude: number; longitude: number };
}

const SearchBar: React.FC<SearchBarProps> = ({
  onLocationSelect,
  onSearchToggle,
  userLocation,
}) => {
  const dispatch = useAppDispatch();
  const { searchResults, searchLoading, userCountry } = useAppSelector(
    (state) => state.locations
  );
  // NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API

  const [searchText, setSearchText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [mapboxResults, setMapboxResults] = useState<SearchResult[]>([]);
  const searchRadiusKm = useAppSelector((state) => state.user.searchRadiusKm);
  const { user } = useAuth();
  const userId = user?.id;
  const userProfile = useAppSelector((state: any) => state.user.profile);
  const userTier = (userProfile?.subscription_tier ||
    "free") as SubscriptionTier;
  const searchHistory = useAppSelector(
    (state) => state.locations.searchHistory
  );
  const { hasAccess: hasSearchHistoryAccess } =
    useFeatureAccess("searchHistory");

  useEffect(() => {
    if (userId && hasSearchHistoryAccess) {
      dispatch(fetchSearchHistory({ userId, context: "map", limit: 10 }));
    }
  }, [userId, hasSearchHistoryAccess, dispatch]);

  const searchGoogle = async (query: string): Promise<SearchResult[]> => {
    try {
      const country = userCountry || "us";

      const autocompleteParams: any = {
        query,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
      };

      if (searchRadiusKm < 999999) {
        autocompleteParams.radius = searchRadiusKm * 1000;
        autocompleteParams.components = `country:${country}`;
      } else if (!searchRadiusKm) {
        autocompleteParams.radius =
          APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS; // fallback
      }

      const results = await googlePlacesService.autocomplete(
        autocompleteParams
      );

      return results.slice(0, 5).map((result) => ({
        id: `google_${result.place_id}`,
        name: result.description.split(",")[0], // "Hauptstrasse 67"
        address: result.description.split(",").slice(1).join(",").trim(), // "8272 Ermatingen, Switzerland"
        latitude: 0, // Will be fetched when user selects
        longitude: 0, // Will be fetched when user selects
        place_type: result.types[0] || "location",
        source: "mapbox" as const, // NOTE: Legacy naming, actually Google Places
      }));
    } catch (error) {
      logger.error("Google Places search error:", error);
      return [];
    }
  };

  const performSearch = useCallback(
    async (query: string) => {
      if (query.length < 3) {
        setMapboxResults([]);
        setShowResults(false);
        return;
      }

      setShowResults(true);

      dispatch(
        searchLocations({
          query,
          latitude: userLocation?.latitude,
          longitude: userLocation?.longitude,
        })
      );
      // NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API

      const mapboxResults = await searchGoogle(query);
      setMapboxResults(mapboxResults);
    },
    [dispatch, userLocation, userTier]
  );

  const handleSelectLocation = async (location: SearchResult) => {
    // Check search limit for free users
    const allowed = await canSearch(userTier);
    if (!allowed) {
      notify.confirm(
        "Search Limit Reached",
        `You've used all ${DAILY_LIMIT} free searches today. Upgrade to Premium for unlimited searches.`,
        [
          { text: "Maybe Later", style: "cancel", onPress: () => {} },
          { text: "Upgrade", onPress: () => router.push("/subscription") },
        ]
      );
      return;
    }
    Keyboard.dismiss();
    setSearchText(location.name);
    setShowResults(false);
    await incrementSearchCount();
    // GUARD: Wait for profile to be ready
    if (!userProfile && userId) {
      notify.info("Loading profile...");
      // Give it 2 seconds to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check again
      const state = store.getState();
      if (!state.user.profile) {
        notify.error("Profile not loaded. Please try again.");
        return;
      }
    }
    // If location already has coordinates (database result), use it directly
    if (location.latitude !== 0 && location.longitude !== 0) {
      onLocationSelect(location);
      if (userId) {
        dispatch(
          addToSearchHistory({
            userId,
            query: searchText,
            selectedPlaceId: location.id.startsWith("google_")
              ? location.id.replace("google_", "")
              : undefined,
            selectedLocationId:
              location.source === "database" ? location.id : undefined,
            selectedName: location.name,
            selectedLatitude: location.latitude,
            selectedLongitude: location.longitude,
            searchContext: "map",
          })
        );
      }
      onSearchToggle?.(false);
      return;
    }

    // Google Places result - fetch full details
    try {
      const details = await googlePlacesService.getDetails({
        place_id: location.id.replace("google_", ""),
        fields: ["place_id", "name", "formatted_address", "geometry", "types"],
      });

      if (details) {
        const completeLocation: SearchResult = {
          id: details.place_id,
          name: details.name,
          address: details.formatted_address,
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
          place_type: details.types[0] || "location",
          source: "mapbox" as const,
        };

        onLocationSelect(completeLocation);

        if (userId) {
          dispatch(
            addToSearchHistory({
              userId,
              query: searchText,
              selectedPlaceId: details.place_id,
              selectedName: details.name,
              selectedLatitude: details.geometry.location.lat,
              selectedLongitude: details.geometry.location.lng,
              searchContext: "map",
            })
          );
        }
        onSearchToggle?.(false);
      } else {
        notify.error("Unable to get location details. Please try again.");
      }
    } catch (error) {
      logger.error("Error fetching place details:", error);
      notify.error("Unable to get location details. Please try again.");
    }
  };

  const handleClear = () => {
    setSearchText("");
    setMapboxResults([]);
    setShowResults(false);
  };

  // NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API
  // Combine results: database results first, then Mapbox results
  // Ensure all results have a source property
  const dbResultsWithSource = searchResults.map((result) => ({
    ...result,
    source: (result.source || "database") as "database" | "mapbox",
  }));

  const mapboxResultsWithSource = mapboxResults.map((result) => ({
    ...result,
    source: (result.source || "mapbox") as "database" | "mapbox",
  }));

  const allResults = [...dbResultsWithSource, ...mapboxResultsWithSource];

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectLocation(item)}
    >
      <View style={styles.resultIconContainer}>
        <Ionicons
          name={item.source === "database" ? "storefront" : "location-outline"}
          size={20}
          color={
            item.source === "database"
              ? theme.colors.secondary
              : theme.colors.textSecondary
          }
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
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for places..."
              value={searchText}
              onChangeText={(text) => {
                setSearchText(text);
                performSearch(text);
              }}
              onFocus={() => {
                setShowResults(true);
                onSearchToggle?.(true);
              }}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => performSearch(searchText)}
            />
            {(searchText.length > 0 || searchLoading) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClear}
              >
                {searchLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textSecondary}
                  />
                ) : (
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* Recent Searches (Premium) */}
        {showResults &&
          searchText.length === 0 &&
          hasSearchHistoryAccess &&
          searchHistory.length > 0 && (
            <View style={styles.resultsContainer}>
              <View style={styles.recentHeader}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.recentHeaderText}>Recent Searches</Text>
              </View>
              <FlatList
                data={searchHistory}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => {
                      if (item.selected_latitude && item.selected_longitude) {
                        onLocationSelect({
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
                        });
                        setShowResults(false);
                        onSearchToggle?.(false);
                      } else {
                        setSearchText(item.query);
                        performSearch(item.query);
                      }
                    }}
                  >
                    <View style={styles.resultIconContainer}>
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </View>
                    <View style={styles.resultTextContainer}>
                      <Text style={styles.resultName}>
                        {item.selected_name || item.query}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                style={styles.resultsList}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}
        {showResults && allResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={allResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              style={styles.resultsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {showResults &&
          searchText.length >= 3 &&
          allResults.length === 0 &&
          !searchLoading && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                No places found for "{searchText}"
              </Text>
              <Text style={styles.noResultsSubtext}>
                Try a different search term
              </Text>
            </View>
          )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
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
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 10,
  },
  searchContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    shadowColor: theme.colors.overlay,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  clearButton: {
    marginLeft: 8,
  },
  resultsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 300,
    shadowColor: theme.colors.overlay,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  resultsList: {
    borderRadius: 12,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
    color: theme.colors.text,
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  hasReviewsText: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontWeight: "500",
    marginTop: 2,
  },
  noResultsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginTop: 4,
    padding: theme.spacing.lg,
    alignItems: "center",
    shadowColor: theme.colors.overlay,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  noResultsText: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});

export default SearchBar;
