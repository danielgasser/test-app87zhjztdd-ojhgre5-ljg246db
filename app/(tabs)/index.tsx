import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, Text, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { fetchNearbyLocations } from "src/store/locationsSlice";
import LocationDetailsModal from "src/components/LocationDetailsModal";

// Helper function to get marker color based on safety rating
const getMarkerColor = (rating: number) => {
  if (rating >= 4) return "#4CAF50"; // Green - Safe
  if (rating >= 3) return "#FFC107"; // Yellow - Mixed
  return "#F44336"; // Red - Unsafe
};

export default function MapScreen() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);

  const dispatch = useAppDispatch();
  const { nearbyLocations } = useAppSelector((state) => state.locations);

  const [mapReady, setMapReady] = useState(false); // Add this line

  useEffect(() => {
    // Force re-render when locations change
    // This fixes the marker rendering issue
  }, [nearbyLocations]);

  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.05, // Increased from 0.0222
    longitudeDelta: 0.05, // Increased from 0.0121
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
  }, []);
  const handleMarkerPress = (locationId: string) => {
    setSelectedLocationId(locationId);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedLocationId(null);
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
      <MapView
        key={nearbyLocations.length}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        onMapReady={() => setMapReady(true)} // Added this
      >
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
      </MapView>

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
});
