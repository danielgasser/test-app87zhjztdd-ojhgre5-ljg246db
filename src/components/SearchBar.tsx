import React, { useState, useCallback } from "react";
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { searchLocations } from "src/store/locationsSlice";
import { googlePlacesService } from "@/services/googlePlaces";

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

  const searchGoogle = async (query: string): Promise<SearchResult[]> => {
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
        name: result.description.split(",")[0], // "Hauptstrasse 67"
        address: result.description.split(",").slice(1).join(",").trim(), // "8272 Ermatingen, Switzerland"
        latitude: 0, // Will be fetched when user selects
        longitude: 0, // Will be fetched when user selects
        place_type: result.types[0] || "location",
        source: "mapbox" as const, // NOTE: Legacy naming, actually Google Places
      }));
    } catch (error) {
      console.error("Google Places search error:", error);
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
    [dispatch, userLocation]
  );

  const handleSelectLocation = async (location: SearchResult) => {
    setSearchText(location.name);
    setShowResults(false);

    // If location already has coordinates (database result), use it directly
    if (location.latitude !== 0 && location.longitude !== 0) {
      onLocationSelect(location);
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
        onSearchToggle?.(false);
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
              onFocus={() => onSearchToggle?.(true)}
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
  container: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
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
