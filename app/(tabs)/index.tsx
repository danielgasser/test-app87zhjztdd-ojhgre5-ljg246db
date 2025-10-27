import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import MapView, {
  PROVIDER_GOOGLE,
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
  fetchDangerZones,
  toggleDangerZones,
  fetchMLPredictions,
  toggleRouteSegments,
  clearRoutes,
  RouteCoordinate,
  clearNavigationIntent,
  endNavigation,
  startNavigation,
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
import { supabase } from "@/services/supabase";
import NavigationMode from "src/components/NavigationMode";
import { commonStyles } from "@/styles/common";
import { theme } from "@/styles/theme";
import ProfileBanner from "@/components/ProfileBanner";
import { checkProfileCompleteness } from "@/utils/profileValidation";
import { shouldShowBanner } from "@/store/profileBannerSlice";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";

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

export default function MapScreen() {
  // ============= STATE VARIABLES =============
  const mapRef = useRef<MapView>(null);
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
  const [routeOrigin, setRouteOrigin] = useState<RouteCoordinate | null>(null);
  const [routeDestination, setRouteDestination] =
    useState<RouteCoordinate | null>(null);
  const [routeMode, setRouteMode] = useState<
    "select_origin" | "select_destination" | "none"
  >("none");
  const [showRoutePlanningModal, setShowRoutePlanningModal] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  const [selectedGooglePlaceId, setSelectedGooglePlaceId] = useState<
    string | null
  >(null);

  // ============= REDUX & HOOKS =============
  const dispatch = useAppDispatch();
  const router = useRouter();
  // Redux selectors
  const {
    nearbyLocations,
    loading,
    userLocation,
    navigationActive,
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

  const bannerState = useAppSelector((state: any) => state.profileBanner);

  // Check profile completeness for GENERAL (danger zones need full profile)
  const profileCheck = React.useMemo(() => {
    if (!userProfile) return { canUse: true, missingFields: [] };

    const validation = checkProfileCompleteness(userProfile, "SAFE_ROUTING");
    return {
      canUse: validation.canUseFeature,
      missingFields: validation.missingFieldsForFeature,
    };
  }, [userProfile]);

  // Determine if we should show the banner
  const showProfileBanner = React.useMemo(() => {
    if (profileCheck.canUse) return false;
  }, [profileCheck.canUse, , dangerZonesVisible, bannerState]);

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
        color: theme.colors.primary,
        description: "No data available",
      };
    }
  };

  // ============= EVENT HANDLERS =============
  const handleMarkerPress = async (locationId: string) => {
    console.log("marker pressed", locationId);
    setSelectedLocationId(locationId);
    setModalVisible(true);
    // Check if this is a searchMarker (temporary new location)
    if (searchMarker && searchMarker.id === locationId) {
      console.log("🔍 This is a searchMarker");
      // For searchMarkers, trigger ML with coordinates directly
      if (
        userProfile &&
        !mlPredictions[locationId] &&
        !mlPredictionsLoading[locationId]
      ) {
        console.log("✅ CALLING fetchMLPredictions for searchMarker");
        dispatch(fetchMLPredictions(locationId));
      }
      return;
    }
    await dispatch(fetchLocationDetails(locationId));

    // NEW: Fetch ML prediction on-demand if needed
    const location = nearbyLocations.find(
      (loc: { id: string }) => loc.id === locationId
    );
    console.log("🔍 DEBUG location found:", !!location);
    console.log("🔍 DEBUG userProfile exists:", !!userProfile);
    if (location && userProfile) {
      const hasActualReviews =
        location.review_count && location.review_count > 0;

      const hasPrediction = mlPredictions[locationId];
      const isLoading = mlPredictionsLoading[locationId];
      console.log("🔍 DEBUG hasActualReviews:", hasActualReviews);
      console.log("🔍 DEBUG hasPrediction:", hasPrediction);
      console.log("🔍 DEBUG isLoading:", isLoading);
      if (!hasActualReviews && !hasPrediction && !isLoading) {
        console.log("✅ CALLING fetchMLPredictions");

        dispatch(fetchMLPredictions(locationId));
      }
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedLocationId(null);
    setSelectedGooglePlaceId(null);
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
    console.log("🔵 userId:", userId);
    if (!requireAuth(userId, "add location")) return;

    if (!searchMarker) return;

    if ((searchMarker.source || "database") === "database" && searchMarker.id) {
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

  const handleMapPress = async (event: any) => {
    Keyboard.dismiss();

    // Clear selected marker and modal
    setSelectedLocationId(null);
    setSelectedGooglePlaceId(null);
    setModalVisible(false);

    if (!requireAuth(userId, "add marker")) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;

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
    // Immediately open modal with this new location
    setSelectedGooglePlaceId(newMarker.id);
    setModalVisible(true);

    // Trigger ML prediction for this location
    if (userProfile) {
      dispatch(fetchMLPredictions(newMarker.id));
    }
  };

  const handleToggleDangerZones = () => {
    if (!requireAuth(userId, "view danger zones")) return;
    // Check if user has valid demographics
    const hasValidDemographics =
      userProfile &&
      (userProfile.race_ethnicity?.length > 0 ||
        userProfile.gender ||
        userProfile.lgbtq_status);

    if (!hasValidDemographics) {
      return;
    }
    dispatch(toggleDangerZones());
    if (!dangerZonesVisible && dangerZones.length === 0 && userId) {
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
      const permissionPromise = Location.requestForegroundPermissionsAsync();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Permission timeout")), 5000)
      );
      const { status } = (await Promise.race([
        permissionPromise,
        timeoutPromise,
      ])) as any;
      console.log("🟢 Permission status:", status);
      //setLocationPermission(status === "granted");

      if (status === "granted" || status === undefined) {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({});
        if (location) {
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
      }
    } catch (error) {
      console.log("❌ Permission error - trying fallback:", error);
      // Android emulator workaround - try to get last known location
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          setLocationPermission(true);
          const newRegion = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          };
          setRegion(newRegion);
          dispatch(
            setUserLocation({
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            })
          );
          const countryCode = await getUserCountry({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          });
          dispatch(setUserCountry(countryCode));
        }
      } catch (fallbackError) {
        logger.error("Location permission failed", fallbackError);
        setLocationPermission(false);
      }
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

  /**
   * Calculate distance between two coordinates in meters
   */
  const calculateDistance = (
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  /**
   * Split route_points into chunks matching segment boundaries
   */
  const splitRouteIntoSegments = (
    routePoints: Array<{ latitude: number; longitude: number }>,
    segmentScores: Array<any>
  ): Array<Array<{ latitude: number; longitude: number }>> => {
    if (
      !routePoints ||
      routePoints.length === 0 ||
      !segmentScores ||
      segmentScores.length === 0
    ) {
      return [];
    }

    const chunks: Array<Array<{ latitude: number; longitude: number }>> = [];
    let currentChunk: Array<{ latitude: number; longitude: number }> = [
      routePoints[0],
    ];
    let cumulativeDistance = 0;
    let currentSegmentIndex = 0;

    for (let i = 1; i < routePoints.length; i++) {
      const segmentDistance = calculateDistance(
        routePoints[i - 1],
        routePoints[i]
      );
      cumulativeDistance += segmentDistance;
      currentChunk.push(routePoints[i]);

      // Check if we've reached the end of the current segment
      if (currentSegmentIndex < segmentScores.length) {
        const targetDistance =
          segmentScores[currentSegmentIndex].distance_meters;

        // If we've traveled the target distance (with 10% tolerance), start new chunk
        if (cumulativeDistance >= targetDistance * 0.9) {
          chunks.push([...currentChunk]);
          currentChunk = [routePoints[i]]; // Start next chunk with current point
          cumulativeDistance = 0;
          currentSegmentIndex++;
        }
      }
    }

    // Add remaining points as last chunk
    if (currentChunk.length > 1) {
      chunks.push(currentChunk);
    }

    return chunks;
  };

  const renderRouteSegments = (route: any, forceShow: boolean = false) => {
    if (
      (!showRouteSegments && !forceShow) ||
      !route.safety_analysis?.segment_scores ||
      !route.route_points
    )
      return null;

    const segmentChunks = splitRouteIntoSegments(
      route.route_points,
      route.safety_analysis.segment_scores
    );

    return route.safety_analysis.segment_scores.map(
      (segment: any, index: number) => {
        if (!segmentChunks[index] || segmentChunks[index].length < 2) {
          return null;
        }

        const segmentColor =
          (segment.safety_score || segment.overall_score) >=
          APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD
            ? APP_CONFIG.ROUTE_DISPLAY.COLORS.SAFE_ROUTE
            : (segment.safety_score || segment.overall_score) >=
              APP_CONFIG.ROUTE_PLANNING.MIXED_ROUTE_THRESHOLD
            ? APP_CONFIG.ROUTE_DISPLAY.COLORS.MIXED_ROUTE
            : APP_CONFIG.ROUTE_DISPLAY.COLORS.UNSAFE_ROUTE;

        // Try wrapping in Fragment with timestamp key to force re-render
        return (
          <React.Fragment key={`segment-${index}-${Date.now()}`}>
            <Polyline
              key={`segment-${index}`}
              coordinates={segmentChunks[index]}
              strokeColors={[segmentColor]}
              strokeWidth={APP_CONFIG.ROUTE_DISPLAY.LINE_WIDTH.SELECTED}
            />
          </React.Fragment>
        );
      }
    );
  };

  const handleStartNavigationFromMap = () => {
    if (!selectedRoute) {
      notify.error("No route selected");
      return;
    }

    dispatch(startNavigation());
    setShowRoutePlanningModal(false);
  };

  const handleExitNavigation = () => {
    dispatch(endNavigation());
  };

  const handlePoiClick = async (event: any) => {
    const { placeId, name, coordinate } = event.nativeEvent;

    // Check if this place already exists in database
    const { data: existingLocation } = await supabase
      .from("locations")
      .select("id")
      .eq("google_place_id", placeId)
      .single();

    // Set the Google Place ID so modal can ALWAYS fetch Google details
    setSelectedGooglePlaceId(placeId);

    if (existingLocation) {
      // Location exists in DB - modal will show DB reviews + Google details
      setSelectedLocationId(existingLocation.id);
    } else {
      // New POI - modal will show only Google details (no DB reviews)
      setSelectedLocationId(null);
    }

    // Open modal
    setModalVisible(true);
  };

  // ============= EFFECTS =============
  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        notify.error(
          "Location permission is required to show nearby locations",
          "Permission Denied"
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
    // Only fetch danger zones if user has completed profile with demographics
    const hasValidDemographics =
      userProfile &&
      (userProfile.race_ethnicity?.length > 0 ||
        userProfile.gender ||
        userProfile.lgbtq_status);

    if (userId && userLocation && hasValidDemographics) {
      dispatch(
        fetchDangerZones({
          userId: userId,
          radius: 10000,
          userDemographics: userProfile,
        })
      );
    }
  }, [userId, userLocation, dispatch]);

  // Auto-fetch ML predictions for locations without reviews
  useEffect(() => {
    if (nearbyLocations.length > 0 && userProfile) {
      const locationsToPredict = nearbyLocations.slice(0, 10);
      locationsToPredict.forEach(
        (location: {
          demographic_safety_score: any;
          avg_safety_score: any;
          id: string;
        }) => {
          const hasReviews =
            location.demographic_safety_score || location.avg_safety_score;
          const hasPrediction = mlPredictions[location.id];
          const isLoading = mlPredictionsLoading[location.id];

          // Fetch prediction if no reviews, no existing prediction, and not already loading
          if (!hasReviews && !hasPrediction && !isLoading) {
            dispatch(fetchMLPredictions(location.id));
          }
        }
      );
    }
  }, [nearbyLocations, userProfile, dispatch]); // Don't include mlPredictions to avoid infinite loop
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

  // Handle navigation intents from other tabs - using useFocusEffect so it runs when tab is focused
  useFocusEffect(
    useCallback(() => {
      if (
        navigationIntent?.targetTab === "map" &&
        navigationIntent?.locationId
      ) {
        dispatch(clearNavigationIntent());

        setTimeout(async () => {
          try {
            const locationDetails = await dispatch(
              fetchLocationDetails(navigationIntent.locationId)
            ).unwrap();

            const location = Array.isArray(locationDetails)
              ? locationDetails[0]
              : locationDetails;

            if (location?.latitude && location?.longitude) {
              const newRegion = {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };

              setRegion(newRegion);

              // Wait a bit longer for Redux to update selectedLocation
              setTimeout(() => {
                if (mapRef.current) {
                  mapRef.current.animateToRegion(newRegion, 1000);
                }

                // Open modal AFTER redux has time to update
                setSelectedLocationId(navigationIntent.locationId);
                setModalVisible(true);
              }, 800); // <- Increased delay
            }
          } catch (error) {
            logger.error("❌ Error handling navigation:", error);
          }
        }, 100);
      }
    }, [navigationIntent])
  );

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
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading nearby locations...</Text>
      </View>
    );
  }

  // ============= MAIN RENDER =============
  return (
    <View style={styles.container}>
      {/* Profile Completion Banner */}
      {showProfileBanner && (
        <View style={styles.bannerContainer}>
          <ProfileBanner
            bannerType={
              APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES
                .ROUTING_INCOMPLETE
            }
            missingFields={profileCheck.missingFields}
            visible={showProfileBanner}
          />
        </View>
      )}
      <SearchBar
        onLocationSelect={handleLocationSelected}
        userLocation={userLocation || undefined}
      />
      <MapView
        key={mapKey}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        showsPointsOfInterest={true}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        onPress={handleMapPress}
        onMapReady={() => {
          setMapReady(true);
        }}
        onPoiClick={handlePoiClick}
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
            pinColor={theme.colors.primary}
            onPress={() => {
              // For new locations (not in database)
              if (searchMarker.source !== "database") {
                setSelectedGooglePlaceId(searchMarker.id);
                setModalVisible(true);

                // Trigger ML prediction with coordinates
                if (
                  userProfile &&
                  searchMarker.latitude &&
                  searchMarker.longitude
                ) {
                  console.log(
                    "🔍 Triggering ML for new location:",
                    searchMarker.id
                  );
                  dispatch(fetchMLPredictions(searchMarker.id));
                }
              } else {
                // For database locations, use handleMarkerPress
                handleMarkerPress(searchMarker.id);
              }
            }}
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
            {/* Only show main line when NOT using colored segments */}
            {!navigationActive && !showRouteSegments && (
              <>
                <Polyline
                  coordinates={
                    selectedRoute.route_points || selectedRoute.coordinates
                  }
                  strokeColors={[getRouteLineColor(selectedRoute)]}
                  strokeWidth={APP_CONFIG.ROUTE_DISPLAY.LINE_WIDTH.SELECTED}
                />
              </>
            )}
            {/* Show colored segments */}
            {navigationActive
              ? renderRouteSegments(selectedRoute, true)
              : showRouteSegments && renderRouteSegments(selectedRoute)}
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
      {/* Danger Zones Control */}
      <View style={styles.dangerZoneContainer}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            dangerZonesVisible && styles.controlButtonActive,
          ]}
          onPress={() => {
            handleToggleDangerZones();
          }}
        >
          <Ionicons
            name={dangerZonesVisible ? "shield" : "shield-outline"}
            size={24}
            color={
              dangerZonesVisible
                ? theme.colors.textOnPrimary
                : theme.colors.overlay
            }
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

      {selectedRoute && !navigationActive && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 16,
            paddingTop: 16,
            backgroundColor: theme.colors.card,
          }}
        >
          <TouchableOpacity
            style={[
              styles.mapControlButton,
              { backgroundColor: theme.colors.error },
            ]}
            onPress={() => {
              dispatch(clearRoutes());
              setRouteOrigin(null);
              setRouteDestination(null);
              setMapKey((prev) => prev + 1);
            }}
          >
            <Ionicons name="close" size={24} color={theme.colors.background} />
          </TouchableOpacity>
          <Text
            style={{
              color: theme.colors.text,
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
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.mlLoadingText}>Getting AI predictions...</Text>
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
                style={[
                  styles.legendColor,
                  { backgroundColor: theme.colors.error },
                ]}
              />
              <Text style={styles.legendText}>High Risk</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: theme.colors.accent },
                ]}
              />
              <Text style={styles.legendText}>Medium Risk</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: theme.colors.mixedYellow },
                ]}
              />
              <Text style={styles.legendText}>Low Risk</Text>
            </View>
          </View>
        </View>
      )}
      {/* Add Location Button 
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
              color={theme.colors.background}
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
            <Ionicons
              name="close-circle"
              size={28}
              color={theme.colors.error}
            />
          </TouchableOpacity>
        </View>
      )}
        */}
      <View style={styles.routeControls}>
        {routeMode === "none" ? (
          <TouchableOpacity
            style={styles.routeButton}
            onPress={handleStartRouteSelection}
          >
            <Ionicons
              name="navigate"
              size={24}
              color={theme.colors.background}
            />
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
              <Ionicons
                name="close"
                size={20}
                color={theme.colors.background}
              />
            </TouchableOpacity>
          </View>
        )}
        <RoutePlanningModal
          visible={showRoutePlanningModal}
          onClose={handleCloseRoutePlanning}
          initialDestination={searchMarker}
        />
      </View>
      {selectedRoute && !navigationActive && (
        <View style={styles.routeInfoPanel}>
          <View style={styles.routeInfoHeader}>
            <Text style={styles.routeInfoTitle}>{selectedRoute.name}</Text>
            <TouchableOpacity
              style={styles.segmentToggle}
              onPress={() => {
                dispatch(toggleRouteSegments());
                setMapKey((prev) => prev + 1);
              }}
            >
              <Text style={styles.segmentToggleText}>
                {showRouteSegments ? "Hide" : "Show"} Segments
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.routeStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {selectedRoute.safety_analysis?.overall_route_score?.toFixed(
                  1
                ) ?? "3.0"}
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
                  (selectedRoute.safety_analysis?.total_distance_meters ??
                    selectedRoute.distance_kilometers * 1000) / 1000
                ).toFixed(1)}
                km
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startNavButton}
            onPress={handleStartNavigationFromMap}
          >
            <Ionicons
              name="navigate-circle"
              size={24}
              color={theme.colors.background}
            />
            <Text style={styles.startNavButtonText}>Start Navigation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.routeDetailsButton}
            onPress={() => setShowRoutePlanningModal(true)}
          >
            <Text style={styles.routeDetailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      )}
      <LocationDetailsModal
        visible={modalVisible}
        locationId={selectedLocationId}
        googlePlaceId={selectedGooglePlaceId}
        onClose={handleModalClose}
      />
      {/* Navigation Mode */}
      {navigationActive && (
        <NavigationMode onExit={handleExitNavigation} mapRef={mapRef} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    zIndex: 10000,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.backgroundSecondary,
  },
  map: {
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.error,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  addLocationContainer: {
    position: "absolute",
    bottom: 10,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  closeSearchButton: {
    marginLeft: 12,
    padding: 12,
    zIndex: 1000,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
  },
  addLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: APP_CONFIG.MAP_MARKERS.COLOR_SAFE,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  viewLocationButton: {
    backgroundColor: APP_CONFIG.MAP_MARKERS.COLOR_NO_REVIEWS,
  },
  startNavButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  startNavButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "700",
  },
  addLocationText: {
    color: theme.colors.background,
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
  fabContainer: {
    position: "absolute",
    bottom: 120,
    right: 20,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabOpen: {
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  fabMenu: {
    position: "absolute",
    bottom: 70, // Above the FAB
    right: 0,
    gap: 12,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    gap: 8,
  },
  fabMenuText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  dangerZoneContainer: {
    position: "absolute",
    bottom: 20,
    right: 0,
    zIndex: 1000,
  },
  collapseIndicator: {
    position: "absolute",
    left: -8,
    top: "50%",
    marginTop: -20,
    width: 16,
    height: 40,
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.text,
    shadowOffset: { width: -1, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },

  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: theme.colors.error,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    marginTop: 0,
    marginBottom: 100,
    marginRight: 10,
  },
  controlButtonActive: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  controlButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  controlButtonTextActive: {
    color: theme.colors.textOnPrimary,
  },
  dangerZoneLegend: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: theme.colors.card,
    padding: 12,
    borderRadius: 8,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  legendSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
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
    color: theme.colors.primary,
    fontWeight: "600",
    marginBottom: 3,
  },
  calloutConfidence: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  calloutNote: {
    fontSize: 11,
    color: theme.colors.textSecondary,
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
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  mlLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  routeControls: {
    position: "absolute",
    top: 10,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  routeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  routeButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  routeModeControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  routeModeText: {
    color: theme.colors.background,
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
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.colors.text,
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
    color: theme.colors.text,
    flex: 1,
  },
  segmentToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
  },
  segmentToggleText: {
    color: theme.colors.background,
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
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  routeDetailsButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  routeDetailsButtonText: {
    color: theme.colors.background,
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
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
