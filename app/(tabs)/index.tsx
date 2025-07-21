// Replace the entire content of app/(tabs)/index.tsx

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
  fetchLocationDetails, // Make sure this is imported
  createLocationFromSearch,
  clearSearchResults,
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
  source?: "database" | "mapbox"; // Make optional to match SearchBar interface
}

export default function MapScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMarker, setSearchMarker] = useState<SearchResult | null>(null);

  const dispatch = useAppDispatch();
  const { nearbyLocations } = useAppSelector((state) => state.locations);
  const [mapReady, setMapReady] = useState(false);

  const [region, setRegion] = useState({
    latitude: 37.78825, // San Francisco
    longitude: -122.4324, // San Francisco
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    (async () => {
      try {
        // Check if we should use dev location
        const useDevLocation =
          process.env.EXPO_PUBLIC_USE_DEV_LOCATION === "true";

        if (useDevLocation && __DEV__) {
          // Use development location
          const devLat = parseFloat(
            process.env.EXPO_PUBLIC_DEV_LATITUDE || "40.7128"
          );
          const devLng = parseFloat(
            process.env.EXPO_PUBLIC_DEV_LONGITUDE || "-74.0060"
          );

          console.log("🚧 Using development location:", devLat, devLng);

          const devLocation = {
            coords: {
              latitude: devLat,
              longitude: devLng,
            },
          } as Location.LocationObject;

          setUserLocation(devLocation);

          dispatch(
            fetchNearbyLocations({
              latitude: devLat,
              longitude: devLng,
              radius: 5000,
            })
          );

          setRegion({
            latitude: devLat,
            longitude: devLng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });

          setLoading(false);
          return;
        }

        // Production: Use actual location
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          setLoading(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setUserLocation(currentLocation);

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
  }, []);

  const handleMarkerPress = (locationId: string) => {
    setSelectedLocationId(locationId);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedLocationId(null);
  };

  const handleLocationSelect = async (selectedLocation: SearchResult) => {
    console.log("Selected location:", selectedLocation);

    // Ensure we have a source property
    const source = selectedLocation.source || "database";

    // For database results, we need to fetch the actual coordinates
    if (source === "database") {
      try {
        // Fetch full location details with coordinates
        const locationWithCoords = await dispatch(
          fetchLocationDetails(selectedLocation.id)
        ).unwrap();

        if (locationWithCoords.latitude && locationWithCoords.longitude) {
          const newRegion = {
            latitude: Number(locationWithCoords.latitude),
            longitude: Number(locationWithCoords.longitude),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };

          setRegion(newRegion);

          // Update search marker with real coordinates and source
          setSearchMarker({
            ...selectedLocation,
            latitude: Number(locationWithCoords.latitude),
            longitude: Number(locationWithCoords.longitude),
            source: "database",
          });
        }
      } catch (error) {
        console.error("Error fetching location details:", error);
      }
    } else {
      // For Mapbox results, coordinates are already available
      const newRegion = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(newRegion);
      setSearchMarker({
        ...selectedLocation,
        source: "mapbox",
      });
    }

    // Clear search results
    dispatch(clearSearchResults());
  };

  const handleSearchToggle = (isVisible: boolean) => {
    setShowSearch(isVisible);
    if (!isVisible) {
      dispatch(clearSearchResults());
    }
  };

  const handleAddLocation = async () => {
    if (!searchMarker) return;

    const source = searchMarker.source || "database";

    try {
      // For database results, just navigate to the existing location
      if (source === "database") {
        setSelectedLocationId(searchMarker.id);
        setModalVisible(true);
        setSearchMarker(null);
        return;
      }

      // For Mapbox results, create new location
      const locationId = await dispatch(
        createLocationFromSearch({
          id: searchMarker.id,
          name: searchMarker.name,
          address: searchMarker.address,
          latitude: searchMarker.latitude,
          longitude: searchMarker.longitude,
          place_type: searchMarker.place_type,
        })
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
      console.error("Add location error:", error);
      Alert.alert("Error", error.message || "Failed to add location");
    }
  };

  const handleMapPress = () => {
    // Clear search marker when tapping on map
    setSearchMarker(null);
    if (showSearch) {
      handleSearchToggle(false);
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
        userLocation={
          userLocation
            ? {
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
              }
            : undefined
        }
      />

      <MapView
        key={`${region.latitude}-${region.longitude}`}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        onMapReady={() => {
          console.log("📍 Map is ready");
          setMapReady(true);
        }}
        onRegionChangeComplete={(newRegion) => {
          console.log("📍 Region changed:", newRegion);
        }}
      >
        {/* Existing location markers from database */}
        {mapReady &&
          nearbyLocations &&
          nearbyLocations.length > 0 &&
          nearbyLocations.map((loc) => (
            <Marker
              key={`db-${loc.id}`}
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
            key={`search-${searchMarker.id}`}
            coordinate={{
              latitude: searchMarker.latitude,
              longitude: searchMarker.longitude,
            }}
            title={searchMarker.name}
            description={
              searchMarker.source === "database"
                ? "Tap to view details"
                : "Tap + to add this location"
            }
            pinColor="#2196F3" // Blue for search results
          />
        )}
      </MapView>

      {/* Add Location Button (appears when search marker is shown) */}
      {searchMarker && (
        <View style={styles.addLocationContainer}>
          <TouchableOpacity
            style={[
              styles.addLocationButton,
              (searchMarker.source || "database") === "database" &&
                styles.viewLocationButton,
            ]}
            onPress={handleAddLocation}
          >
            <Ionicons
              name={
                (searchMarker.source || "database") === "database"
                  ? "eye"
                  : "add-circle"
              }
              size={24}
              color="#FFF"
            />
            <Text style={styles.addLocationText}>
              {(searchMarker.source || "database") === "database"
                ? "View Location"
                : "Add & Review Location"}
            </Text>
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
  viewLocationButton: {
    backgroundColor: "#2196F3",
  },
  addLocationText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
