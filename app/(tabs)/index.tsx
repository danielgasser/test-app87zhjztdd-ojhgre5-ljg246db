import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import MapView, {
  Marker,
  Circle,
  Callout,
  Polyline,
  LatLng,
} from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  fetchNearbyLocations,
  fetchLocationDetails,
  setUserLocation,
  setUserCountry,
  fetchHeatMapData,
  toggleHeatMap,
  fetchDangerZones,
  toggleDangerZones,
  fetchMLPredictions,
  toggleRouteSegments,
  clearRoutes,
  RouteCoordinate,
  setNavigationIntent,
  clearNavigationIntent,
} from "../../src/store/locationsSlice";
import LocationDetailsModal from "src/components/LocationDetailsModal";
import SearchBar from "src/components/SearchBar";
import DangerZoneOverlay from "src/components/DangerZoneOverlay";
import { useFocusEffect } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import RoutePlanningModal from "src/components/RoutePlanningModal";
import { setMapCenter } from "src/store/locationsSlice";
import { getUserCountry } from "src/utils/locationHelpers";

import { APP_CONFIG } from "@/utils/appConfig";
import { requireAuth } from "@/utils/authHelpers";

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
  // ============= STATE VARIABLES =============
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
  const [showRoutePlanning, setShowRoutePlanning] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState<RouteCoordinate | null>(null);
  const [routeDestination, setRouteDestination] =
    useState<RouteCoordinate | null>(null);
  const [routeMode, setRouteMode] = useState<
    "select_origin" | "select_destination" | "none"
  >("none");
  const [showRoutePlanningModal, setShowRoutePlanningModal] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // ============= REDUX & HOOKS =============
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
    mlPredictions,
    mlPredictionsLoading,
    selectedRoute,
    routes,
    showRouteSegments,
    navigationIntent,
  } = useAppSelector((state: any) => state.locations);

  const userId = useAppSelector((state: any) => state.auth.user?.id);
  const userProfile = useAppSelector((state: any) => state.user.profile);

  // ============= HELPER FUNCTIONS =============
  const getMarkerProps = (location: any) => {
    const hasReviews =
      location.demographic_safety_score || location.avg_safety_score;
    const prediction = mlPredictions[location.id];

    if (hasReviews) {
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
      const confidencePercent = Math.round(prediction.confidence * 100);

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
      return {
        type: "unknown",
        score: null,
        color: "#007AFF",
        description: "No data available",
      };
    }
  };

  // ============= EVENT HANDLERS =============
  const handleMarkerPress = async (locationId: string) => {
    setSelectedLocationId(locationId);
    setModalVisible(true);

    await dispatch(fetchLocationDetails(locationId));

    // NEW: Fetch ML prediction on-demand if needed
    const location = nearbyLocations.find(
      (loc: { id: string }) => loc.id === locationId
    );
    if (location && userProfile) {
      const hasActualReviews =
        location.demographic_safety_score || location.avg_safety_score;
      const hasPrediction = mlPredictions[locationId];
      const isLoading = mlPredictionsLoading[locationId];

      if (!hasActualReviews && !hasPrediction && !isLoading) {
        dispatch(fetchMLPredictions(locationId));
      }
    }
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
    dispatch(
      setMapCenter({
        latitude: location.latitude,
        longitude: location.longitude,
      })
    );
    mapRef.current?.animateToRegion(newRegion, 1000);

    if (location.source === "database" && location.id) {
      await handleMarkerPress(location.id);
    }
  };

  const handleAddLocation = async () => {
    if (!requireAuth(userId, "add location")) return;

    if (!searchMarker) return;

    if (searchMarker.source === "database" && searchMarker.id) {
      await handleMarkerPress(searchMarker.id);
    } else {
      router.push({
        pathname: "/review",
        params: {
          isNewLocation: "true",
          locationData: JSON.stringify({
            name: searchMarker.name,
            address: searchMarker.address,
            latitude: searchMarker.latitude,
            longitude: searchMarker.longitude,
            place_type: searchMarker.place_type || "other",
          }),
        },
      });
    }
  };
  const handleMapLongPress = async (event: any) => {
    if (!requireAuth(userId, "add marker")) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;

    // Set as search marker (same UX as search results)
    const newMarker = {
      id: `longpress-${Date.now()}`,
      name: "New Location",
      address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      latitude: latitude,
      longitude: longitude,
      place_type: "other",
      source: "mapbox" as const,
    };

    setSearchMarker(newMarker);
  };

  const handleToggleHeatMap = () => {
    if (!requireAuth(userId, "view danger zones")) return;

    dispatch(toggleHeatMap());
    if (!heatMapVisible && heatMapData.length === 0 && userLocation) {
      console.log("🔥 Fetching heatmap data...");
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
    if (!requireAuth(userId, "view danger zones")) return;

    dispatch(toggleDangerZones());
    if (!dangerZonesVisible && dangerZones.length === 0 && userId) {
      console.log("🛡️ Fetching danger zones for userId:", userId);
      dispatch(
        fetchDangerZones({
          userId: userId,
          radius: 10000,
          userDemographics: userProfile,
        })
      );
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");

      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
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
        const countryCode = await getUserCountry({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        dispatch(setUserCountry(countryCode));
      }
    } catch (error) {
      console.error("Location permission error:", error);
      setLocationPermission(false);
    }
  };
  const handleStartRouteSelection = () => {
    if (!requireAuth(userId, "plan a route")) return;

    setShowRoutePlanningModal(true);
  };
  const handleCloseRoutePlanning = () => {
    setShowRoutePlanningModal(false);
  };

  const getRouteLineColor = (route: any) => {
    if (!route.safety_analysis)
      return APP_CONFIG.ROUTE_DISPLAY.COLORS.SELECTED_ROUTE;

    const score = route.safety_analysis.overall_route_score;
    if (score >= APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD) {
      return APP_CONFIG.ROUTE_DISPLAY.COLORS.SAFE_ROUTE;
    } else if (score >= APP_CONFIG.ROUTE_PLANNING.MIXED_ROUTE_THRESHOLD) {
      return APP_CONFIG.ROUTE_DISPLAY.COLORS.MIXED_ROUTE;
    } else {
      return APP_CONFIG.ROUTE_DISPLAY.COLORS.UNSAFE_ROUTE;
    }
  };

  const renderRouteSegments = (route: any) => {
    if (!showRouteSegments || !route.safety_analysis?.segment_scores)
      return null;

    return route.safety_analysis.segment_scores.map(
      (segment: any, index: number) => {
        const segmentColor =
          segment.overall_score >=
          APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD
            ? APP_CONFIG.ROUTE_DISPLAY.COLORS.SAFE_ROUTE
            : segment.overall_score >=
              APP_CONFIG.ROUTE_PLANNING.MIXED_ROUTE_THRESHOLD
            ? APP_CONFIG.ROUTE_DISPLAY.COLORS.MIXED_ROUTE
            : APP_CONFIG.ROUTE_DISPLAY.COLORS.UNSAFE_ROUTE;

        return (
          <Polyline
            key={`segment-${index}`}
            coordinates={[segment.start, segment.end]}
            strokeColor={segmentColor}
            strokeWidth={APP_CONFIG.ROUTE_DISPLAY.LINE_WIDTH.SEGMENT_HIGHLIGHT}
            lineDashPattern={[5, 5]}
          />
        );
      }
    );
  };
  // ============= EFFECTS =============
  useEffect(() => {
    requestLocationPermission();
  }, []);

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
      dispatch(
        fetchDangerZones({
          userId: userId,
          radius: 10000,
          userDemographics: userProfile,
        })
      );
    }
  }, [userId, userLocation, dispatch]);

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
  // Handle navigation intents from other tabs
  useEffect(() => {
    if (navigationIntent && navigationIntent.targetTab === "map") {
      const handleIntent = async () => {
        if (
          navigationIntent.action === "view_location" &&
          navigationIntent.locationId
        ) {
          try {
            // Fetch location details to get coordinates
            const locationDetails = await dispatch(
              fetchLocationDetails(navigationIntent.locationId)
            ).unwrap();

            if (
              locationDetails &&
              locationDetails.latitude &&
              locationDetails.longitude
            ) {
              // Center map on location
              const newRegion = {
                latitude: locationDetails.latitude,
                longitude: locationDetails.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              setRegion(newRegion);
              mapRef.current?.animateToRegion(newRegion, 1000);

              // Open location modal
              setSelectedLocationId(navigationIntent.locationId);
              setModalVisible(true);
            }

            // Clear the intent after handling
            dispatch(clearNavigationIntent());
          } catch (error) {
            console.error("Error handling navigation intent:", error);
            dispatch(clearNavigationIntent());
          }
        }
      };

      handleIntent();
    }
  }, [navigationIntent, dispatch]);

  // ============= CONDITIONAL RENDERS =============
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

  // ============= MAIN RENDER =============
  return (
    <View style={styles.container}>
      <SearchBar
        onLocationSelect={handleLocationSelected}
        userLocation={userLocation || undefined}
      />

      <MapView
        key={mapKey}
        ref={mapRef}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        onLongPress={handleMapLongPress}
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
            // Update map center for Community feed
            dispatch(
              setMapCenter({
                latitude: newRegion.latitude,
                longitude: newRegion.longitude,
              })
            );

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
          heatMapData.map(
            (
              point: { weight: number; latitude: any; longitude: any },
              index: any
            ) => {
              const getHeatColor = (weight: number) => {
                if (weight >= 4.5) return "#4CAF5060";
                if (weight >= 3.5) return "#8BC34A60";
                if (weight >= 2.5) return "#FFC10760";
                if (weight >= 1.5) return "#FF572260";
                return "#F4433660";
              };

              const baseRadius = 200 + point.weight * 100;

              return (
                <Circle
                  key={`heat-${index}`}
                  center={{
                    latitude: point.latitude,
                    longitude: point.longitude,
                  }}
                  radius={baseRadius}
                  fillColor={getHeatColor(point.weight)}
                  strokeColor="transparent"
                  strokeWidth={0}
                />
              );
            }
          )}

        <DangerZoneOverlay
          dangerZones={dangerZones}
          visible={dangerZonesVisible}
        />
        {/* Location markers */}
        {mapReady &&
          nearbyLocations &&
          nearbyLocations.length > 0 &&
          nearbyLocations.map(
            (loc: {
              id: string;
              latitude: any;
              longitude: any;
              name:
                | string
                | number
                | bigint
                | boolean
                | React.ReactElement<
                    unknown,
                    string | React.JSXElementConstructor<any>
                  >
                | Iterable<React.ReactNode>
                | Promise<
                    | string
                    | number
                    | bigint
                    | boolean
                    | React.ReactPortal
                    | React.ReactElement<
                        unknown,
                        string | React.JSXElementConstructor<any>
                      >
                    | Iterable<React.ReactNode>
                    | null
                    | undefined
                  >
                | null
                | undefined;
            }) => {
              const markerProps = getMarkerProps(loc);

              if (markerProps.type === "predicted") {
                return (
                  <Marker
                    key={`predicted-${loc.id}`}
                    coordinate={{
                      latitude: Number(loc.latitude),
                      longitude: Number(loc.longitude),
                    }}
                    onPress={() => handleMarkerPress(loc.id)}
                  >
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
                return (
                  <Marker
                    key={`db-${loc.id}`}
                    coordinate={{
                      latitude: Number(loc.latitude),
                      longitude: Number(loc.longitude),
                    }}
                    title={
                      typeof loc.name === "string"
                        ? loc.name
                        : loc.name != null
                        ? String(loc.name)
                        : ""
                    }
                    description={markerProps.description}
                    pinColor={markerProps.color}
                    onPress={() => handleMarkerPress(loc.id)}
                  />
                );
              }
            }
          )}
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
        {routeOrigin && (
          <Marker
            coordinate={routeOrigin}
            pinColor={APP_CONFIG.ROUTE_DISPLAY.MARKERS.START_COLOR}
            title="Origin"
            description="Route starting point"
          />
        )}
        {routeDestination && (
          <Marker
            coordinate={routeDestination}
            pinColor={APP_CONFIG.ROUTE_DISPLAY.MARKERS.END_COLOR}
            title="Destination"
            description="Route ending point"
          />
        )}
        {selectedRoute && (
          <>
            <Polyline
              coordinates={selectedRoute.coordinates}
              strokeColor={getRouteLineColor(selectedRoute)}
              strokeWidth={APP_CONFIG.ROUTE_DISPLAY.LINE_WIDTH.SELECTED}
            />
            {renderRouteSegments(selectedRoute)}
          </>
        )}
        {routes
          .filter((route: { id: any }) => route.id !== selectedRoute?.id)
          .map(
            (route: {
              id: React.Key | null | undefined;
              coordinates: LatLng[];
            }) => (
              <Polyline
                key={route.id}
                coordinates={route.coordinates}
                strokeColor={APP_CONFIG.ROUTE_DISPLAY.COLORS.ALTERNATIVE_ROUTE}
                strokeWidth={APP_CONFIG.ROUTE_DISPLAY.LINE_WIDTH.ALTERNATIVE}
                lineDashPattern={[10, 5]}
              />
            )
          )}
      </MapView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
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
      </View>
      {selectedRoute && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 16,
            paddingTop: 16,
            backgroundColor: "#fff",
          }}
        >
          <TouchableOpacity
            style={[styles.mapControlButton, { backgroundColor: "#F44336" }]}
            onPress={() => {
              dispatch(clearRoutes());
              setRouteOrigin(null);
              setRouteDestination(null);
              setMapKey((prev) => prev + 1);
            }}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text
            style={{
              color: "#000",
              fontSize: 18,
              fontWeight: "600",
              marginLeft: 14, // Spacing between button and text
              paddingBottom: 8,
            }}
          >
            Delete Route
          </Text>
        </View>
      )}
      {/* ML Loading indicator */}
      {Object.values(mlPredictionsLoading).some((loading) => loading) && (
        <View style={styles.mlLoadingContainer}>
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={styles.mlLoadingText}>Getting AI predictions...</Text>
        </View>
      )}

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
            style={styles.addLocationButton}
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
          <TouchableOpacity
            style={styles.closeSearchButton}
            onPress={() => setSearchMarker(null)}
          >
            <Ionicons name="close-circle" size={28} color="#F44336" />
          </TouchableOpacity>
        </View>
      )}
      {!searchMarker && ( // Only show when not showing search marker button
        <View style={styles.routeControls}>
          {routeMode === "none" ? (
            <TouchableOpacity
              style={styles.routeButton}
              onPress={handleStartRouteSelection}
            >
              <Ionicons name="navigate" size={24} color="#FFF" />
              <Text style={styles.routeButtonText}>Plan Route</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.routeModeControls}>
              <Text style={styles.routeModeText}>
                {routeMode === "select_origin"
                  ? "Tap to set origin"
                  : "Tap to set destination"}
              </Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseRoutePlanning}
              >
                <Ionicons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
          <RoutePlanningModal
            visible={showRoutePlanningModal}
            onClose={handleCloseRoutePlanning}
          />
        </View>
      )}
      {selectedRoute && (
        <View style={styles.routeInfoPanel}>
          <View style={styles.routeInfoHeader}>
            <Text style={styles.routeInfoTitle}>{selectedRoute.name}</Text>
            <TouchableOpacity
              style={styles.segmentToggle}
              onPress={() => dispatch(toggleRouteSegments())}
            >
              <Text style={styles.segmentToggleText}>
                {showRouteSegments ? "Hide" : "Show"} Segments
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.routeStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {selectedRoute.safety_analysis.overall_route_score.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Safety Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {selectedRoute.estimated_duration_minutes}min
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {(
                  selectedRoute.safety_analysis.total_distance_meters / 1000
                ).toFixed(1)}
                km
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.routeDetailsButton}
            onPress={() => setShowRoutePlanning(true)}
          >
            <Text style={styles.routeDetailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      )}
      <LocationDetailsModal
        visible={modalVisible}
        locationId={selectedLocationId}
        onClose={handleModalClose}
      />
      <RoutePlanningModal
        visible={showRoutePlanning}
        onClose={() => setShowRoutePlanning(false)}
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
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  closeSearchButton: {
    marginLeft: 12,
    padding: 8,
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
  routeControls: {
    position: "absolute",
    top: 0, // Adjust based on your layout
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  routeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8E24AA",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  routeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  routeModeControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#8E24AA",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  routeModeText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  cancelButton: {
    padding: 4,
  },
  routeInfoPanel: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  routeInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  routeInfoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  segmentToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#8E24AA",
    borderRadius: 16,
  },
  segmentToggleText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "500",
  },
  routeStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  routeDetailsButton: {
    backgroundColor: "#8E24AA",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  routeDetailsButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  mapControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
