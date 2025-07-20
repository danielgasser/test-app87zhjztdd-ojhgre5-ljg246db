import React, { useState } from "react";
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

interface SearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
}

interface SearchBarProps {
  onLocationSelect: (location: SearchResult) => void;
  onSearchToggle?: (isVisible: boolean) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onLocationSelect,
  onSearchToggle,
}) => {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      // Using Mapbox Geocoding API (free tier - 100K requests/month)
      // Replace 'YOUR_MAPBOX_TOKEN' with your actual token
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=YOUR_MAPBOX_TOKEN&types=poi,address&limit=5&country=us,ca`
      );

      const data = await response.json();

      if (data.features) {
        const results: SearchResult[] = data.features.map((feature: any) => ({
          id: feature.id,
          name: feature.text || feature.place_name,
          address: feature.place_name,
          latitude: feature.center[1],
          longitude: feature.center[0],
          place_type: feature.place_type?.[0] || "location",
        }));

        setSearchResults(results);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Search error:", error);
      // Fallback to manual address entry for now
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (location: SearchResult) => {
    setSearchText(location.name);
    setShowResults(false);
    onLocationSelect(location);
    onSearchToggle?.(false);
  };

  const handleClear = () => {
    setSearchText("");
    setSearchResults([]);
    setShowResults(false);
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectLocation(item)}
    >
      <View style={styles.resultIconContainer}>
        <Ionicons name="location-outline" size={20} color="#666" />
      </View>
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultAddress}>{item.address}</Text>
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
              searchLocations(text);
            }}
            onFocus={() => onSearchToggle?.(true)}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {(searchText.length > 0 || loading) && (
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              {loading ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <Ionicons name="close-circle" size={20} color="#666" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showResults && searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
          />
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
});

export default SearchBar;
