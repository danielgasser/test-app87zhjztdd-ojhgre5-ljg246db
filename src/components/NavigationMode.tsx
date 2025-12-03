import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  AppState,
  AppStateStatus,
} from "react-native";
import MapView from "react-native-maps";
import { Marker } from "react-native-maps";

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
  setNavigationPosition,
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

// Only for testing/logging purposes
import { navLog, navLogEvents } from "@/utils/navigationLogger";

const { width, height } = Dimensions.get("window");

interface NavigationModeProps {
  onExit: () => void;
  mapRef: React.RefObject<MapView | null>;
}

const getManeuverIcon = (maneuver?: string): string => {
  switch (maneuver) {
    case "turn-left":
      return "arrow-back";
    case "turn-right":
      return "arrow-forward";
    case "turn-slight-left":
      return "arrow-back-outline";
    case "turn-slight-right":
      return "arrow-forward-outline";
    case "turn-sharp-left":
      return "return-down-back";
    case "turn-sharp-right":
      return "return-down-forward";
    case "uturn-left":
    case "uturn-right":
      return "return-up-back";
    case "roundabout-left":
    case "roundabout-right":
      return "sync-circle";
    case "ramp-left":
    case "fork-left":
      return "arrow-back-outline";
    case "ramp-right":
    case "fork-right":
      return "arrow-forward-outline";
    case "merge":
      return "git-merge";
    case "straight":
    default:
      return "arrow-up";
  }
};

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
  const [showInstructionText, setShowInstructionText] = useState(false);

  const alertShownRef = useRef(false);
  const unhandledDangersRef = useRef<any[]>([]);
  const positionUpdatesCount = useRef(0);
  const lastAdvancedStep = useRef<number>(-1);
  const lastRerouteTime = useRef<number>(0);
  const appStateRef = useRef(AppState.currentState);

  const [showDebug, setShowDebug] = useState(false);

  // Round distance based on proximity
  const roundDistance = (meters: number): number => {
    if (meters > 1000) return Math.round(meters / 100) * 100; // Round to 100m
    if (meters > 200) return Math.round(meters / 50) * 50; // Round to 50m
    if (meters > 50) return Math.round(meters / 10) * 10; // Round to 10m
    return Math.round(meters); // Exact when very close
  };

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
      }
    } catch (error) {
      logger.error("Error in recordSafetyAlertHandled:", error);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          // App came to foreground - reset position counter to skip first updates
          positionUpdatesCount.current = 0;
          navLogEvents.appStateChange("resumed");
        }
        appStateRef.current = nextAppState;
      }
    );

    return () => subscription.remove();
  }, []);

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
        const roundedInitial = roundDistance(initialDistance);
        setDistanceToNextTurn(roundedInitial);
      }
    }
  }, [navigationActive, currentPosition, selectedRoute, currentNavigationStep]);

  // Start GPS tracking
  useEffect(() => {
    const initNavigation = async () => {
      // Update database timestamp
      await navLog.startSession();
      console.log(
        "[NavLog] selectedRoute:",
        selectedRoute?.name,
        selectedRoute?.distance_kilometers
      );

      navLogEvents.navigationStarted(
        selectedRoute?.name || "Route",
        selectedRoute?.distance_kilometers || 0
      );
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

  // Background token refresh during navigation
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      try {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn("[Navigation] Token refresh failed:", error.message);
        } else {
          console.log("[Navigation] Token refreshed");
        }
      } catch (e) {
        console.warn("[Navigation] Token refresh error:", e);
      }
    }, 30 * 60 * 1000); // Every 30 minutes

    return () => clearInterval(refreshInterval);
  }, []);

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
          dispatch(setNavigationPosition(newPosition));
          checkDeviation(newPosition);
          navLogEvents.positionUpdate(
            newPosition.latitude,
            newPosition.longitude,
            newPosition.heading
          );
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
              const roundedDistance = roundDistance(distance);
              if (roundedDistance !== distanceToNextTurn) {
                setDistanceToNextTurn(roundedDistance);
              }
              // Check if we reached or passed the turn
              // Either within 20m, OR we're now closer to the NEXT step's start than current step's end
              const passedStep = (() => {
                if (distance < 30) return true; // Close enough to current step end

                const nextStepIndex = currentNavigationStep + 1;
                if (nextStepIndex < selectedRoute.steps.length) {
                  const nextStep = selectedRoute.steps[nextStepIndex];
                  const distToNextStart = calculateDistance(
                    newPosition.latitude,
                    newPosition.longitude,
                    nextStep.start_location.latitude,
                    nextStep.start_location.longitude
                  );
                  // If closer to next step's start than current step's end, we passed it
                  return distToNextStart < distance;
                }
                return false;
              })();

              if (passedStep) {
                const nextStepIndex = currentNavigationStep + 1;
                if (nextStepIndex < selectedRoute.steps.length) {
                  // Only advance if we haven't already advanced to this step
                  if (lastAdvancedStep.current !== nextStepIndex) {
                    lastAdvancedStep.current = nextStepIndex;
                    dispatch(updateNavigationProgress(nextStepIndex));
                    navLogEvents.stepAdvanced(
                      currentNavigationStep,
                      nextStepIndex,
                      "passed_turn"
                    );
                  }
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
    // Skip if already rerouting
    if (isRerouting) {
      return;
    }
    // Skip deviation check for first 5 position updates (let GPS settle)
    positionUpdatesCount.current++;
    if (positionUpdatesCount.current < 10) {
      return;
    }
    // Check if user is more than 50m from route
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
      navLogEvents.deviationCheck(distance, 100, distance > 100);

      // If more than 50m off route, trigger reroute
      if (distance > 100) {
        const now = Date.now();
        const timeSinceLastReroute = now - lastRerouteTime.current;

        // Only reroute if at least 60 seconds since last reroute
        if (timeSinceLastReroute > 60000) {
          lastRerouteTime.current = now;
          dispatch(checkForReroute(position));
        }
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
    stopNavigation();
    if (selectedRoute?.databaseId) {
      await dispatch(endNavigationSession(selectedRoute.databaseId));
    }
    dispatch(setNavigationPosition(null));
    navLogEvents.navigationEnded("user_ended", false);
    await navLog.endSession();
    // Offer to export logs
    await navLog.share();
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

  const currentManeuver = (() => {
    if (
      selectedRoute.steps &&
      selectedRoute.steps[currentNavigationStep || 0]
    ) {
      return selectedRoute.steps[currentNavigationStep || 0].maneuver;
    }
    return undefined;
  })();

  const nextManeuver = (() => {
    const nextStepIndex = (currentNavigationStep || 0) + 1;
    if (selectedRoute.steps && selectedRoute.steps[nextStepIndex]) {
      return selectedRoute.steps[nextStepIndex].maneuver;
    }
    return undefined;
  })();

  const nextInstruction = (() => {
    const nextStepIndex = (currentNavigationStep || 0) + 1;
    if (selectedRoute.steps && selectedRoute.steps[nextStepIndex]) {
      return selectedRoute.steps[nextStepIndex].instruction;
    }
    return null;
  })();

  return (
    <>
      {/* Navigation Arrow Marker 
      {currentPosition && mapRef?.current && (
        <Marker
          coordinate={currentPosition}
          anchor={{ x: 0.5, y: 0.5 }}
          flat={true}
          rotation={currentPosition.heading || 0}
        >
          <View style={styles.navigationArrow}>
            <Ionicons name="navigate" size={32} color={theme.colors.primary} />
          </View>
        </Marker>
      )}*/}
      {/* Navigation instruction container */}
      <View style={styles.navigationInstructionContainer}>
        <View
          style={[
            styles.instructionPanel,
            nextInstruction && { borderBottomLeftRadius: 0 },
          ]}
        >
          <Ionicons
            name={getManeuverIcon(currentManeuver) as any}
            size={60}
            color={theme.colors.card}
          />
          <Text style={styles.distanceText}>
            {formatDistance(distanceToNextTurn, distanceUnit)}
          </Text>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setShowInstructionText(!showInstructionText)}
          >
            <Ionicons
              name={showInstructionText ? "chevron-up" : "chevron-down"}
              size={24}
              color={theme.colors.card}
            />
          </TouchableOpacity>
          {showInstructionText && (
            <View style={styles.instructionTextContainer}>
              <Text style={styles.instructionText}>{currentInstruction}</Text>
            </View>
          )}
        </View>

        {nextInstruction && (
          <View style={styles.thenPill}>
            <Text style={styles.thenText}>Then</Text>
            <Ionicons
              name={getManeuverIcon(nextManeuver) as any}
              size={24}
              color={theme.colors.card}
            />
          </View>
        )}
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
      {/* Temporary debug overlay */}
      <TouchableOpacity
        style={styles.debugButton}
        onPress={() => setShowDebug(!showDebug)}
      >
        <Text style={{ color: "white", fontSize: 10 }}>DBG</Text>
      </TouchableOpacity>

      {showDebug && selectedRoute && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugTitle}>
            Steps: {selectedRoute.steps?.length || 0} | Current:{" "}
            {currentNavigationStep}
          </Text>
          <Text style={styles.debugText}>
            Segments:{" "}
            {selectedRoute.safety_analysis?.segment_scores?.length || "NONE"}
          </Text>
          <Text style={styles.debugText}>
            Route pts: {selectedRoute.route_points?.length || "NONE"}
          </Text>
          {selectedRoute.steps?.slice(0, 4).map((step, i) => (
            <Text
              key={i}
              style={[
                styles.debugText,
                i === currentNavigationStep && { color: "yellow" },
              ]}
            >
              {i}: {step.maneuver || "-"} | {step.distance_meters}m
            </Text>
          ))}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  debugButton: {
    position: "absolute",
    top: 200,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 12,
    borderRadius: 8,
    zIndex: 99999,
  },
  debugOverlay: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 10,
    borderRadius: 8,
    maxWidth: 200,
    zIndex: 10001,
  },
  debugTitle: {
    color: "white",
    fontWeight: "bold",
    fontSize: 11,
    marginBottom: 4,
  },
  debugText: {
    color: "white",
    fontSize: 10,
  },
  container: {
    flex: 1,
  },
  navigationInstructionContainer: {
    position: "absolute",
    top: 4,
    left: 10,
    right: 10,
    zIndex: 10000,
  },
  instructionPanel: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 10,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  thenPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.borderDark,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: 0,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    gap: 6,
  },
  thenText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.card,
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
  infoButton: {
    position: "absolute",
    top: 8,
    right: 8,
    marginLeft: "auto",
    padding: 4,
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
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.95,
    shadowRadius: 12,
    elevation: 8,
    borderColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
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
