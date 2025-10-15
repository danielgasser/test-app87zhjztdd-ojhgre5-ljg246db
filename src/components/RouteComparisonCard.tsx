import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SmartRouteComparison } from "../store/locationsSlice";
import { theme } from "@/styles/theme";

interface RouteComparisonCardProps {
  comparison: SmartRouteComparison;
  onSelectOriginal: () => void;
  onSelectOptimized: () => void;
  onStartNavigation?: () => void;
}

const RouteComparisonCard: React.FC<RouteComparisonCardProps> = ({
  comparison,
  onSelectOriginal,
  onSelectOptimized,
  onStartNavigation,
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
        <View style={styles.routeCard}>
          <View style={styles.routeCardHeader}>
            <Text style={styles.routeLabel}>Original Route</Text>
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
                {original_route.estimated_duration_minutes} min
              </Text>
            </View>
            <View style={styles.metric}>
              <Ionicons name="warning" size={16} color={theme.colors.error} />
              <Text style={styles.metricText}>
                {improvement_summary.danger_zones_avoided} danger zones
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={onSelectOriginal}
          >
            <Text style={styles.selectButtonText}>Use Fastest</Text>
          </TouchableOpacity>
        </View>

        {/* Optimized Route */}
        <View style={[styles.routeCard, styles.recommendedCard]}>
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>RECOMMENDED</Text>
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
                {optimized_route.estimated_duration_minutes} min
                <Text style={styles.addedTime}>
                  {" "}
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
              <Text style={styles.metricText}>Avoids danger zones</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.selectButton, styles.primaryButton]}
            onPress={onSelectOptimized}
          >
            <Text style={styles.primaryButtonText}>Use Safer Route</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Waypoints Info */}
      {waypoints_added && waypoints_added.length > 0 && (
        <View style={styles.waypointsSection}>
          <Text style={styles.waypointsTitle}>
            <Ionicons
              name="navigate-circle"
              size={16}
              color={theme.colors.primary}
            />{" "}
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
      {onStartNavigation && (
        <TouchableOpacity
          style={styles.startNavigationButton}
          onPress={onStartNavigation}
        >
          <Ionicons
            name="navigate-circle"
            size={28}
            color={theme.colors.background}
          />
          <Text style={styles.startNavigationText}>Start Navigation</Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={theme.colors.background}
          />
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
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  routeCard: {
    flex: 1,
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
  // ADD THESE:
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
});

export default RouteComparisonCard;
