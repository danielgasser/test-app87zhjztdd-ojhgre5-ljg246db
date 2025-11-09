import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import MapView from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  endNavigation,
  updateNavigationProgress,
  checkForReroute,
  startNavigationSession,
  endNavigationSession,
  SafetyAlertHandled,
} from "@/store/locationsSlice";
import { useRealtimeReviews } from "@/hooks/useRealtimeReviews";
import { theme } from "@/styles/theme";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { supabase } from "@/services/supabase";
import { store } from "@/store";
import { calculateDistance, formatDistance } from "@/utils/distanceHelpers";
import { formatDuration, formatArrivalTime } from "@/utils/timeHelpers";
import { useUserPreferences } from "@/hooks/useUserPreferences";
const { width, height } = Dimensions.get("window");

interface NavigationModeProps {
  onExit: () => void;
  mapRef: React.RefObject<MapView | null>;
}

const NavigationMode: React.FC<NavigationModeProps> = ({ onExit, mapRef }) => {
  useRealtimeReviews();
  const { timeFormat, distanceUnit } = useUserPreferences();

  const dispatch = useAppDispatch();
  const { communityReviews } = useAppSelector((state) => state.locations);

  const {
    selectedRoute,
    currentNavigationStep,
    userLocation,
    navigationActive,
    isRerouting,
  } = useAppSelector((state) => state.locations);
  const routeRequest = useAppSelector((state) => state.locations.routeRequest);

  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
    heading?: number;
  } | null>(userLocation);

  const [distanceToNextTurn, setDistanceToNextTurn] = useState<number>(0);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);

  const alertShownRef = useRef(false);
  const unhandledDangersRef = useRef<any[]>([]);
  // Check if this review has already been handled in this navigation session
  const checkIfAlertAlreadyHandled = async (
    reviewId: string
  ): Promise<boolean> => {
    if (!selectedRoute?.databaseId || !selectedRoute?.navigationSessionId) {
      return false;
    }

    try {
      // Query all routes in this navigation session
      const { data: sessionRoutes, error } = await supabase
        .from("routes")
        .select("safety_alerts_handled")
        .eq("navigation_session_id", selectedRoute.navigationSessionId);

      if (error) {
        logger.error("Error checking handled alerts:", error);
        return false;
      }

      // Check if any route in this session has handled this review
      for (const route of sessionRoutes || []) {
        const alerts = route.safety_alerts_handled as
          | SafetyAlertHandled[]
          | null;
        const handled = alerts?.some(
          (alert: SafetyAlertHandled) => alert.review_id === reviewId
        );
        if (handled) {
          logger.info(`✅ Review ${reviewId} already handled in this session`);
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error("Error in checkIfAlertAlreadyHandled:", error);
      return false;
    }
  };

  const remainingDistance = useMemo(() => {
    if (
      !selectedRoute?.steps ||
      currentNavigationStep === null ||
      !currentPosition
    ) {
      return selectedRoute?.distance_kilometers
        ? selectedRoute.distance_kilometers * 1000
        : 0;
    }

    let remaining = 0;

    // 1. Distance from current position to end of current step
    const currentStep = selectedRoute.steps[currentNavigationStep];
    if (currentStep) {
      remaining += calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        currentStep.end_location.latitude,
        currentStep.end_location.longitude
      );
    }

    // 2. Add all remaining steps after current
    for (
      let i = currentNavigationStep + 1;
      i < selectedRoute.steps.length;
      i++
    ) {
      remaining += selectedRoute.steps[i].distance_meters;
    }

    return remaining; // Already in meters
  }, [selectedRoute, currentNavigationStep, currentPosition]);

  const remainingMinutes = useMemo(() => {
    if (!selectedRoute?.steps || currentNavigationStep === null) {
      return selectedRoute?.estimated_duration_minutes || 0;
    }

    // Sum duration of remaining steps
    let remaining = 0;
    for (let i = currentNavigationStep; i < selectedRoute.steps.length; i++) {
      remaining += selectedRoute.steps[i].duration_seconds;
    }

    return Math.round(remaining / 60); // Convert to minutes
  }, [selectedRoute, currentNavigationStep]);

  // Record that a safety alert was handled by the user
  const recordSafetyAlertHandled = async (
    routeId: string,
    review: any,
    action: "reroute_attempted" | "user_continued"
  ) => {
    try {
      // Get current alerts for this route
      const { data: route, error: fetchError } = await supabase
        .from("routes")
        .select("safety_alerts_handled")
        .eq("id", routeId)
        .single();

      if (fetchError) {
        logger.error("Error fetching route alerts:", fetchError);
        return;
      }

      const existingAlerts =
        (route?.safety_alerts_handled as unknown as SafetyAlertHandled[]) || [];

      // Add new alert record
      const { error: updateError } = await supabase
        .from("routes")
        .update({
          safety_alerts_handled: [
            ...existingAlerts,
            {
              review_id: review.id,
              handled_at: new Date().toISOString(),
              action,
              review_location: {
                lat: review.location_latitude,
                lng: review.location_longitude,
              },
              review_safety_rating: review.safety_rating,
            },
          ],
        })
        .eq("id", routeId);

      if (updateError) {
        logger.error("Error updating route alerts:", updateError);
      } else {
        logger.info(`✅ Recorded ${action} for review ${review.id}`);
      }
    } catch (error) {
      logger.error("Error in recordSafetyAlertHandled:", error);
    }
  };

  // Add this useEffect to calculate initial distance
  useEffect(() => {
    if (
      navigationActive &&
      currentPosition &&
      selectedRoute?.steps &&
      currentNavigationStep !== null
    ) {
      const currentStep = selectedRoute.steps[currentNavigationStep];
      if (currentStep) {
        const initialDistance = calculateDistance(
          currentPosition.latitude,
          currentPosition.longitude,
          currentStep.end_location.latitude,
          currentStep.end_location.longitude
        );
        setDistanceToNextTurn(initialDistance);
      }
    }
  }, [navigationActive, currentPosition, selectedRoute, currentNavigationStep]);

  // Start GPS tracking
  useEffect(() => {
    const initNavigation = async () => {
      // Update database timestamp
      if (selectedRoute?.databaseId) {
        await dispatch(startNavigationSession(selectedRoute.databaseId));
      }
      // Start GPS tracking
      startNavigation();
    };

    initNavigation();

    return () => {
      stopNavigation(); // Stop GPS tracking
    };
  }, []);

  useEffect(() => {
    // SMART CHECK: Only alert if dangerous review is ON our route
    if (
      !selectedRoute ||
      !currentPosition ||
      !communityReviews ||
      isRerouting
    ) {
      return;
    }
    const checkReviewsAlongRoute = async () => {
      // Get ALL dangerous reviews (not just recent ones)
      const navigationStartTime = selectedRoute.created_at; // When route was created

      // Get dangerous reviews posted AFTER navigation started
      const dangerousReviews = communityReviews.filter((review) => {
        // Only alert on reviews posted AFTER navigation started
        const reviewTime = new Date(review.created_at).getTime();
        const navStartTime = new Date(navigationStartTime).getTime();

        return review.safety_rating < 3.0 && reviewTime > navStartTime;
      });

      if (dangerousReviews.length === 0) return;

      // Check if ANY dangerous review is within 500m of our route
      const dangerOnRoute = dangerousReviews.filter((review) => {
        // Check distance to any point on our route
        const isNearRoute = (
          selectedRoute.route_points || selectedRoute.coordinates
        )?.some((routePoint) => {
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

      // 🆕 Filter out already-dismissed alerts for this route
      const unhandledDangers = [];

      try {
        for (const review of dangerOnRoute) {
          const alreadyHandled = await checkIfAlertAlreadyHandled(review.id);
          if (!alreadyHandled) {
            unhandledDangers.push(review);
          }
        }
      } catch (error) {
        console.error("❌ Error checking alerts:", error);
      }
      unhandledDangersRef.current = unhandledDangers;

      if (unhandledDangers.length > 0) {
        if (alertShownRef.current) {
          return;
        }
        alertShownRef.current = true;

        const locationNames = unhandledDangers
          .map((r) => r.location_name)
          .join(", ");

        // Store review IDs for dismissal tracking
        const reviewIds = unhandledDangers.map((r) => r.id);

        notify.confirm(
          "⚠️ SAFETY ALERT ON YOUR ROUTE",
          `Your route passes through areas with safety concerns: ${locationNames}\n\nWould you like to find a safer route?`,
          [
            {
              text: "Find Safer Route",
              onPress: async () => {
                const fullState = store.getState();

                alertShownRef.current = false;
                const currentRouteId = selectedRoute?.databaseId;
                // Record the action for all dangerous reviews
                if (currentRouteId) {
                  for (const review of unhandledDangersRef.current) {
                    await recordSafetyAlertHandled(
                      currentRouteId,
                      review,
                      "reroute_attempted"
                    );
                  }
                }

                // Then trigger reroute
                if (currentPosition) {
                  dispatch(checkForReroute(currentPosition));
                }
              },
            },
            {
              text: "Continue Anyway",
              style: "cancel",
              onPress: async () => {
                alertShownRef.current = false;

                // Record that user chose to continue
                if (selectedRoute?.databaseId) {
                  for (const review of unhandledDangersRef.current) {
                    await recordSafetyAlertHandled(
                      selectedRoute.databaseId,
                      review,
                      "user_continued"
                    );
                  }
                }
              },
            },
          ]
        );
      } else {
        alertShownRef.current = false;
      }
    };

    checkReviewsAlongRoute();
  }, [communityReviews, selectedRoute, currentPosition, dispatch, isRerouting]);

  useEffect(() => {
    // Force map refresh every 30 seconds if position hasn't changed
    const interval = setInterval(() => {
      if (mapRef?.current && currentPosition) {
        mapRef.current.animateToRegion(
          {
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          300
        );
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentPosition]);

  const startNavigation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        notify.error(
          "Location permission is required for navigation",
          "Permission needed"
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
          if (mapRef?.current) {
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
          // Calculate distance to next turn
          if (selectedRoute && currentNavigationStep !== null) {
            if (
              selectedRoute.steps &&
              currentNavigationStep < selectedRoute.steps.length
            ) {
              const currentStep = selectedRoute.steps[currentNavigationStep]; // ← CURRENT step
              const distance = calculateDistance(
                newPosition.latitude,
                newPosition.longitude,
                currentStep.end_location.latitude, // ← Distance to CURRENT step's end
                currentStep.end_location.longitude
              );
              setDistanceToNextTurn(distance);

              // Check if we reached the turn (within 20m of CURRENT step's end)
              if (distance < 20) {
                const nextStepIndex = currentNavigationStep + 1;
                if (nextStepIndex < selectedRoute.steps.length) {
                  dispatch(updateNavigationProgress(nextStepIndex));
                }
              }
            }
          }
        }
      );

      setLocationSubscription(subscription);
    } catch (error) {
      logger.error("Navigation start error:", error);
      notify.error("Could not start navigation");
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

  const handleEndNavigation = async () => {
    // Update database timestamp
    if (selectedRoute?.databaseId) {
      await dispatch(endNavigationSession(selectedRoute.databaseId));
    }

    // Redux state cleanup
    dispatch(endNavigation());
    // Component cleanup
    onExit();
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

  const debugInfo = {
    hasRoute: !!selectedRoute,
    hasSteps: !!selectedRoute?.steps,
    stepsLength: selectedRoute?.steps?.length || 0,
    currentStep: currentNavigationStep,
    hasCurrentStepData: !!selectedRoute?.steps?.[currentNavigationStep || 0],
    distanceToTurn: distanceToNextTurn,
    hasPosition: !!currentPosition,
  };

  return (
    <>
      {/* Top instruction panel */}
      <View style={styles.instructionPanel}>
        <View style={styles.distanceContainer}>
          <Text style={styles.distanceText}>
            {formatDistance(distanceToNextTurn, distanceUnit)}
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
      {/* 🚨 TEMPORARY DEBUG - REMOVE AFTER TESTING */}
      <View
        style={{
          position: "absolute",
          top: 180,
          left: 20,
          right: 20,
          backgroundColor: "rgba(255,0,0,0.8)",
          padding: 10,
          borderRadius: 8,
          zIndex: 10001,
        }}
      >
        <Text style={{ color: "white", fontSize: 10, fontFamily: "monospace" }}>
          DEBUG INFO:{"\n"}
          hasRoute: {String(debugInfo.hasRoute)}
          {"\n"}
          hasSteps: {String(debugInfo.hasSteps)}
          {"\n"}
          stepsLength: {debugInfo.stepsLength}
          {"\n"}
          currentStep: {String(debugInfo.currentStep)}
          {"\n"}
          hasStepData: {String(debugInfo.hasCurrentStepData)}
          {"\n"}
          distanceToTurn: {debugInfo.distanceToTurn.toFixed(0)}m{"\n"}
          hasPosition: {String(debugInfo.hasPosition)}
        </Text>
      </View>
      {/* Bottom controls */}
      <View style={styles.controls}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>ETA</Text>
            <Text style={styles.statValue}>
              {formatDuration(remainingMinutes)}
            </Text>
            <Text style={styles.statLabel}>Arrival</Text>
            <Text style={styles.statValue}>
              {formatArrivalTime(remainingMinutes, timeFormat === "24h")}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>
              {formatDistance(remainingDistance, distanceUnit)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Safety</Text>
            <Text style={styles.statValue}>
              {selectedRoute.safety_analysis?.overall_route_score.toFixed(1)}
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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructionPanel: {
    position: "absolute",
    top: 4,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 10,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 10000,
    elevation: 8,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.card,
    marginRight: 12,
  },
  instructionTextContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.3)",
    paddingTop: 6,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.card,
    marginBottom: 2,
  },
  nextInstructionText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },
  controls: {
    position: "absolute",
    bottom: 10,
    left: 20,
    right: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  endButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    padding: 10,
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
    marginLeft: 6,
  },
});

export default NavigationMode;
