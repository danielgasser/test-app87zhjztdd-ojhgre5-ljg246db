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
import {
  fetchNearbyLocations,
  fetchLocationDetails,
  createLocationFromSearch,
  clearSearchResults,
  setUserLocation,
} from "src/store/locationsSlice";
import LocationDetailsModal from "src/components/LocationDetailsModal";
import SearchBar from "src/components/SearchBar";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { LocationWithScores } from "@/types/supabase";

const getMarkerColor = (rating: number | string | null) => {
  const numRating = Number(rating) || 0;
  console.log("🎨 Marker color for rating:", numRating);

  if (numRating >= 4) return "#4CAF50";
  if (numRating >= 3) return "#FFC107";
  return "#F44336";
};

interface SearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  source?: "database" | "mapbox";
}

export default function MapScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMarker, setSearchMarker] = useState<SearchResult | null>(null);

  const dispatch = useAppDispatch();
  const { nearbyLocations, userLocation } = useAppSelector(
    (state) => state.locations
  );
  const user = useAppSelector((state) => state.auth.user);
  const [mapReady, setMapReady] = useState(false);

  const [region, setRegion] = useState(() => {
    // Initialize from Redux location if available
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    // Fallback to dev location env vars
    return {
      latitude: parseFloat(process.env.EXPO_PUBLIC_DEV_LATITUDE || "40.7128"),
      longitude: parseFloat(
        process.env.EXPO_PUBLIC_DEV_LONGITUDE || "-74.0060"
      ),
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  });

  useEffect(() => {
    // Don't re-run location detection if we already have a user location
    if (userLocation) {
      console.log(
        "🚧 User location already exists in Redux, skipping detection"
      );
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const useDevLocation =
          process.env.EXPO_PUBLIC_USE_DEV_LOCATION === "true";

        if (useDevLocation && __DEV__) {
          const devLat = parseFloat(
            process.env.EXPO_PUBLIC_DEV_LATITUDE || "40.7128"
          );
          const devLng = parseFloat(
            process.env.EXPO_PUBLIC_DEV_LONGITUDE || "-74.0060"
          );

          console.log("🚧 Using development location:", devLat, devLng);

          // Store in Redux instead of local state
          dispatch(setUserLocation({ latitude: devLat, longitude: devLng }));

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

        // Production location code...
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          setLoading(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});

        // Store in Redux instead of local state
        dispatch(
          setUserLocation({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          })
        );

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

  useFocusEffect(
    useCallback(() => {
      // When screen comes back into focus (returning from review), refetch nearby locations
      if (userLocation) {
        console.log("🔄 Screen focused - refetching nearby locations");
        dispatch(
          fetchNearbyLocations({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            radius: 5000,
          })
        ).then((result) => {
          console.log(
            "📍 Nearby locations result:",
            result.payload?.length || 0,
            "locations found"
          );
        });
      }
    }, [userLocation, dispatch])
  );
  useEffect(() => {
    // Sync region with Redux user location when it changes
    if (userLocation) {
      console.log("📍 Syncing region with Redux location:", userLocation);
      setRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [userLocation]);
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

    const source = selectedLocation.source || "database";

    if (source === "database") {
      try {
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

    dispatch(clearSearchResults());
  };

  const handleSearchToggle = (isVisible: boolean) => {
    setShowSearch(isVisible);
    if (!isVisible) {
      dispatch(clearSearchResults());
    }
  };

  const extractCity = (address: string) => {
    const parts = address.split(", ");
    return parts[1] || "Unknown";
  };

  const extractStateProvince = (address: string) => {
    const parts = address.split(", ");
    return parts[2] || "Unknown";
  };

  const handleAddLocation = async () => {
    if (!searchMarker) return;

    const source = searchMarker.source || "database";

    try {
      if (source === "database") {
        // Existing location - navigate normally
        setSelectedLocationId(searchMarker.id);
        setModalVisible(true);
        setSearchMarker(null);
        return;
      }

      // For NEW locations - don't create yet, just pass the data
      console.log("Passing location data to review screen for creation...");

      // Update user location for map centering
      dispatch(
        setUserLocation({
          latitude: searchMarker.latitude,
          longitude: searchMarker.longitude,
        })
      );

      // Navigate to review with location data (not ID)
      router.push({
        pathname: "/review",
        params: {
          // Pass the raw location data instead of locationId
          locationData: JSON.stringify({
            name: searchMarker.name,
            address: searchMarker.address,
            latitude: searchMarker.latitude,
            longitude: searchMarker.longitude,
            place_type: searchMarker.place_type || "address",
          }),
          locationName: searchMarker.name,
          isNewLocation: "true", // Flag to indicate this needs to be created
        },
      });

      setSearchMarker(null);
    } catch (error) {
      console.error("Error preparing location:", error);
      Alert.alert("Error", "Failed to prepare location. Please try again.");
    }
  };

  const handleMapPress = () => {
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
  console.log("🗺️ Current region:", region);
  console.log("🗺️ Redux userLocation:", userLocation);
  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <SearchBar
        onLocationSelect={handleLocationSelect}
        onSearchToggle={handleSearchToggle}
        userLocation={
          userLocation
            ? {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
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
            pinColor="#2196F3"
          />
        )}
      </MapView>

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
