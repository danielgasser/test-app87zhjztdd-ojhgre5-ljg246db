// app/(tabs)/index.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// Helper function to get marker color based on safety rating
const getMarkerColor = (rating: number) => {
  if (rating >= 4) return '#4CAF50'; // Green - Safe
  if (rating >= 3) return '#FFC107'; // Yellow - Mixed
  return '#F44336'; // Red - Unsafe
};

export default function MapScreen() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mockLocations, setMockLocations] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        
        // Generate mock locations around user position
        const userLat = currentLocation.coords.latitude;
        const userLng = currentLocation.coords.longitude;
        
        setMockLocations([
          {
            id: '1',
            name: 'Safe Cafe',
            latitude: userLat + 0.002,
            longitude: userLng + 0.002,
            safetyRating: 4.5,
            reviewCount: 23,
          },
          {
            id: '2',
            name: 'Mixed Reviews Hotel',
            latitude: userLat - 0.002,
            longitude: userLng + 0.001,
            safetyRating: 2.5,
            reviewCount: 15,
          },
          {
            id: '3',
            name: 'Excellent Restaurant',
            latitude: userLat + 0.001,
            longitude: userLng - 0.002,
            safetyRating: 5,
            reviewCount: 45,
          },
        ]);
        
        setLoading(false);
      } catch (error) {
        setErrorMsg('Error getting location');
        setLoading(false);
        console.error(error);
      }
    })();
  }, []);

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
        style={styles.map}
        initialRegion={{
          latitude: location?.coords.latitude || 37.78825,
          longitude: location?.coords.longitude || -122.4324,
          latitudeDelta: 0.0222,
          longitudeDelta: 0.0121,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
      >
        {mockLocations.map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{
              latitude: loc.latitude,
              longitude: loc.longitude,
            }}
            title={loc.name}
            description={`Safety: ${loc.safetyRating}/5 (${loc.reviewCount} reviews)`}
            pinColor={getMarkerColor(loc.safetyRating)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});