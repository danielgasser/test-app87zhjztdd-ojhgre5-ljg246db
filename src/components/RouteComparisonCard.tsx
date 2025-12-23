import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SmartRouteComparison } from "../store/locationsSlice";
import { theme } from "@/styles/theme";
import { APP_CONFIG } from "@/config/appConfig";
import { useAppSelector } from "@/store/hooks";
import { formatDuration } from "@/utils/timeHelpers";
import { ProactiveWarnings } from "./ProactiveWarnings";
import { RouteSafetyBreakdown } from "./RouteSafetyBreakdown";
interface RouteComparisonCardProps {
  comparison: SmartRouteComparison;
  onSelectOriginal: () => void;
  onSelectOptimized: () => void;
  onStartNavigation?: () => void;
}

interface RouteComparisonCardProps {
  comparison: SmartRouteComparison;
  onSelectOriginal: () => void;
  onSelectOptimized: () => void;
  onStartNavigation?: () => void;
  isStartingNavigation?: boolean;
}

const RouteComparisonCard: React.FC<RouteComparisonCardProps> = ({
  comparison,
  onSelectOriginal,
  onSelectOptimized,
  onStartNavigation,
  isStartingNavigation = false,
}) => {
  const {
    original_route,
    optimized_route,
    improvement_summary,
    waypoints_added,
  } = comparison;

  // Helper function to get safety score color
  const getSafetyColor = (score: number): string => {
    if (score >= 4.0) return theme.colors.success; // Green
    if (score >= 3.0) return theme.colors.mixedYellow; // Yellow
    return theme.colors.error; // Red
  };
  const selectedRoute = useAppSelector(
    (state) => state.locations.selectedRoute
  );
  const isOriginalSelected = selectedRoute?.id === original_route.id;
  const isOptimizedSelected = selectedRoute?.id === optimized_route.id;
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="analytics" size={24} color={theme.colors.primary} />
        <Text style={styles.headerTitle}>Safer Route Found!</Text>
      </View>

      {/* Improvement Summary */}
      <View style={styles.improvementBanner}>
        <Ionicons
          name="shield-checkmark"
          size={20}
          color={theme.colors.secondary}
        />
        <Text style={styles.improvementText}>
          Safety improved by {improvement_summary.safety_improvement.toFixed(1)}{" "}
          points
        </Text>
      </View>

      {/* Route Comparison Cards */}
      <View style={styles.routesContainer}>
        {/* Original Route */}
        <TouchableOpacity
          style={[
            styles.routeCard,
            isOriginalSelected && styles.recommendedCard, // Add style if selected
          ]}
          onPress={onSelectOriginal}
        >
          {isOriginalSelected && ( // Show badge if selected
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Selected</Text>
            </View>
          )}
          <View style={styles.routeCardHeader}>
            <Text style={styles.routeLabel}>Fastest Route</Text>
            <View
              style={[
                styles.safetyBadge,
                {
                  backgroundColor: getSafetyColor(
                    improvement_summary.original_safety_score
                  ),
                },
              ]}
            >
              <Text style={styles.safetyScore}>
                {improvement_summary.original_safety_score.toFixed(1)}
              </Text>
            </View>
          </View>
          <View style={styles.routeMetrics}>
            <View style={styles.metric}>
              <Ionicons
                name="time-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.metricText}>
                {formatDuration(original_route.estimated_duration_minutes)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Ionicons name="warning" size={16} color={theme.colors.error} />
              <Text style={styles.metricText}>
                {original_route.safety_analysis?.danger_zones_intersected ?? 0}{" "}
                danger zone
                {original_route.safety_analysis?.danger_zones_intersected === 1
                  ? ""
                  : "s"}
              </Text>
            </View>
          </View>
          <ProactiveWarnings
            safetyAnalysis={original_route.safety_analysis}
            routeType="original"
          />
          <RouteSafetyBreakdown
            segmentScores={original_route.safety_analysis?.segment_scores}
            routeType="original"
          />
          <Text style={styles.selectButtonText}>Use Fastest</Text>
        </TouchableOpacity>

        {/* Optimized Route */}
        <TouchableOpacity
          style={[
            styles.routeCard,
            isOptimizedSelected && styles.recommendedCard,
          ]}
          onPress={onSelectOptimized}
        >
          {isOptimizedSelected && ( // Show badge if selected
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Selected</Text>
            </View>
          )}
          <View style={styles.recommendedBadgeRed}>
            <Text style={styles.recommendedTextRed}>RECOMMENDED</Text>
          </View>
          <View style={styles.routeCardHeader}>
            <Text style={styles.routeLabel}>Safer Route</Text>
            <View
              style={[
                styles.safetyBadge,
                {
                  backgroundColor: getSafetyColor(
                    improvement_summary.optimized_safety_score
                  ),
                },
              ]}
            >
              <Text style={styles.safetyScore}>
                {improvement_summary.optimized_safety_score.toFixed(1)}
              </Text>
            </View>
          </View>
          <View style={styles.routeMetrics}>
            <View style={styles.metric}>
              <Ionicons
                name="time-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.metricText}>
                {formatDuration(optimized_route.estimated_duration_minutes)}
                <Text style={styles.addedTime}>
                  (+{improvement_summary.time_added_minutes})
                </Text>
              </Text>
            </View>
            <View style={styles.metric}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={theme.colors.secondary}
              />
              <Text style={styles.metricText}>
                {optimized_route.safety_analysis?.danger_zones_intersected ?? 0}{" "}
                danger zone
                {optimized_route.safety_analysis?.danger_zones_intersected === 1
                  ? ""
                  : "s"}
              </Text>
            </View>
          </View>
          <ProactiveWarnings
            safetyAnalysis={optimized_route.safety_analysis}
            routeType="optimized"
          />
          <RouteSafetyBreakdown
            segmentScores={optimized_route.safety_analysis?.segment_scores}
            routeType="optimized"
          />
          <Text style={styles.selectButtonText}>Use Safer Route</Text>
        </TouchableOpacity>
      </View>

      {/* Waypoints Info */}
      {waypoints_added && waypoints_added.length > 0 && (
        <View style={styles.waypointsSection}>
          <Text style={styles.waypointsTitle}>
            <Ionicons
              name="navigate-circle"
              size={16}
              color={theme.colors.primary}
            />
            Safe Detours Added
          </Text>
          {waypoints_added.map((waypoint, index) => (
            <View key={index} style={styles.waypointItem}>
              <Ionicons
                name="location"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.waypointReason}>{waypoint.reason}</Text>
            </View>
          ))}
        </View>
      )}
      {/* Low-Confidence Warning Banner */}
      {(() => {
        const confidence =
          optimized_route.safety_analysis?.overall_confidence ??
          optimized_route.safety_analysis?.confidence;
        return (
          confidence !== undefined &&
          confidence < APP_CONFIG.ROUTE_PLANNING.LOW_CONFIDENCE_THRESHOLD
        );
      })() && (
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle" size={24} color={theme.colors.accent} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>
              ⚠️ Limited reviews available for this route!
            </Text>
            <Text style={styles.warningText}>
              Help improve safety. Be the first to review locations along the
              way during your trip.
            </Text>
          </View>
        </View>
      )}
      {onStartNavigation && (
        <TouchableOpacity
          style={[
            styles.startNavigationButton,
            isStartingNavigation && styles.disabledButton,
          ]}
          onPress={onStartNavigation}
          disabled={isStartingNavigation}
        >
          {isStartingNavigation ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <Ionicons
              name="navigate-circle"
              size={28}
              color={theme.colors.background}
            />
          )}
          <Text style={styles.startNavigationText}>
            {isStartingNavigation ? "Starting..." : "Start Navigation"}
          </Text>
          {!isStartingNavigation && (
            <Ionicons
              name="arrow-forward"
              size={20}
              color={theme.colors.background}
            />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: theme.colors.backdrop,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.backdrop,
    marginLeft: 8,
  },
  improvementBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  improvementText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.success,
    marginLeft: 8,
  },
  routesContainer: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 16,
  },
  routeCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  recommendedCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: theme.colors.primary,
  },
  recommendedBadge: {
    position: "absolute",
    top: -8,
    right: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  recommendedText: {
    color: theme.colors.background,
    fontSize: 10,
    fontWeight: "700",
  },
  recommendedBadgeRed: {
    position: "absolute",
    top: -8,
    right: 8,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderColor: theme.colors.accent,
    borderWidth: 1,
  },
  recommendedTextRed: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: "700",
  },
  routeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  routeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.backdrop,
  },
  safetyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  safetyScore: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: "700",
  },
  routeMetrics: {
    marginBottom: 12,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metricText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  addedTime: {
    color: theme.colors.accent,
    fontWeight: "600",
  },
  selectButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  selectButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: "600",
  },
  waypointsSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.backgroundSecondary,
    paddingTop: 12,
  },
  waypointsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.backdrop,
    marginBottom: 8,
  },
  waypointItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  waypointReason: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  warningBanner: {
    flexDirection: "row",
    backgroundColor: theme.colors.backgroundSecondary,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.accent,
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  startNavigationButton: {
    backgroundColor: theme.colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
    shadowColor: theme.colors.backdrop,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startNavigationText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default RouteComparisonCard;
