import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { PremiumGate } from "./PremiumGate";
import { commonStyles } from "@/styles/common";

interface ProactiveWarningsProps {
  safetyAnalysis: any;
  routeType: "original" | "optimized";
}

const getWarningIcon = (note: string): string => {
  if (note.toLowerCase().includes("danger zone")) return "warning";
  if (note.toLowerCase().includes("caution")) return "alert-circle";
  if (note.toLowerCase().includes("safe")) return "shield-checkmark";
  if (
    note.toLowerCase().includes("evening") ||
    note.toLowerCase().includes("night")
  )
    return "moon";
  return "information-circle";
};

const getWarningColor = (note: string): string => {
  if (
    note.toLowerCase().includes("safe") ||
    note.toLowerCase().includes("predominantly")
  ) {
    return theme.colors.success;
  }
  if (
    note.toLowerCase().includes("danger") ||
    note.toLowerCase().includes("unsafe")
  ) {
    return theme.colors.error;
  }
  return theme.colors.accent;
};

export const ProactiveWarnings: React.FC<ProactiveWarningsProps> = ({
  safetyAnalysis,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!safetyAnalysis) return null;

  const {
    safety_notes,
    safety_summary,
    segment_scores,
    danger_zones_intersected,
  } = safetyAnalysis || {};

  // Collect unique risk factors from segments
  const uniqueRiskFactors = new Set<string>();
  segment_scores?.forEach((seg: any) => {
    seg.risk_factors?.forEach((risk: string) => uniqueRiskFactors.add(risk));
  });

  const hasWarnings =
    (safety_notes && safety_notes.length > 0) ||
    uniqueRiskFactors.size > 0 ||
    (danger_zones_intersected && danger_zones_intersected > 0);

  if (!hasWarnings) return null;

  // Count for the header badge
  const warningCount =
    (safety_notes?.length || 0) +
    (danger_zones_intersected || 0) +
    (safety_summary?.unsafe_segments || 0);
  return (
    <View style={styles.specContainer}>
      <TouchableOpacity
        style={styles.specHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="alert-circle" size={18} color={theme.colors.accent} />
          <Text style={commonStyles.primaryButtonText}>Route Warnings</Text>
          {warningCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{warningCount}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.colors.textOnPrimary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <PremiumGate feature="proactiveWarnings" fallback="blur">
          <View style={styles.content}>
            {/* Safety Summary */}
            {safety_summary && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryDot,
                      { backgroundColor: theme.colors.success },
                    ]}
                  />
                  <Text style={styles.summaryText}>
                    {safety_summary.safe_segments} safe
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryDot,
                      { backgroundColor: theme.colors.mixedYellow },
                    ]}
                  />
                  <Text style={styles.summaryText}>
                    {safety_summary.mixed_segments} mixed
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryDot,
                      { backgroundColor: theme.colors.error },
                    ]}
                  />
                  <Text style={styles.summaryText}>
                    {safety_summary.unsafe_segments} unsafe
                  </Text>
                </View>
              </View>
            )}

            {/* Safety Notes */}
            {safety_notes && safety_notes.length > 0 && (
              <View style={styles.notesSection}>
                {safety_notes.map((note: string, index: number) => (
                  <View key={index} style={styles.noteRow}>
                    <Ionicons
                      name={getWarningIcon(note) as any}
                      size={16}
                      color={getWarningColor(note)}
                    />
                    <Text style={styles.noteText}>{note}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Risk Factors from Segments */}
            {uniqueRiskFactors.size > 0 && (
              <View style={styles.riskSection}>
                <Text style={styles.riskTitle}>Risk Factors</Text>
                {Array.from(uniqueRiskFactors)
                  .slice(0, 5)
                  .map((risk, index) => (
                    <View key={index} style={styles.riskRow}>
                      <Ionicons
                        name="alert"
                        size={14}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.riskText}>{risk}</Text>
                    </View>
                  ))}
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
    paddingHorizontal: 4,
    color: theme.colors.textOnPrimary,
    padding: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.background,
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
    marginBottom: 8,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  notesSection: {
    gap: 6,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  riskSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background,
  },
  riskTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  riskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  riskText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

export default ProactiveWarnings;
