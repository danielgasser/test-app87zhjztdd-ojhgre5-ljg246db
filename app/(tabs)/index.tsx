import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
  Platform,
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
import { useLocalSearchParams, useRouter } from "expo-router";
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
  setDangerZonesVisible,
  setSelectedRoute,
  RouteHistoryItem,
  SafeRoute,
  deleteRouteFromHistory,
} from "../../src/store/locationsSlice";
import LocationDetailsModal from "src/components/LocationDetailsModal";
import SearchBar from "src/components/SearchBar";
import DangerZoneOverlay from "src/components/DangerZoneOverlay";
import { useFocusEffect } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import RoutePlanningModal from "src/components/RoutePlanningModal";
import { setMapCenter } from "src/store/locationsSlice";
import {
  getCompleteAddressFromCoordinates,
  getUserCountry,
} from "src/utils/locationHelpers";

import { APP_CONFIG } from "@/config/appConfig";
import { requireAuth } from "@/utils/authHelpers";
import { supabase } from "@/services/supabase";
import NavigationMode from "src/components/NavigationMode";
import { theme } from "@/styles/theme";
import ProfileBanner from "@/components/ProfileBanner";
import { checkProfileCompleteness } from "@/utils/profileValidation";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import {
  calculateDistanceBetweenPoints,
  formatDistance,
} from "@/utils/distanceHelpers";
import { getRouteLineColor } from "@/utils/safetyHelpers";
import { formatDuration } from "@/utils/timeHelpers";
import { updateUserProfile, NotificationPreferences } from "@/store/userSlice";
import { getDefaultPreferences } from "@/utils/preferenceDefaults";
import { store } from "@/store";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useAuth } from "@/providers/AuthProvider";
import { shallowEqual } from "react-redux";
import { shouldShowBanner } from "@/store/profileBannerSlice";
import NavigationArrow from "@/components/NavigationArrow";

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
  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  }, []);
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
  const userSearchRadiusKm = useAppSelector(
    (state) => state.user.searchRadiusKm,
    shallowEqual
  );
  const [selectedGooglePlaceId, setSelectedGooglePlaceId] = useState<
    string | null
  >(null);
  const [hasInitiallyRecentered, setHasInitiallyRecentered] = useState(false);

  const [routePolylines, setRoutePolylines] = useState<
    Array<{
      key: string;
      coordinates: Array<{ latitude: number; longitude: number }>;
      color: string;
    }>
  >([]);

  // ============= REDUX & HOOKS =============
  const dispatch = useAppDispatch();
  const router = useRouter();
  // Redux selectors
  const {
    nearbyLocations,
    loading,
    userLocation,
    navigationActive,
    mlPredictions,
    mlPredictionsLoading,
    selectedRoute,
    routes,
    showRouteSegments,
    navigationIntent,
  } = useAppSelector((state: any) => state.locations, shallowEqual);

  const navigationPosition = useAppSelector(
    (state: any) => state.locations.navigationPosition
  );

  const locationsStateRef = useRef(null);
  const locationsState = useAppSelector((state: any) => state.locations);

  if (locationsStateRef.current !== locationsState) {
    locationsStateRef.current = locationsState;
  }

  const { user } = useAuth();
  const userId = user?.id;
  const userProfile = useAppSelector(
    (state: any) => state.user.profile,
    shallowEqual
  );
  const isAppReady = userId && userProfile && userLocation;

  const bannerState = useAppSelector(
    (state: any) => state.profileBanner,
    shallowEqual
  );
  const dangerZones = useAppSelector(
    (state) => state.locations.dangerZones,
    shallowEqual
  );
  const dangerZonesVisible = useAppSelector(
    (state) => state.locations.dangerZonesVisible,
    shallowEqual
  );
  const dangerZonesLoading = useAppSelector(
    (state) => state.locations.dangerZonesLoading,
    shallowEqual
  );

  const { distanceUnit } = useUserPreferences();

  // Update route polylines when navigation position changes
  useEffect(() => {
    if (
      !navigationActive ||
      !selectedRoute?.safety_analysis?.segment_scores ||
      !selectedRoute?.route_points
    ) {
      setRoutePolylines([]);
      return;
    }

    const routePoints = selectedRoute.route_points;
    const segmentScores = selectedRoute.safety_analysis.segment_scores;

    // Build cumulative distances for each route point
    const pointDistances: number[] = [0];
    for (let i = 1; i < routePoints.length; i++) {
      const dist = calculateDistanceBetweenPoints(
        routePoints[i - 1],
        routePoints[i]
      );
      pointDistances.push(pointDistances[i - 1] + dist);
    }

    // Find user's position projected onto route (interpolated between points)
    let userPointIndex = 0;
    let interpolatedDistance = 0;

    if (navigationPosition) {
      let minDist = Infinity;
      let bestSegmentIndex = 0;
      let bestProjectionRatio = 0;

      // Find closest segment (not just point)
      for (let i = 0; i < routePoints.length - 1; i++) {
        const segStart = routePoints[i];
        const segEnd = routePoints[i + 1];

        // Project user position onto segment
        const dx = segEnd.longitude - segStart.longitude;
        const dy = segEnd.latitude - segStart.latitude;
        const segLengthSq = dx * dx + dy * dy;

        if (segLengthSq === 0) continue;

        // Calculate projection ratio (0 = at start, 1 = at end)
        const t = Math.max(
          0,
          Math.min(
            1,
            ((navigationPosition.longitude - segStart.longitude) * dx +
              (navigationPosition.latitude - segStart.latitude) * dy) /
              segLengthSq
          )
        );

        // Find projected point
        const projLon = segStart.longitude + t * dx;
        const projLat = segStart.latitude + t * dy;

        const dist = calculateDistanceBetweenPoints(navigationPosition, {
          latitude: projLat,
          longitude: projLon,
        });

        if (dist < minDist) {
          minDist = dist;
          bestSegmentIndex = i;
          bestProjectionRatio = t;
        }
      }

      // Calculate the interpolated distance along route
      userPointIndex = bestSegmentIndex;
      const segmentLength =
        pointDistances[bestSegmentIndex + 1] - pointDistances[bestSegmentIndex];
      interpolatedDistance =
        pointDistances[bestSegmentIndex] + segmentLength * bestProjectionRatio;
    }

    // Build segment boundaries
    const totalDistance = pointDistances[pointDistances.length - 1];
    const segmentBoundaries: number[] = [0];
    let cumDist = 0;
    for (const segment of segmentScores) {
      cumDist += segment.distance_meters;
      segmentBoundaries.push(Math.min(cumDist, totalDistance));
    }

    const greyColor = "rgba(150, 150, 150, 0.5)";
    const newPolylines: Array<{
      key: string;
      coordinates: Array<{ latitude: number; longitude: number }>;
      color: string;
    }> = [];

    // Grey polyline: all points from start to user position
    if (userPointIndex > 0) {
      newPolylines.push({
        key: "traveled",
        coordinates: routePoints.slice(0, userPointIndex + 1),
        color: greyColor,
      });
    }

    // Colored polylines: points ahead of user, split by safety segments
    const userDistance =
      interpolatedDistance > 0
        ? interpolatedDistance
        : pointDistances[userPointIndex];

    for (let segIdx = 0; segIdx < segmentScores.length; segIdx++) {
      const segmentStart = segmentBoundaries[segIdx];
      const segmentEnd = segmentBoundaries[segIdx + 1] || totalDistance;

      // Skip segments entirely behind user
      if (segmentEnd <= userDistance) continue;

      const segment = segmentScores[segIdx];
      const safetyColor =
        (segment.safety_score || segment.overall_score) >=
        APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD
          ? APP_CONFIG.ROUTE_DISPLAY.COLORS.SAFE_ROUTE
          : (segment.safety_score || segment.overall_score) >=
            APP_CONFIG.ROUTE_PLANNING.MIXED_ROUTE_THRESHOLD
          ? APP_CONFIG.ROUTE_DISPLAY.COLORS.MIXED_ROUTE
          : APP_CONFIG.ROUTE_DISPLAY.COLORS.UNSAFE_ROUTE;

      const segmentCoords: Array<{ latitude: number; longitude: number }> = [];

      for (let i = 0; i < routePoints.length; i++) {
        const pointDist = pointDistances[i];

        // Only include points ahead of user AND within this segment
        if (
          i >= userPointIndex &&
          pointDist >= segmentStart &&
          pointDist <= segmentEnd
        ) {
          segmentCoords.push(routePoints[i]);
        }

        if (pointDist > segmentEnd) break;
      }

      if (segmentCoords.length >= 2) {
        newPolylines.push({
          key: `segment-${segIdx}`,
          coordinates: segmentCoords,
          color: safetyColor,
        });
      }
    }

    setRoutePolylines(newPolylines);
  }, [navigationActive, navigationPosition, selectedRoute]);

  // ===== ADD ALL THIS LOGGING HERE =====
  const renderCountRef = useRef(0);
  renderCountRef.current++;

  const userProfileRef = useRef(userProfile);
  const profileCheckRef = useRef<{
    canUse: boolean;
    missingFields: string[];
  } | null>(null);
  const showProfileBannerRef = useRef<any>(null);

  if (userProfileRef.current !== userProfile) {
    userProfileRef.current = userProfile;
  }
  // ===== END OF LOGGING BLOCK =====

  // ... existing code stays here
  // ===== END OF LOGGING BLOCK =====

  // Check profile completeness for GENERAL (danger zones need full profile)
  const profileCheck = React.useMemo(() => {
    if (!userProfile) return { canUse: true, missingFields: [] };

    const validation = checkProfileCompleteness(userProfile, "SAFE_ROUTING");
    return {
      canUse: validation.canUseFeature,
      missingFields: validation.missingFieldsForFeature,
    };
  }, [userProfile]);
  if (profileCheckRef.current !== profileCheck) {
    profileCheckRef.current = profileCheck;
  }
  // Determine if we should show the banner
  const showProfileBanner = React.useMemo(() => {
    if (profileCheck.canUse) return false;
    return shouldShowBanner(
      bannerState,
      APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES.ROUTING_INCOMPLETE
    );
  }, [profileCheck.canUse, dangerZonesVisible, bannerState]);
  if (showProfileBannerRef.current !== showProfileBanner) {
    showProfileBannerRef.current = showProfileBanner;
  }
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
    setSelectedLocationId(locationId);
    setModalVisible(true);
    // Check if this is a searchMarker (temporary new location)
    if (searchMarker && searchMarker.id === locationId) {
      // For searchMarkers, trigger ML with coordinates directly
      if (
        userProfile &&
        !mlPredictions[locationId] &&
        !mlPredictionsLoading[locationId]
      ) {
        dispatch(
          fetchMLPredictions({
            locationId: locationId,
            latitude: searchMarker.latitude,
            longitude: searchMarker.longitude,
          })
        );
      }
      return;
    }
    await dispatch(fetchLocationDetails(locationId));

    // NEW: Fetch ML prediction on-demand if needed
    const location = nearbyLocations.find(
      (loc: { id: string }) => loc.id === locationId
    );

    if (location && userProfile) {
      const hasActualReviews =
        location.review_count && location.review_count > 0;

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
    setSelectedGooglePlaceId(null);
    setSearchMarker(null);
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

  const handleMapPress = async (event: any) => {
    Keyboard.dismiss();

    // Clear selected marker and modal
    setSelectedLocationId(null);
    setSelectedGooglePlaceId(null);
    setModalVisible(false);
    dispatch({ type: "locations/clearSelectedLocation" });

    if (!requireAuth(userId, "add marker")) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;

    const addressData = await getCompleteAddressFromCoordinates(
      latitude,
      longitude
    );

    if (!addressData) {
      notify.error("Unable to get address for this location");
      return;
    }

    const newMarker = {
      id: `longpress-${Date.now()}`,
      name: addressData.address, // Use actual address as name
      address: addressData.address,
      latitude: latitude,
      longitude: longitude,
      place_type: "other",
      source: "mapbox" as const,
      // Store the full address data for later use
      city: addressData.city,
      state_province: addressData.state_province,
      country: addressData.country,
      postal_code: addressData.postal_code,
    };

    setSearchMarker(newMarker);
    // Immediately open modal with this new location
    setSelectedGooglePlaceId(newMarker.id);
    setModalVisible(true);

    // Trigger ML prediction for this location
    if (userProfile) {
      dispatch(
        fetchMLPredictions({
          locationId: newMarker.id,
          latitude: newMarker.latitude,
          longitude: newMarker.longitude,
        })
      );
    }
  };

  const handleToggleDangerZones = async () => {
    if (!requireAuth(userId, "view danger zones")) return;

    try {
      dispatch(toggleDangerZones());

      if (!dangerZonesVisible && userId && userProfile) {
        // ALWAYS fetch when turning on, even if we have zones
        // This ensures we get zones for the current map view

        const userRadiusMeters = userSearchRadiusKm * 1000;

        await dispatch(
          fetchDangerZones({
            userId: userId,
            latitude: region.latitude,
            longitude: region.longitude,
            radius: Math.min(userRadiusMeters, 100000),
            userDemographics: userProfile,
          })
        ).unwrap();
      }
    } catch (error) {
      logger.error("Danger zones error:", error);
      notify.error("Could not load danger zones");
      // Revert the toggle if fetch failed
      dispatch(setDangerZonesVisible(false));
    }
  };

  const handleRecenterToUserLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      dispatch(setUserLocation(newLocation));

      if (mapRef.current) {
        const newRegion = {
          ...newLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      logger.error("Failed to get current location:", error);
      notify.error("Could not get your location");
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
      logger.error("❌ Permission error - trying fallback:", error);

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

    // Build cumulative distances for each route point
    const pointDistances: number[] = [0];
    for (let i = 1; i < routePoints.length; i++) {
      const dist = calculateDistanceBetweenPoints(
        routePoints[i - 1],
        routePoints[i]
      );
      pointDistances.push(pointDistances[i - 1] + dist);
    }

    const totalDistance = pointDistances[pointDistances.length - 1];

    // Build segment boundaries based on segment distances
    const segmentBoundaries: number[] = [0];
    let cumDist = 0;
    for (const segment of segmentScores) {
      cumDist += segment.distance_meters;
      segmentBoundaries.push(Math.min(cumDist, totalDistance));
    }

    // Split route points into chunks based on boundaries
    const chunks: Array<Array<{ latitude: number; longitude: number }>> = [];

    for (let segIdx = 0; segIdx < segmentScores.length; segIdx++) {
      const segmentStart = segmentBoundaries[segIdx];
      const segmentEnd = segmentBoundaries[segIdx + 1] || totalDistance;

      const chunk: Array<{ latitude: number; longitude: number }> = [];

      for (let i = 0; i < routePoints.length; i++) {
        const pointDist = pointDistances[i];

        if (pointDist >= segmentStart && pointDist <= segmentEnd) {
          chunk.push(routePoints[i]);
        }

        if (pointDist > segmentEnd) break;
      }

      if (chunk.length >= 2) {
        chunks.push(chunk);
      }
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

    // During navigation, use the state-based polylines
    if (navigationActive && routePolylines.length > 0) {
      return routePolylines.map((polyline) => (
        <Polyline
          key={polyline.key}
          coordinates={polyline.coordinates}
          {...(Platform.OS === "ios"
            ? { strokeColors: [polyline.color] }
            : { strokeColor: polyline.color })}
          strokeWidth={APP_CONFIG.ROUTE_DISPLAY.LINE_WIDTH.SELECTED}
        />
      ));
    }

    // Non-navigation mode: show static colored segments
    const segmentChunks = splitRouteIntoSegments(
      route.route_points,
      route.safety_analysis.segment_scores
    );

    return route.safety_analysis.segment_scores.map(
      (segment: any, index: number) => {
        if (!segmentChunks[index] || segmentChunks[index].length < 2) {
          return null;
        }

        const safetyColor =
          (segment.safety_score || segment.overall_score) >=
          APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD
            ? APP_CONFIG.ROUTE_DISPLAY.COLORS.SAFE_ROUTE
            : (segment.safety_score || segment.overall_score) >=
              APP_CONFIG.ROUTE_PLANNING.MIXED_ROUTE_THRESHOLD
            ? APP_CONFIG.ROUTE_DISPLAY.COLORS.MIXED_ROUTE
            : APP_CONFIG.ROUTE_DISPLAY.COLORS.UNSAFE_ROUTE;

        return (
          <Polyline
            key={`segment-${index}`}
            coordinates={segmentChunks[index]}
            {...(Platform.OS === "ios"
              ? { strokeColors: [safetyColor] }
              : { strokeColor: safetyColor })}
            strokeWidth={APP_CONFIG.ROUTE_DISPLAY.LINE_WIDTH.SELECTED}
          />
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
    if (
      userId &&
      userLocation &&
      mapRef.current &&
      mapReady &&
      !hasInitiallyRecentered
    ) {
      // Small delay to ensure map is fully rendered
      setTimeout(() => {
        handleRecenterToUserLocation();
        setHasInitiallyRecentered(true);
      }, 750);
    }
  }, [userId, userLocation, mapReady, hasInitiallyRecentered]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocationUpdates = async () => {
      if (!locationPermission) return;

      try {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (location) => {
            dispatch(
              setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              })
            );
          }
        );
      } catch (error) {
        logger.error("Location watcher error:", error);
      }
    };

    startLocationUpdates();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationPermission, dispatch]);

  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.openLocationId && params.refresh) {
      // Open the location details modal with the real ID
      const locationId = params.openLocationId as string;

      setSelectedLocationId(locationId);
      setSearchMarker(null);
      setModalVisible(true);

      dispatch(fetchLocationDetails(locationId));
    }
  }, [params.openLocationId, params.refresh]);

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

  const requestedPredictions = useRef<Set<string>>(new Set());

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
          if (
            !hasReviews &&
            !hasPrediction &&
            !isLoading &&
            !requestedPredictions.current.has(location.id)
          ) {
            requestedPredictions.current.add(location.id);
            dispatch(fetchMLPredictions(location.id));
          }
        }
      );
    }
  }, [nearbyLocations, userProfile, dispatch]);

  // Initialize display preferences on first load based on user country
  useEffect(() => {
    const initializePreferences = async () => {
      if (!userProfile || !userId) return;

      const prefs: NotificationPreferences =
        userProfile.notification_preferences || {};

      // Check if preferences are already set
      if (prefs.time_format && prefs.distance_unit) {
        return; // Already initialized
      }

      // Get user country (from Redux state)
      const state = store.getState();
      const userCountryCode = state.locations.userCountry;
      // Get defaults based on country
      const defaults = getDefaultPreferences(userCountryCode);

      // Initialize missing preferences
      const updatedPrefs: NotificationPreferences = {
        ...prefs,
        time_format: prefs.time_format ?? defaults.time_format,
        distance_unit: prefs.distance_unit ?? defaults.distance_unit,
      };

      // Save to database (async, don't wait)
      dispatch(
        updateUserProfile({
          userId,
          profileData: { notification_preferences: updatedPrefs },
        })
      ).catch((error) => {
        logger.error("Failed to initialize display preferences:", error);
      });
    };

    initializePreferences();
  }, [userProfile, userId, dispatch]);

  useEffect(() => {
    if (
      navigationIntent?.action === "view_location" &&
      navigationIntent.data?.route
    ) {
      const historyRoute = navigationIntent.data.route as RouteHistoryItem;

      // Convert RouteHistoryItem to SafeRoute format
      const safeRoute: SafeRoute = {
        id: `history_${historyRoute.id}`,
        name: `${historyRoute.origin_name} → ${historyRoute.destination_name}`,
        route_type: "balanced",
        coordinates: historyRoute.route_coordinates,
        route_points: historyRoute.route_coordinates,
        steps: historyRoute.steps || undefined,
        estimated_duration_minutes: historyRoute.duration_minutes,
        distance_kilometers: historyRoute.distance_km,
        safety_analysis: {
          confidence_score: null,
          overall_route_score: historyRoute.safety_score || 3.0,
          safety_notes: ["Route loaded from history"],
        },
        created_at: historyRoute.created_at,
        databaseId: historyRoute.id,
      };

      dispatch(setSelectedRoute(safeRoute));
      dispatch(clearNavigationIntent());

      // Center map on route
      if (mapRef.current && historyRoute.route_coordinates.length > 0) {
        mapRef.current.fitToCoordinates(historyRoute.route_coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }
    }
  }, [navigationIntent]);
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
  // Refresh modal when returning from review screen
  useFocusEffect(
    useCallback(() => {
      if (modalVisible && selectedLocationId && searchMarker) {
        // Check if this was a temp location that now exists in DB
        const refreshModalData = async () => {
          try {
            // Search for location by coordinates
            const { data, error } = await supabase.rpc("get_nearby_locations", {
              lat: searchMarker.latitude,
              lng: searchMarker.longitude,
              radius_meters: 10, // Very small radius to find exact match
            });

            if (!error && data && data.length > 0) {
              // Found a real location at these coordinates
              const realLocation = data[0];

              // Update to use real location ID
              setSelectedLocationId(realLocation.id);
              setSearchMarker(null); // Clear temp marker

              // Fetch the real location details
              await dispatch(fetchLocationDetails(realLocation.id));
            }
          } catch (err) {
            logger.error("Error refreshing modal:", err);
          }
        };

        refreshModalData();
      }
    }, [modalVisible, selectedLocationId, searchMarker])
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

  if (loading && nearbyLocations.length === 0 && !mapReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading nearby locations...</Text>
      </View>
    );
  }
  if (!userLocation) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }
  if (!isAppReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text>Initializing SafePath...</Text>
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
        mapType="standard"
        zoomEnabled={true}
        showsPointsOfInterest={true}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={!navigationActive}
        showsMyLocationButton={false}
        showsCompass={true}
        onTouchStart={() => Keyboard.dismiss()}
        onLongPress={handleMapPress}
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

            // Calculate radius based on user preference
            let fetchRadius: number;

            if (userSearchRadiusKm >= 999999) {
              // Infinite search - use a very large radius
              fetchRadius = 999999000; // 999,999 km in meters
            } else {
              // Use user's preferred radius (convert km to meters)
              fetchRadius = userSearchRadiusKm * 1000;
            }

            dispatch(
              fetchNearbyLocations({
                latitude: newRegion.latitude,
                longitude: newRegion.longitude,
                radius: fetchRadius,
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
              handleMarkerPress(searchMarker.id);
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
        {/* Navigation Arrow */}
        {navigationActive && navigationPosition && (
          <Marker
            coordinate={navigationPosition}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={navigationPosition.heading || 0}
            tracksViewChanges={true}
          >
            <NavigationArrow size={60} color={theme.colors.primary} />
          </Marker>
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
                  {...(Platform.OS === "ios"
                    ? {
                        strokeColors: [getRouteLineColor(selectedRoute)],
                      }
                    : {
                        strokeColor: getRouteLineColor(selectedRoute),
                      })}
                  strokeWidth={APP_CONFIG.ROUTE_DISPLAY.LINE_WIDTH.SELECTED}
                />
              </>
            )}
            {/* Show colored segments */}
            {navigationActive ? (
              selectedRoute.safety_analysis?.segment_scores ? (
                renderRouteSegments(selectedRoute, true)
              ) : (
                <Polyline
                  coordinates={
                    selectedRoute.route_points || selectedRoute.coordinates
                  }
                  {...(Platform.OS === "ios"
                    ? { strokeColors: [getRouteLineColor(selectedRoute)] }
                    : { strokeColor: getRouteLineColor(selectedRoute) })}
                  strokeWidth={APP_CONFIG.ROUTE_DISPLAY.LINE_WIDTH.SELECTED}
                />
              )
            ) : (
              showRouteSegments && renderRouteSegments(selectedRoute)
            )}
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
                {...(Platform.OS === "ios"
                  ? {
                      strokeColors: [
                        APP_CONFIG.ROUTE_DISPLAY.COLORS.ALTERNATIVE_ROUTE,
                      ],
                    }
                  : {
                      strokeColor:
                        APP_CONFIG.ROUTE_DISPLAY.COLORS.ALTERNATIVE_ROUTE,
                    })}
                strokeWidth={APP_CONFIG.ROUTE_DISPLAY.LINE_WIDTH.ALTERNATIVE}
                lineDashPattern={[10, 5]}
              />
            )
          )}
      </MapView>
      {/* Map Controls */}
      {/* Recenter to My Location Button */}
      <View
        style={[
          styles.recenterButtonContainer,
          { bottom: navigationActive ? 210 : 10 },
        ]}
      >
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={handleRecenterToUserLocation}
        >
          <Ionicons name="locate" size={30} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      {/* Danger Zones Control */}
      <View
        style={[
          styles.dangerZoneContainer,
          { bottom: navigationActive ? 50 : -20 }, // ✅ Dynamic
        ]}
      >
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
                : theme.colors.error
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
        <View style={styles.routeActionButtons}>
          <TouchableOpacity
            style={styles.clearRouteButton}
            onPress={() => {
              dispatch(clearRoutes());
              setRouteOrigin(null);
              setRouteDestination(null);
              setMapKey((prev) => prev + 1);
            }}
          >
            <Ionicons
              name="close-circle-outline"
              size={22}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.clearRouteText}>Clear Route</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteRouteButton}
            onPress={() => {
              notify.confirm(
                "Delete this route from your history?",
                "This cannot be undone.",
                [
                  { text: "Cancel", style: "cancel", onPress: () => {} },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      if (selectedRoute.databaseId) {
                        dispatch(
                          deleteRouteFromHistory(selectedRoute.databaseId)
                        );
                      }
                      dispatch(clearRoutes());
                      setRouteOrigin(null);
                      setRouteDestination(null);
                      setMapKey((prev) => prev + 1);
                    },
                  },
                ],
                "warning"
              );
            }}
          >
            <Ionicons
              name="trash-outline"
              size={22}
              color={theme.colors.error}
            />
            <Text style={styles.deleteRouteText}>Delete from History</Text>
          </TouchableOpacity>
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
      {dangerZonesVisible && !dangerZonesLoading && (
        <View
          style={[
            styles.dangerZoneLegend,
            { bottom: navigationActive ? 120 : 140 },
          ]}
        >
          {dangerZones.length > 0 ? (
            <>
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
            </>
          ) : (
            <>
              <Text style={styles.legendTitle}>✓ No Danger Zones</Text>
              <Text style={styles.legendSubtitle}>
                No reported danger in this area
              </Text>
            </>
          )}
        </View>
      )}
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
                {formatDuration(selectedRoute.estimated_duration_minutes)}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDistance(
                  selectedRoute.safety_analysis?.total_distance_meters ??
                    selectedRoute.distance_kilometers * 1000,
                  distanceUnit
                )}
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
      {modalVisible && (
        <LocationDetailsModal
          visible={modalVisible}
          locationId={selectedLocationId}
          googlePlaceId={selectedGooglePlaceId}
          searchMarker={searchMarker}
          onClose={handleModalClose}
        />
      )}
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
    elevation: 20,
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
    elevation: 10,
  },
  closeSearchButton: {
    marginLeft: 12,
    padding: 12,
    zIndex: 1000,
    elevation: 10,
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
    bottom: 0,
    right: 20,
    zIndex: 1000,
    elevation: 10,
  },
  recenterButtonContainer: {
    position: "absolute",
    right: 10,
    zIndex: 10001,
    elevation: 10,
  },
  recenterButton: {
    width: 55,
    height: 55,
    borderRadius: 100,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  dangerZoneContainer: {
    position: "absolute",
    right: 0,
    zIndex: 1000,
    elevation: 10,
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
    left: 20,
    backgroundColor: theme.colors.card,
    padding: 12,
    borderRadius: 8,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
    elevation: 8,
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
    elevation: 10,
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
  routeActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    gap: 16,
  },
  clearRouteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clearRouteText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: "500",
  },
  deleteRouteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deleteRouteText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: "500",
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
    zIndex: 1000,
    elevation: 10,
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
  navigationArrow: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
