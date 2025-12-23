import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { DemographicScore } from "@/store/locationsSlice";
import { PremiumGate } from "./PremiumGate";

interface DemographicBreakdownProps {
  scores: DemographicScore[];
  loading: boolean;
  onFetch: () => void;
}

// Map demographic types to readable labels
const DEMOGRAPHIC_LABELS: { [key: string]: string } = {
  race_ethnicity: "Race/Ethnicity",
  gender: "Gender",
  lgbtq: "LGBTQ+",
  disability: "Disability",
  religion: "Religion",
  age: "Age Group",
  overall: "Overall",
};

// Map demographic values to display names
const VALUE_LABELS: { [key: string]: string } = {
  // LGBTQ
  yes: "LGBTQ+",
  no: "Non-LGBTQ+",
  // Add more mappings as needed
};

const getSafetyColor = (score: number | null): string => {
  if (score === null) return theme.colors.textSecondary;
  if (score >= 4.0) return theme.colors.success;
  if (score >= 3.0) return theme.colors.mixedYellow;
  return theme.colors.error;
};

export const DemographicBreakdown: React.FC<DemographicBreakdownProps> = ({
  scores,
  loading,
  onFetch,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    if (!isExpanded && scores.length === 0 && !loading) {
      onFetch();
    }
    setIsExpanded(!isExpanded);
  };

  // Filter out 'overall' and group by demographic type
  const demographicScores = scores.filter(
    (s) => s.demographic_type !== "overall"
  );
  const groupedScores = demographicScores.reduce((acc, score) => {
    const type = score.demographic_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(score);
    return acc;
  }, {} as { [key: string]: DemographicScore[] });

  const renderScoreBar = (score: DemographicScore) => {
    const safetyScore = score.avg_safety_score;
    const percentage = safetyScore ? (safetyScore / 5) * 100 : 0;
    const displayValue =
      VALUE_LABELS[score.demographic_value || ""] || score.demographic_value;

    return (
      <View key={score.id} style={styles.scoreRow}>
        <View style={styles.scoreLabel}>
          <Text style={styles.scoreLabelText} numberOfLines={1}>
            {displayValue || "Unknown"}
          </Text>
          <Text style={styles.reviewCount}>
            ({score.review_count || 0} review
            {score.review_count !== 1 ? "s" : ""})
          </Text>
        </View>
        <View style={styles.scoreBarContainer}>
          <View
            style={[
              styles.scoreBar,
              {
                width: `${percentage}%`,
                backgroundColor: getSafetyColor(safetyScore),
              },
            ]}
          />
        </View>
        <Text
          style={[styles.scoreValue, { color: getSafetyColor(safetyScore) }]}
        >
          {safetyScore?.toFixed(1) || "N/A"}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={handleToggle}>
        <View style={styles.headerLeft}>
          <Ionicons name="stats-chart" size={20} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>Safety by Demographics</Text>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <PremiumGate feature="statisticalInsights" fallback="blur">
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading insights...</Text>
              </View>
            ) : Object.keys(groupedScores).length === 0 ? (
              <Text style={styles.noDataText}>
                No demographic breakdown available yet. Be the first to review!
              </Text>
            ) : (
              Object.entries(groupedScores).map(([type, typeScores]) => (
                <View key={type} style={styles.demographicGroup}>
                  <Text style={styles.groupTitle}>
                    {DEMOGRAPHIC_LABELS[type] || type}
                  </Text>
                  {typeScores.map(renderScoreBar)}
                </View>
              ))
            )}
          </View>
        </PremiumGate>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  noDataText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingVertical: 16,
  },
  demographicGroup: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  scoreLabel: {
    width: 100,
    marginRight: 8,
  },
  scoreLabelText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  reviewCount: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  scoreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  scoreBar: {
    height: "100%",
    borderRadius: 4,
  },
  scoreValue: {
    width: 36,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default DemographicBreakdown;
