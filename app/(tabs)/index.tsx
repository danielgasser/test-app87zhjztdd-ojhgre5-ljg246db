import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker, Circle, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  fetchNearbyLocations,
  fetchLocationDetails,
  setUserLocation,
  fetchHeatMapData,
  toggleHeatMap,
  fetchDangerZones,
  toggleDangerZones,
  mlPredictionsLoading,
  mlPredictions,
} from "src/store/locationsSlice";
import LocationDetailsModal from "src/components/LocationDetailsModal";
import SearchBar from "src/components/SearchBar";
import DangerZoneOverlay from "src/components/DangerZoneOverlay";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { APP_CONFIG } from "@/utils/appConfig";
import { fetchMLPredictions } from "src/store/locationsSlice";

const getMarkerColor = (rating: number | string | null) => {
  if (rating === null || rating === undefined) {
    return APP_CONFIG.MAP_MARKERS.COLOR_NO_REVIEWS;
  }
  const numRating = Number(rating) || 0;

  if (numRating >= APP_CONFIG.MAP_MARKERS.THRESHOLD_SAFE)
    return APP_CONFIG.MAP_MARKERS.COLOR_SAFE;
  if (numRating >= APP_CONFIG.MAP_MARKERS.THRESHOLD_MIXED)
    return APP_CONFIG.MAP_MARKERS.COLOR_MIXED;
  return APP_CONFIG.MAP_MARKERS.COLOR_UNSAFE;
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
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [locationPermission, setLocationPermission] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [searchMarker, setSearchMarker] = useState<SearchResult | null>(null);

  const dispatch = useAppDispatch();
  const router = useRouter();
  const mapRef = React.useRef<MapView>(null);

  // Redux selectors
  const {
    nearbyLocations,
    loading,
    error,
    userLocation,
    heatMapData,
    heatMapVisible,
    heatMapLoading,
    dangerZones,
    dangerZonesVisible,
    dangerZonesLoading,
    mlPredictions, // Add this line
    mlPredictionsLoading,
  } = useAppSelector((state) => state.locations);

  const userId = useAppSelector((state) => state.auth.user?.id);
  const userProfile = useAppSelector((state) => state.user.profile);

  // Request location permission
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to show nearby locations"
        );
        return;
      }
      setLocationPermission(true);

      let location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setRegion(newRegion);
      dispatch(
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })
      );
    })();
  }, [dispatch]);

  // Fetch danger zones when user location is available
  useEffect(() => {
    if (userId && userLocation) {
      dispatch(fetchDangerZones({ userId }));
    }
  }, [userId, userLocation, dispatch]);

  // Debug danger zones
  useEffect(() => {}, [dangerZones, dangerZonesVisible]);

  // REPLACE your existing useEffect with this:
  useEffect(() => {
    // We'll fetch predictions on-demand instead of bulk loading
  }, [nearbyLocations, userProfile, mlPredictions, dispatch]);

  // Refresh nearby locations on focus
  useFocusEffect(
    useCallback(() => {
      if (userLocation && mapReady) {
        dispatch(
          fetchNearbyLocations({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            radius: APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS,
          })
        );
      }
    }, [dispatch, userLocation, mapReady])
  );

  const getMarkerProps = (location: any) => {
    const hasReviews =
      location.demographic_safety_score || location.avg_safety_score;
    const prediction = mlPredictions[location.id];
    if (hasReviews) {
      // Location has actual reviews - use existing marker logic
      return {
        type: "reviewed",
        score: location.demographic_safety_score || location.avg_safety_score,
        color: getMarkerColor(
          location.demographic_safety_score || location.avg_safety_score
        ),
        description: `Safety: ${
          (
            location.demographic_safety_score || location.avg_safety_score
          )?.toFixed(1) || "N/A"
        }/5`,
      };
    } else if (prediction) {
      // Location has ML prediction
      return {
        type: "predicted",
        score: prediction.predicted_safety_score,
        confidence: prediction.confidence,
        color: getMarkerColor(prediction.predicted_safety_score),
        description: `Predicted: ${prediction.predicted_safety_score.toFixed(
          1
        )}/5 (${Math.round(prediction.confidence * 100)}% confident)`,
      };
    } else {
      // No data available yet
      return {
        type: "unknown",
        score: null,
        color: "#007AFF",
        description: "No data available",
      };
    }
  };

  const handleMarkerPress = async (locationId: string) => {
    setSelectedLocationId(locationId);
    setModalVisible(true);
    // Fetch location details (existing functionality)
    await dispatch(fetchLocationDetails(locationId));

    // NEW: Fetch ML prediction on-demand if needed
    const location = nearbyLocations.find((loc) => loc.id === locationId);

    if (location && userProfile) {
      const hasActualReviews =
        location.demographic_safety_score || location.avg_safety_score;
      const hasPrediction = mlPredictions[locationId];
      const isLoading = mlPredictionsLoading[locationId];

      
      if (!hasActualReviews && !hasPrediction && !isLoading) {
        dispatch(fetchMLPredictions(locationId));
      } 
    await dispatch(fetchLocationDetails(locationId));
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedLocationId(null);
  };

  const handleLocationSelected = async (location: SearchResult) => {
    setSearchMarker(location);
    const newRegion = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1000);

    if (location.source === "database" && location.id) {
      await handleMarkerPress(location.id);
    }
  };

  const handleAddLocation = async () => {
    if (!searchMarker) return;

    if (searchMarker.source === "database" && searchMarker.id) {
      await handleMarkerPress(searchMarker.id);
    } else {
      router.push({
        pathname: "/add-location",
        params: {
          name: searchMarker.name,
          address: searchMarker.address,
          latitude: searchMarker.latitude,
          longitude: searchMarker.longitude,
          placeType: searchMarker.place_type || "other",
        },
      });
    }
  };

  const handleToggleHeatMap = () => {
    dispatch(toggleHeatMap());
    if (!heatMapVisible && heatMapData.length === 0 && userLocation) {
      dispatch(
        fetchHeatMapData({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius: APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS,
          userProfile,
        })
      );
    }
  };

  const handleToggleDangerZones = () => {
    dispatch(toggleDangerZones());

    if (!dangerZonesVisible && dangerZones.length === 0 && userId) {
      dispatch(fetchDangerZones({ userId }));
    }
  };

  if (!locationPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Location permission is required to use this feature
        </Text>
      </View>
    );
  }

  if (loading && nearbyLocations.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading nearby locations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SearchBar
        onLocationSelect={handleLocationSelected}
        userLocation={userLocation || undefined}
      />
      {(() => {
        return null;
      })()}
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        onMapReady={() => {
          setMapReady(true);
        }}
        onRegionChangeComplete={(newRegion) => {
          setRegion(newRegion);

          // Check for position OR zoom changes
          const positionChanged =
            Math.abs(newRegion.latitude - region.latitude) > 0.01 ||
            Math.abs(newRegion.longitude - region.longitude) > 0.01;

          const zoomChanged =
            Math.abs(newRegion.latitudeDelta - region.latitudeDelta) > 0.02 ||
            Math.abs(newRegion.longitudeDelta - region.longitudeDelta) > 0.02;

          if (positionChanged || zoomChanged) {
            // Calculate dynamic radius based on zoom level
            const latRadius = newRegion.latitudeDelta * 111 * 1000;
            const dynamicRadius = Math.min(Math.max(latRadius, 10000), 100000);

            dispatch(
              fetchNearbyLocations({
                latitude: newRegion.latitude,
                longitude: newRegion.longitude,
                radius: dynamicRadius,
              })
            );
          }
        }}
      >
        {/* Heat Map Overlay */}
        {heatMapVisible &&
          heatMapData.length > 0 &&
          heatMapData.map((point, index) => {
            // Better color and size logic
            const getHeatColor = (weight: number) => {
              if (weight >= 4.5) return "#4CAF5060"; // Light green
              if (weight >= 3.5) return "#8BC34A60"; // Green-yellow
              if (weight >= 2.5) return "#FFC10760"; // Yellow
              if (weight >= 1.5) return "#FF572260"; // Orange
              return "#F4433660"; // Red
            };

            // Dynamic size based on weight and zoom
            const baseRadius = 200 + point.heat_weight * 100;

            return (
              <Circle
                key={`heat-${index}`}
                center={{
                  latitude: point.latitude,
                  longitude: point.longitude,
                }}
                radius={baseRadius}
                fillColor={getHeatColor(point.heat_weight)}
                strokeColor="transparent"
                strokeWidth={0} // No borders for smoother look
              />
            );
          })}
        {(() => {
          return null;
        })()}
        <DangerZoneOverlay
          dangerZones={dangerZones}
          visible={dangerZonesVisible}
        />
        {/* Existing location markers from database */}
        {mapReady &&
          nearbyLocations &&
          nearbyLocations.length > 0 &&
          nearbyLocations.map((loc) => {
            const markerProps = getMarkerProps(loc);
            const prediction = mlPredictions[loc.id];

            if (markerProps.type === "predicted") {
              // Use custom predicted marker
              return (
                <Marker
                  key={`predicted-${loc.id}`}
                  coordinate={{
                    latitude: Number(loc.latitude),
                    longitude: Number(loc.longitude),
                  }}
                  onPress={() => handleMarkerPress(loc.id)}
                >
                  <PredictedBadge
                    coordinate={{
                      latitude: Number(loc.latitude),
                      longitude: Number(loc.longitude),
                    }}
                    title={loc.name}
                    predictedScore={markerProps.score}
                    confidence={markerProps.confidence}
                  />

                  {/* Custom callout for predictions */}
                  <Callout>
                    <View style={styles.predictionCallout}>
                      <Text style={styles.calloutTitle}>{loc.name}</Text>
                      <Text style={styles.calloutPrediction}>
                        🤖 AI Prediction: {markerProps.score.toFixed(1)}/5
                      </Text>
                      <Text style={styles.calloutConfidence}>
                        {Math.round((markerProps.confidence || 0) * 100)}%
                        confident
                      </Text>
                      <Text style={styles.calloutNote}>
                        Based on similar locations and user demographics
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              );
            } else {
              // Use regular marker for reviewed locations
              return (
                <Marker
                  key={`db-${loc.id}`}
                  coordinate={{
                    latitude: Number(loc.latitude),
                    longitude: Number(loc.longitude),
                  }}
                  title={loc.name}
                  description={markerProps.description}
                  pinColor={markerProps.color}
                  onPress={() => handleMarkerPress(loc.id)}
                />
              );
            }
          })}
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

      {/* Map Controls Container */}
      <View style={styles.mapControls}>
        {/* Heat Map Toggle */}
        <TouchableOpacity
          style={[
            styles.heatMapToggle,
            heatMapVisible && styles.heatMapToggleActive,
          ]}
          onPress={handleToggleHeatMap}
          disabled={heatMapLoading}
        >
          <Ionicons
            name={heatMapVisible ? "thermometer" : "thermometer-outline"}
            size={24}
            color={heatMapVisible ? "#fff" : "#333"}
          />
          <Text
            style={[
              styles.heatMapToggleText,
              heatMapVisible && styles.heatMapToggleTextActive,
            ]}
          >
            {heatMapLoading ? "Loading..." : "Heat Map"}
          </Text>
        </TouchableOpacity>

        {/* Danger Zones Toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            dangerZonesVisible && styles.controlButtonActive,
          ]}
          onPress={handleToggleDangerZones}
          disabled={dangerZonesLoading}
        >
          <Ionicons
            name={dangerZonesVisible ? "shield" : "shield-outline"}
            size={24}
            color={dangerZonesVisible ? "#fff" : "#333"}
          />
          <Text
            style={[
              styles.controlButtonText,
              dangerZonesVisible && styles.controlButtonTextActive,
            ]}
          >
            {dangerZonesLoading ? "Loading..." : "Danger Zones"}
          </Text>
        </TouchableOpacity>
        {mlPredictionsLoading && (
          <View style={styles.mlLoadingContainer}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={styles.mlLoadingText}>Getting AI predictions...</Text>
          </View>
        )}
      </View>

      {/* Heat Map Legend */}
      {heatMapVisible && (
        <View style={styles.heatMapLegend}>
          <Text style={styles.legendTitle}>Safety for People Like You</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: "#4CAF50" }]}
              />
              <Text style={styles.legendText}>Safe</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: "#FFC107" }]}
              />
              <Text style={styles.legendText}>Mixed</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: "#F44336" }]}
              />
              <Text style={styles.legendText}>Unsafe</Text>
            </View>
          </View>
        </View>
      )}

      {/* Danger Zones Legend */}
      {dangerZonesVisible && dangerZones.length > 0 && (
        <View style={styles.dangerZoneLegend}>
          <Text style={styles.legendTitle}>⚠️ Danger Zones</Text>
          <Text style={styles.legendSubtitle}>
            Areas with reported discrimination
          </Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: "#F44336" }]}
              />
              <Text style={styles.legendText}>High Risk</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: "#FF9800" }]}
              />
              <Text style={styles.legendText}>Medium Risk</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: "#FFC107" }]}
              />
              <Text style={styles.legendText}>Low Risk</Text>
            </View>
          </View>
        </View>
      )}

      {/* Add Location Button */}
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
    backgroundColor: APP_CONFIG.MAP_MARKERS.COLOR_SAFE,
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
    backgroundColor: APP_CONFIG.MAP_MARKERS.COLOR_NO_REVIEWS,
  },
  addLocationText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  mapControls: {
    position: "absolute",
    bottom: 120,
    right: 20,
    zIndex: 1000,
  },
  heatMapToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#4CAF50",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  heatMapToggleActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  heatMapToggleText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  heatMapToggleTextActive: {
    color: "#fff",
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#F44336",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    marginTop: 10,
  },
  controlButtonActive: {
    backgroundColor: "#F44336",
    borderColor: "#F44336",
  },
  controlButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  controlButtonTextActive: {
    color: "#fff",
  },
  heatMapLegend: {
    position: "absolute",
    bottom: 100,
    left: 20,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dangerZoneLegend: {
    position: "absolute",
    bottom: 180,
    left: 20,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#F44336",
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  legendSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: "row",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  predictionCallout: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  calloutPrediction: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "600",
    marginBottom: 3,
  },
  calloutConfidence: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  calloutNote: {
    fontSize: 11,
    color: "#888",
    fontStyle: "italic",
  },
  mlLoadingContainer: {
    position: "absolute",
    top: 100,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  mlLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#2196F3",
    fontWeight: "600",
  },
  predictionBadge: {
    position: "absolute",
    top: -45,
    left: -25,
    backgroundColor: "rgba(0, 122, 255, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  predictionText: {
    color: "white",
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
  confidenceText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 7,
    textAlign: "center",
  },
  loadingBadge: {
    position: "absolute",
    top: -35,
    left: -10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 4,
    borderRadius: 3,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 3,
  },
});
