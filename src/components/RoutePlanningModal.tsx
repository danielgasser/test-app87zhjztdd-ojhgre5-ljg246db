// src/components/RoutePlanning/RoutePlanningModal.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import {
  generateSafeRoute,
  generateRouteAlternatives,
  setSelectedRoute,
  clearRoutes,
  updateRoutePreferences,
  RouteCoordinate,
  RouteRequest,
  SafeRoute,
} from "src/store/locationsSlice";
import { APP_CONFIG } from "@/utils/appConfig";

interface RoutePlanningModalProps {
  visible: boolean;
  onClose: () => void;
  origin?: RouteCoordinate;
  destination?: RouteCoordinate;
}

const RoutePlanningModal: React.FC<RoutePlanningModalProps> = ({
  visible,
  onClose,
  origin,
  destination,
}) => {
  const dispatch = useAppDispatch();
  const {
    selectedRoute,
    routeAlternatives,
    routeLoading,
    routeError,
    routePreferences,
  } = useAppSelector((state) => state.locations);
  const currentUser = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.user.profile);

  // Local state
  const [routeOrigin, setRouteOrigin] = useState<RouteCoordinate | null>(
    origin || null
  );
  const [routeDestination, setRouteDestination] =
    useState<RouteCoordinate | null>(destination || null);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setRouteOrigin(origin || null);
      setRouteDestination(destination || null);
      setShowAlternatives(false);
    }
  }, [visible, origin, destination]);

  // Handle route generation
  const handleGenerateRoute = async () => {
    if (!routeOrigin || !routeDestination) {
      Alert.alert(
        "Missing Information",
        "Please set both origin and destination"
      );
      return;
    }

    if (!userProfile) {
      Alert.alert(
        "Profile Required",
        "Please complete your profile to get personalized safety routes"
      );
      return;
    }

    const routeRequest: RouteRequest = {
      origin: routeOrigin,
      destination: routeDestination,
      user_demographics: {
        race_ethnicity: userProfile.race_ethnicity,
        gender: userProfile.gender,
        lgbtq_status: userProfile.lgbtq_status,
        religion: userProfile.religion,
        disability_status: userProfile.disability_status,
        age_range: userProfile.age_range,
      },
      route_preferences: {
        prioritize_safety: routePreferences.safetyPriority === "safety_focused",
        avoid_evening_danger: routePreferences.avoidEveningDanger,
        max_detour_minutes: routePreferences.maxDetourMinutes,
      },
    };

    try {
      console.log("🚀 Generating safe route...");
      await dispatch(generateSafeRoute(routeRequest)).unwrap();

      // Generate alternatives after main route
      dispatch(generateRouteAlternatives(routeRequest));
    } catch (error) {
      console.error("❌ Route generation failed:", error);
      Alert.alert("Route Error", "Failed to generate route. Please try again.");
    }
  };

  // Handle route selection
  const handleSelectRoute = (route: SafeRoute) => {
    dispatch(setSelectedRoute(route));
    Alert.alert("Route Selected", `Selected: ${route.name}`);
  };

  // Handle safety priority change
  const handleSafetyPriorityChange = (
    priority: "speed_focused" | "balanced" | "safety_focused"
  ) => {
    dispatch(updateRoutePreferences({ safetyPriority: priority }));
  };

  // Close modal and clear routes
  const handleClose = () => {
    dispatch(clearRoutes());
    onClose();
  };

  // Render route card
  const renderRouteCard = (route: SafeRoute, isSelected: boolean = false) => {
    const safety = route.safety_analysis;
    const safetyColor = getSafetyColor(safety.overall_route_score);
    const safetyLabel = getSafetyLabel(safety.overall_route_score);

    return (
      <TouchableOpacity
        key={route.id}
        style={[styles.routeCard, isSelected && styles.selectedRouteCard]}
        onPress={() => handleSelectRoute(route)}
      >
        {/* Route Header */}
        <View style={styles.routeHeader}>
          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{route.name}</Text>
            <Text style={styles.routeType}>
              {route.route_type.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.safetyBadge, { backgroundColor: safetyColor }]}>
            <Text style={styles.safetyScore}>
              {safety.overall_route_score.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Route Metrics */}
        <View style={styles.routeMetrics}>
          <View style={styles.metric}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.metricText}>
              {route.estimated_duration_minutes} min
            </Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="speedometer-outline" size={16} color="#666" />
            <Text style={styles.metricText}>
              {(safety.total_distance_meters / 1000).toFixed(1)} km
            </Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="shield-outline" size={16} color={safetyColor} />
            <Text style={[styles.metricText, { color: safetyColor }]}>
              {safetyLabel}
            </Text>
          </View>
        </View>

        {/* Route Summary */}
        <View style={styles.routeSummary}>
          <View style={styles.summaryItem}>
            <View
              style={[
                styles.summaryDot,
                { backgroundColor: APP_CONFIG.ROUTE_DISPLAY.COLORS.SAFE_ROUTE },
              ]}
            />
            <Text style={styles.summaryText}>
              {safety.route_summary.safe_segments} safe
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <View
              style={[
                styles.summaryDot,
                {
                  backgroundColor: APP_CONFIG.ROUTE_DISPLAY.COLORS.MIXED_ROUTE,
                },
              ]}
            />
            <Text style={styles.summaryText}>
              {safety.route_summary.mixed_segments} mixed
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <View
              style={[
                styles.summaryDot,
                {
                  backgroundColor: APP_CONFIG.ROUTE_DISPLAY.COLORS.UNSAFE_ROUTE,
                },
              ]}
            />
            <Text style={styles.summaryText}>
              {safety.route_summary.unsafe_segments} unsafe
            </Text>
          </View>
          {safety.route_summary.danger_zones_count > 0 && (
            <View style={styles.summaryItem}>
              <Ionicons name="warning" size={14} color="#FF5722" />
              <Text style={[styles.summaryText, { color: "#FF5722" }]}>
                {safety.route_summary.danger_zones_count} danger zones
              </Text>
            </View>
          )}
        </View>

        {/* Improvement Suggestions */}
        {safety.improvement_suggestions.length > 0 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>Safety Notes:</Text>
            {safety.improvement_suggestions
              .slice(0, 2)
              .map((suggestion, index) => (
                <Text key={index} style={styles.suggestionText}>
                  • {suggestion}
                </Text>
              ))}
          </View>
        )}

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.selectedText}>Selected Route</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Route Planning</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Route Input Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route Details</Text>

            <View style={styles.routeInputs}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>From:</Text>
                <Text style={styles.coordinateText}>
                  {routeOrigin
                    ? `${routeOrigin.latitude.toFixed(
                        4
                      )}, ${routeOrigin.longitude.toFixed(4)}`
                    : "Not set"}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>To:</Text>
                <Text style={styles.coordinateText}>
                  {routeDestination
                    ? `${routeDestination.latitude.toFixed(
                        4
                      )}, ${routeDestination.longitude.toFixed(4)}`
                    : "Not set"}
                </Text>
              </View>
            </View>
          </View>

          {/* Safety Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety Preferences</Text>

            <View style={styles.priorityButtons}>
              {(["speed_focused", "balanced", "safety_focused"] as const).map(
                (priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      routePreferences.safetyPriority === priority &&
                        styles.activePriorityButton,
                    ]}
                    onPress={() => handleSafetyPriorityChange(priority)}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        routePreferences.safetyPriority === priority &&
                          styles.activePriorityButtonText,
                      ]}
                    >
                      {priority.replace("_", " ").toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Avoid evening dangers</Text>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  routePreferences.avoidEveningDanger && styles.toggleActive,
                ]}
                onPress={() =>
                  dispatch(
                    updateRoutePreferences({
                      avoidEveningDanger: !routePreferences.avoidEveningDanger,
                    })
                  )
                }
              >
                {routePreferences.avoidEveningDanger && (
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Generate Route Button */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              routeLoading && styles.disabledButton,
            ]}
            onPress={handleGenerateRoute}
            disabled={routeLoading || !routeOrigin || !routeDestination}
          >
            {routeLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="navigate" size={20} color="#FFF" />
                <Text style={styles.generateButtonText}>
                  Generate Safe Route
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Error Display */}
          {routeError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#F44336" />
              <Text style={styles.errorText}>{routeError}</Text>
            </View>
          )}

          {/* Primary Route */}
          {selectedRoute && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended Route</Text>
              {renderRouteCard(selectedRoute, true)}
            </View>
          )}

          {/* Alternative Routes */}
          {routeAlternatives.length > 0 && (
            <View style={styles.section}>
              <View style={styles.alternativesHeader}>
                <Text style={styles.sectionTitle}>Alternative Routes</Text>
                <TouchableOpacity
                  onPress={() => setShowAlternatives(!showAlternatives)}
                  style={styles.toggleAlternatives}
                >
                  <Text style={styles.toggleAlternativesText}>
                    {showAlternatives ? "Hide" : "Show"} (
                    {routeAlternatives.length})
                  </Text>
                  <Ionicons
                    name={showAlternatives ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#8E24AA"
                  />
                </TouchableOpacity>
              </View>

              {showAlternatives &&
                routeAlternatives.map((route) => renderRouteCard(route))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Helper functions
const getSafetyColor = (score: number): string => {
  if (score >= APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD) {
    return APP_CONFIG.ROUTE_DISPLAY.COLORS.SAFE_ROUTE;
  } else if (score >= APP_CONFIG.ROUTE_PLANNING.MIXED_ROUTE_THRESHOLD) {
    return APP_CONFIG.ROUTE_DISPLAY.COLORS.MIXED_ROUTE;
  } else {
    return APP_CONFIG.ROUTE_DISPLAY.COLORS.UNSAFE_ROUTE;
  }
};

const getSafetyLabel = (score: number): string => {
  if (score >= APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD) {
    return "Safe";
  } else if (score >= APP_CONFIG.ROUTE_PLANNING.MIXED_ROUTE_THRESHOLD) {
    return "Mixed";
  } else {
    return "Caution";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#000",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  routeInputs: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 4,
  },
  coordinateText: {
    fontSize: 16,
    color: "#000",
    fontFamily: "monospace",
  },
  priorityButtons: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  activePriorityButton: {
    backgroundColor: "#8E24AA",
  },
  priorityButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  activePriorityButtonText: {
    color: "#FFF",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: "#000",
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: "#4CAF50",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8E24AA",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#F44336",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  routeCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedRouteCard: {
    borderColor: "#4CAF50",
    backgroundColor: "#F8FFF8",
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  routeType: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  safetyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  safetyScore: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  routeMetrics: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  metricText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  routeSummary: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    marginBottom: 4,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  summaryText: {
    fontSize: 12,
    color: "#666",
  },
  suggestions: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  selectedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  selectedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    marginLeft: 4,
  },
  alternativesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  toggleAlternatives: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleAlternativesText: {
    fontSize: 14,
    color: "#8E24AA",
    fontWeight: "500",
    marginRight: 4,
  },
});

export default RoutePlanningModal;
