// Create/Replace src/components/SearchBar.tsx

import React, { useState, useCallback } from "react";
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

interface SearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  source?: "database" | "mapbox"; // Make optional to match Redux interface
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
  const { searchResults, searchLoading } = useAppSelector(
    (state) => state.locations
  );

  const [searchText, setSearchText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [mapboxResults, setMapboxResults] = useState<SearchResult[]>([]);

  const searchMapbox = async (query: string): Promise<SearchResult[]> => {
    const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

    if (!mapboxToken) {
      console.warn("Mapbox token not found - using database search only");
      return [];
    }

    try {
      // Build Mapbox URL with proximity bias if user location available
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

  const performSearch = useCallback(
    async (query: string) => {
      if (query.length < 3) {
        setMapboxResults([]);
        setShowResults(false);
        return;
      }

      setShowResults(true);

      // Search our database first
      dispatch(
        searchLocations({
          query,
          userLocation: userLocation
            ? { lat: userLocation.latitude, lng: userLocation.longitude }
            : undefined,
        })
      );

      // Also search Mapbox
      const mapboxResults = await searchMapbox(query);
      setMapboxResults(mapboxResults);
    },
    [dispatch, userLocation]
  );

  const handleSelectLocation = (location: SearchResult) => {
    setSearchText(location.name);
    setShowResults(false);
    onLocationSelect(location);
    onSearchToggle?.(false);
  };

  const handleClear = () => {
    setSearchText("");
    setMapboxResults([]);
    setShowResults(false);
  };

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
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#666"
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
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              {searchLoading ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <Ionicons name="close-circle" size={20} color="#666" />
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
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50, // Adjust based on your safe area
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  searchContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    shadowColor: "#000",
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
    color: "#333",
  },
  clearButton: {
    marginLeft: 8,
  },
  resultsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 300,
    shadowColor: "#000",
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
    color: "#333",
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 14,
    color: "#666",
  },
  hasReviewsText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    marginTop: 2,
  },
  noResultsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginTop: 4,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  noResultsText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: "#666",
  },
});

export default SearchBar;
