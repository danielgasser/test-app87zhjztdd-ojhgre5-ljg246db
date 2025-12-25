import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { PremiumGate } from "./PremiumGate";
import { formatDistance } from "@/utils/distanceHelpers";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { commonStyles } from "@/styles/common";
interface RouteSafetyBreakdownProps {
  segmentScores: any[] | undefined;
  routeType: "original" | "optimized";
}

const getSafetyColor = (score: number): string => {
  if (score >= 4.0) return theme.colors.success;
  if (score >= 3.0) return theme.colors.mixedYellow;
  return theme.colors.error;
};

export const RouteSafetyBreakdown: React.FC<RouteSafetyBreakdownProps> = ({
  segmentScores,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { distanceUnit } = useUserPreferences();

  if (!segmentScores || segmentScores.length === 0) return null;

  // Group segments by safety level for summary
  const safeSeg = segmentScores.filter((s) => s.safety_score >= 4.0).length;
  const mixedSeg = segmentScores.filter(
    (s) => s.safety_score >= 3.0 && s.safety_score < 4.0
  ).length;
  const unsafeSeg = segmentScores.filter((s) => s.safety_score < 3.0).length;

  return (
    <View style={styles.specContainer}>
      <TouchableOpacity
        style={styles.specHeader}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="map" size={18} color={theme.colors.primary} />
          <Text style={[commonStyles.textBold, { fontSize: 16 }]}>
            Route Breakdown
          </Text>
          <View style={styles.segmentCount}>
            <Text style={styles.segmentCountText}>
              {segmentScores.length} segments
            </Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <PremiumGate feature="routeSafetyBreakdown" fallback="blur">
          <View style={styles.content}>
            {/* Visual Route Timeline */}
            <View style={styles.timeline}>
              <Text style={styles.timelineLabel}>Start</Text>
              <View style={styles.timelineBar}>
                {segmentScores.map((seg: any, idx: number) => (
                  <View
                    key={idx}
                    style={[
                      styles.timelineSegment,
                      {
                        flex: seg.distance_meters || 1,
                        backgroundColor: getSafetyColor(seg.safety_score),
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.timelineLabel}>End</Text>
            </View>

            {/* Summary Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{safeSeg}</Text>
                <View style={styles.statLabelRow}>
                  <View
                    style={[
                      styles.statDot,
                      { backgroundColor: theme.colors.success },
                    ]}
                  />
                  <Text style={styles.statLabel}>Safe</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{mixedSeg}</Text>
                <View style={styles.statLabelRow}>
                  <View
                    style={[
                      styles.statDot,
                      { backgroundColor: theme.colors.mixedYellow },
                    ]}
                  />
                  <Text style={styles.statLabel}>Mixed</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{unsafeSeg}</Text>
                <View style={styles.statLabelRow}>
                  <View
                    style={[
                      styles.statDot,
                      { backgroundColor: theme.colors.error },
                    ]}
                  />
                  <Text style={styles.statLabel}>Caution</Text>
                </View>
              </View>
            </View>

            {/* Distance by Safety Level */}
            <View style={styles.distanceBreakdown}>
              <Text style={commonStyles.sectionTitle}>
                Distance by Safety Level
              </Text>
              {(() => {
                const safeDistance = segmentScores
                  .filter((s: any) => s.safety_score >= 4.0)
                  .reduce(
                    (sum: number, s: any) => sum + (s.distance_meters || 0),
                    0
                  );
                const mixedDistance = segmentScores
                  .filter(
                    (s: any) => s.safety_score >= 3.0 && s.safety_score < 4.0
                  )
                  .reduce(
                    (sum: number, s: any) => sum + (s.distance_meters || 0),
                    0
                  );
                const unsafeDistance = segmentScores
                  .filter((s: any) => s.safety_score < 3.0)
                  .reduce(
                    (sum: number, s: any) => sum + (s.distance_meters || 0),
                    0
                  );
                const totalDistance =
                  safeDistance + mixedDistance + unsafeDistance;

                return (
                  <View style={styles.distanceRows}>
                    <View style={styles.distanceRow}>
                      <View style={styles.distanceLabel}>
                        <View
                          style={[
                            styles.distanceDot,
                            { backgroundColor: theme.colors.success },
                          ]}
                        />
                        <Text style={styles.distanceText}>Safe areas</Text>
                      </View>
                      <Text style={styles.distanceValue}>
                        {formatDistance(safeDistance, distanceUnit)} (
                        {totalDistance > 0
                          ? Math.round((safeDistance / totalDistance) * 100)
                          : 0}
                        %)
                      </Text>
                    </View>
                    <View style={styles.distanceRow}>
                      <View style={styles.distanceLabel}>
                        <View
                          style={[
                            styles.distanceDot,
                            { backgroundColor: theme.colors.mixedYellow },
                          ]}
                        />
                        <Text style={styles.distanceText}>Mixed areas</Text>
                      </View>
                      <Text style={styles.distanceValue}>
                        {formatDistance(mixedDistance, distanceUnit)} (
                        {totalDistance > 0
                          ? Math.round((mixedDistance / totalDistance) * 100)
                          : 0}
                        %)
                      </Text>
                    </View>
                    <View style={styles.distanceRow}>
                      <View style={styles.distanceLabel}>
                        <View
                          style={[
                            styles.distanceDot,
                            { backgroundColor: theme.colors.error },
                          ]}
                        />
                        <Text style={styles.distanceText}>Caution areas</Text>
                      </View>
                      <Text style={styles.distanceValue}>
                        {formatDistance(unsafeDistance, distanceUnit)} (
                        {totalDistance > 0
                          ? Math.round((unsafeDistance / totalDistance) * 100)
                          : 0}
                        %)
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* Problem Areas - Only show if there are unsafe segments */}
            {unsafeSeg > 0 && (
              <View style={styles.problemAreas}>
                <Text
                  style={[
                    commonStyles.sectionTitle,
                    { color: theme.colors.error },
                  ]}
                >
                  ⚠️ Areas Requiring Caution
                </Text>
                <ScrollView
                  style={styles.problemScroll}
                  nestedScrollEnabled={true}
                >
                  {segmentScores
                    .map((seg: any, idx: number) => ({
                      ...seg,
                      originalIndex: idx,
                      distanceFromStart: segmentScores
                        .slice(0, idx)
                        .reduce(
                          (sum: number, s: any) =>
                            sum + (s.distance_meters || 0),
                          0
                        ),
                    }))
                    .filter((s: any) => s.safety_score < 3.0)
                    .slice(0, 5)
                    .map((segment: any, idx: number) => (
                      <View key={idx} style={styles.problemItem}>
                        <View style={styles.problemHeader}>
                          <View
                            style={[
                              styles.problemBadge,
                              {
                                backgroundColor: getSafetyColor(
                                  segment.safety_score
                                ),
                              },
                            ]}
                          >
                            <Text style={styles.problemBadgeText}>
                              {segment.safety_score.toFixed(1)}
                            </Text>
                          </View>
                          <View style={styles.problemInfo}>
                            <Text style={styles.problemDistance}>
                              {formatDistance(
                                segment.distanceFromStart,
                                distanceUnit
                              )}{" "}
                              from start
                            </Text>
                            <Text style={styles.problemLength}>
                              {formatDistance(
                                segment.distance_meters,
                                distanceUnit
                              )}{" "}
                              long
                            </Text>
                          </View>
                        </View>
                        {segment.risk_factors &&
                          segment.risk_factors.length > 0 && (
                            <View style={styles.problemRisks}>
                              {segment.risk_factors
                                .slice(0, 2)
                                .map((risk: string, rIdx: number) => (
                                  <View key={rIdx} style={styles.riskTag}>
                                    <Text style={styles.riskTagText}>
                                      {risk}
                                    </Text>
                                  </View>
                                ))}
                            </View>
                          )}
                      </View>
                    ))}
                </ScrollView>
              </View>
            )}

            {/* All Clear Message */}
            {unsafeSeg === 0 && (
              <View style={styles.allClear}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={theme.colors.success}
                />
                <Text style={styles.allClearText}>
                  No high-risk areas detected on this route
                </Text>
              </View>
            )}
          </View>
        </PremiumGate>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  specContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    marginTop: 8,
    overflow: "hidden",
  },
  specHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: `${theme.colors.primary}15`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  segmentCount: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  segmentCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.background,
  },
  content: {
    padding: 12,
  },
  mapToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: 12,
  },
  mapToggleActive: {
    backgroundColor: theme.colors.primary,
  },
  mapToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  mapToggleTextActive: {
    color: theme.colors.background,
  },
  timeline: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  timelineLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  timelineBar: {
    flex: 1,
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  timelineSegment: {
    height: "100%",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  distanceBreakdown: {
    marginBottom: 16,
  },
  distanceRows: {
    gap: 8,
  },
  distanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  distanceLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  distanceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distanceText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  distanceValue: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  problemAreas: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  problemScroll: {
    maxHeight: 180,
  },
  problemItem: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
  },
  problemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  problemBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  problemBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.background,
  },
  problemInfo: {
    flex: 1,
  },
  problemDistance: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  problemLength: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  problemRisks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  riskTag: {
    backgroundColor: `${theme.colors.error}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riskTagText: {
    fontSize: 11,
    color: theme.colors.error,
    fontWeight: "500",
  },
  allClear: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    backgroundColor: `${theme.colors.success}15`,
    borderRadius: 8,
  },
  allClearText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: "600",
  },
});

export default RouteSafetyBreakdown;
