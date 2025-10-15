import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  endNavigation,
  updateNavigationProgress,
  checkForReroute,
  startNavigation,
} from "@/store/locationsSlice";
import { useRealtimeReviews } from "@/hooks/useRealtimeReviews";
import { theme } from "@/styles/theme";

const { width, height } = Dimensions.get("window");

interface NavigationModeProps {
  onExit: () => void;
}

const NavigationMode: React.FC<NavigationModeProps> = ({ onExit }) => {
  useRealtimeReviews(); // This already listens for new reviews!

  const dispatch = useAppDispatch();
  const mapRef = useRef<MapView>(null);
  const { communityReviews } = useAppSelector((state) => state.locations);

  const {
    selectedRoute,
    currentNavigationStep,
    userLocation,
    navigationActive,
  } = useAppSelector((state) => state.locations);

  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
    heading?: number;
  } | null>(userLocation);

  const [distanceToNextTurn, setDistanceToNextTurn] = useState<number>(0);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);

  // Start GPS tracking
  useEffect(() => {
    startNavigation();
    return () => {
      stopNavigation();
    };
  }, []);

  useEffect(() => {
    // SMART CHECK: Only alert if dangerous review is ON our route
    if (!selectedRoute || !currentPosition || !communityReviews) return;

    const checkReviewsAlongRoute = () => {
      // Get reviews from last 10 minutes with low safety ratings
      const recentDangerousReviews = communityReviews.filter((review) => {
        const reviewTime = new Date(review.created_at).getTime();
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        return reviewTime > tenMinutesAgo && review.safety_rating < 3.0;
      });

      if (recentDangerousReviews.length === 0) return;

      // Check if ANY dangerous review is within 500m of our route
      const dangerOnRoute = recentDangerousReviews.filter((review) => {
        // Check distance to any point on our route
        const isNearRoute = selectedRoute.coordinates.some((routePoint) => {
          const distance = calculateDistance(
            routePoint.latitude,
            routePoint.longitude,
            review.location_latitude,
            review.location_longitude
          );
          return distance < 500; // Within 500 meters of route
        });
        return isNearRoute;
      });

      if (dangerOnRoute.length > 0) {
        const locationNames = dangerOnRoute
          .map((r) => r.location_name)
          .join(", ");

        Alert.alert(
          "⚠️ SAFETY ALERT ON YOUR ROUTE",
          `Safety concern just reported at: ${locationNames}\n\nWould you like to find a safer route?`,
          [
            {
              text: "Find Safer Route",
              onPress: () => {
                if (currentPosition) {
                  dispatch(checkForReroute(currentPosition));
                }
              },
            },
            {
              text: "Continue Anyway",
              style: "cancel",
            },
          ]
        );
      }
    };

    checkReviewsAlongRoute();
  }, [communityReviews, selectedRoute, currentPosition, dispatch]);

  const startNavigation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Location permission is required for navigation"
        );
        onExit();
        return;
      }

      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 5, // Or every 5 meters
        },
        (location) => {
          const newPosition = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading || undefined,
          };

          setCurrentPosition(newPosition);

          // Update map camera to follow user
          if (mapRef.current) {
            mapRef.current.animateCamera(
              {
                center: newPosition,
                heading: location.coords.heading || 0,
                pitch: 60, // 3D view
                zoom: 18,
              },
              { duration: 500 }
            );
          }

          // Calculate distance to next turn
          if (selectedRoute && currentNavigationStep !== null) {
            const nextStepIndex = currentNavigationStep + 1;
            if (
              selectedRoute.steps &&
              nextStepIndex < selectedRoute.steps.length
            ) {
              const nextStep = selectedRoute.steps[nextStepIndex];
              const distance = calculateDistance(
                newPosition.latitude,
                newPosition.longitude,
                nextStep.end_location.latitude,
                nextStep.end_location.longitude
              );
              setDistanceToNextTurn(distance);

              // Check if we reached the turn
              if (distance < 20) {
                // Within 20 meters
                dispatch(updateNavigationProgress(nextStepIndex));
              }

              // Check if user deviated from route
              checkDeviation(newPosition);
            }
          }
        }
      );

      setLocationSubscription(subscription);
    } catch (error) {
      console.error("Navigation start error:", error);
      Alert.alert("Error", "Could not start navigation");
      onExit();
    }
  };

  const stopNavigation = () => {
    if (locationSubscription) {
      locationSubscription.remove();
    }
  };

  const checkDeviation = (position: {
    latitude: number;
    longitude: number;
  }) => {
    // Check if user is more than 50m from route
    // Simple check - can be improved
    if (selectedRoute?.route_points && selectedRoute.route_points.length > 0) {
      const closestPoint = findClosestPointOnRoute(
        position,
        selectedRoute.route_points
      );
      const distance = calculateDistance(
        position.latitude,
        position.longitude,
        closestPoint.latitude,
        closestPoint.longitude
      );

      // If more than 50m off route, trigger reroute
      if (distance > 50) {
        dispatch(checkForReroute(position));
      }
    }
  };

  const findClosestPointOnRoute = (
    position: { latitude: number; longitude: number },
    routePoints: Array<{ latitude: number; longitude: number }>
  ) => {
    let closestPoint = routePoints[0];
    let minDistance = Infinity;

    routePoints.forEach((point) => {
      const distance = calculateDistance(
        position.latitude,
        position.longitude,
        point.latitude,
        point.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });

    return closestPoint;
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const handleEndNavigation = () => {
    Alert.alert("End Navigation", "Are you sure you want to stop navigation?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: () => {
          dispatch(endNavigation());
          onExit();
        },
      },
    ]);
  };

  if (!selectedRoute || !currentPosition) {
    return (
      <View style={styles.container}>
        <Text>Loading navigation...</Text>
      </View>
    );
  }

  const currentInstruction = (() => {
    if (
      selectedRoute.steps &&
      selectedRoute.steps[currentNavigationStep || 0]
    ) {
      return selectedRoute.steps[currentNavigationStep || 0].instruction;
    }
    // Fallback: simple instruction based on progress
    if (distanceToNextTurn < 100) {
      return "Continue ahead";
    }
    return "Follow the route";
  })();

  const nextInstruction = (() => {
    const nextStepIndex = (currentNavigationStep || 0) + 1;
    if (selectedRoute.steps && selectedRoute.steps[nextStepIndex]) {
      return selectedRoute.steps[nextStepIndex].instruction;
    }
    return null;
  })();
  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={false} // We'll draw custom marker
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        {/* Route polyline */}
        {selectedRoute.route_points && (
          <Polyline
            coordinates={selectedRoute.route_points}
            strokeColor={theme.colors.primary}
            strokeWidth={5}
          />
        )}

        {/* User position marker */}
        <Marker
          coordinate={currentPosition}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
          rotation={currentPosition.heading || 0}
        >
          <View style={styles.userMarker}>
            <Ionicons name="navigate" size={30} color={theme.colors.primary} />
          </View>
        </Marker>
      </MapView>

      {/* Top instruction panel */}
      <View style={styles.instructionPanel}>
        <View style={styles.distanceContainer}>
          <Text style={styles.distanceText}>
            {formatDistance(distanceToNextTurn)}
          </Text>
          <Ionicons name="arrow-up" size={60} color={theme.colors.card} />
        </View>

        <View style={styles.instructionTextContainer}>
          <Text style={styles.instructionText}>{currentInstruction}</Text>
          {nextInstruction && (
            <Text style={styles.nextInstructionText}>
              Then: {nextInstruction}
            </Text>
          )}
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.controls}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>ETA</Text>
            <Text style={styles.statValue}>
              {selectedRoute.estimated_duration_minutes}min
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>
              {formatDistance(selectedRoute.distance_kilometers * 1000)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Safety</Text>
            <Text style={styles.statValue}>
              {selectedRoute.safety_analysis.overall_route_score.toFixed(1)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndNavigation}
        >
          <Ionicons name="close-circle" size={24} color={theme.colors.card} />
          <Text style={styles.endButtonText}>End Navigation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width,
    height,
  },
  instructionPanel: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 20,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  distanceText: {
    fontSize: 48,
    fontWeight: "bold",
    color: theme.colors.card,
    marginRight: 16,
  },
  instructionTextContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.3)",
    paddingTop: 12,
  },
  instructionText: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.card,
    marginBottom: 4,
  },
  nextInstructionText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  endButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  endButtonText: {
    color: theme.colors.card,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default NavigationMode;
