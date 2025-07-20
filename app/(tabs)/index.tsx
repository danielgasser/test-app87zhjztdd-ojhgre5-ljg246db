// Replace the content of app/(tabs)/index.tsx with this updated version:

import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import {
  fetchNearbyLocations,
  searchLocations,
  createLocationFromSearch,
  clearSearchResults,
  setShowSearchResults,
} from "src/store/locationsSlice";
import LocationDetailsModal from "src/components/LocationDetailsModal";
import SearchBar from "src/components/SearchBar";

// Helper function to get marker color based on safety rating
const getMarkerColor = (rating: number) => {
  if (rating >= 4) return "#4CAF50"; // Green - Safe
  if (rating >= 3) return "#FFC107"; // Yellow - Mixed
  return "#F44336"; // Red - Unsafe
};

interface SearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
}

export default function MapScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMarker, setSearchMarker] = useState<SearchResult | null>(null);

  const dispatch = useAppDispatch();
  const { nearbyLocations, searchResults, searchLoading, showSearchResults } =
    useAppSelector((state) => state.locations);
  const [mapReady, setMapReady] = useState(false);

  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          setLoading(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);

        // Fetch real locations from database
        dispatch(
          fetchNearbyLocations({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            radius: 5000,
          })
        );

        setRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setLoading(false);
      } catch (error) {
        setErrorMsg("Error getting location");
        setLoading(false);
        console.error(error);
      }
    })();
  }, [dispatch]);

  const handleMarkerPress = (locationId: string) => {
    setSelectedLocationId(locationId);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedLocationId(null);
  };

  const handleLocationSelect = async (selectedLocation: SearchResult) => {
    // Center map on selected location
    setRegion({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    // Show search result as a temporary marker
    setSearchMarker(selectedLocation);

    // Clear search results
    dispatch(clearSearchResults());
    dispatch(setShowSearchResults(false));
  };

  const handleSearchToggle = (isVisible: boolean) => {
    setShowSearch(isVisible);
    if (!isVisible) {
      dispatch(clearSearchResults());
    }
  };

  const handleAddLocation = async () => {
    if (!searchMarker) return;

    try {
      const locationId = await dispatch(
        createLocationFromSearch(searchMarker)
      ).unwrap();

      // Navigate to review screen for the new location
      router.push({
        pathname: "/review",
        params: {
          locationId: locationId,
          locationName: searchMarker.name,
        },
      });

      setSearchMarker(null);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add location");
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <SearchBar
        onLocationSelect={handleLocationSelect}
        onSearchToggle={handleSearchToggle}
      />

      <MapView
        key={nearbyLocations.length}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        onMapReady={() => setMapReady(true)}
        onPress={() => {
          // Clear search marker when tapping on map
          setSearchMarker(null);
          if (showSearch) {
            handleSearchToggle(false);
          }
        }}
      >
        {/* Existing location markers */}
        {mapReady &&
          nearbyLocations &&
          nearbyLocations.length > 0 &&
          nearbyLocations.map((loc) => (
            <Marker
              key={loc.id}
              coordinate={{
                latitude: Number(loc.latitude),
                longitude: Number(loc.longitude),
              }}
              title={loc.name}
              description={`Safety: ${
                loc.avg_safety_score?.toFixed(1) || "N/A"
              }/5`}
              pinColor={getMarkerColor(loc.avg_safety_score || 0)}
              onPress={() => handleMarkerPress(loc.id)}
            />
          ))}

        {/* Search result marker */}
        {searchMarker && (
          <Marker
            coordinate={{
              latitude: searchMarker.latitude,
              longitude: searchMarker.longitude,
            }}
            title={searchMarker.name}
            description="Tap + to add this location"
            pinColor="#2196F3" // Blue for search results
          />
        )}
      </MapView>

      {/* Add Location Button (appears when search marker is shown) */}
      {searchMarker && (
        <View style={styles.addLocationContainer}>
          <TouchableOpacity
            style={styles.addLocationButton}
            onPress={handleAddLocation}
          >
            <Ionicons name="add-circle" size={24} color="#FFF" />
            <Text style={styles.addLocationText}>Add & Review Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Location Details Modal */}
      <LocationDetailsModal
        visible={modalVisible}
        locationId={selectedLocationId}
        onClose={handleModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  map: {
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#ff3b30",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  addLocationContainer: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  addLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addLocationText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
