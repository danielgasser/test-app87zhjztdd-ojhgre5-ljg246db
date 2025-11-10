import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { MLPrediction } from "@/store/locationsSlice";

interface PredictionBadgeProps {
  prediction: MLPrediction;
  loading?: boolean;
}

const PredictionBadge: React.FC<PredictionBadgeProps> = ({
  prediction,
  loading,
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <Ionicons
          name="hourglass-outline"
          size={16}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.loadingText}>Getting prediction...</Text>
      </View>
    );
  }

  if (!prediction) {
    return null;
  }

  const confidencePercent = Math.round(prediction.confidence * 100);

  // Determine badge color based on confidence
  const getBadgeColor = (confidence: number) => {
    if (confidence >= 70) return theme.colors.success;
    if (confidence >= 30) return theme.colors.accent;
    return theme.colors.error;
  };

  // 🆕 CHANGE #1: Get confidence level text
  const getConfidenceLevel = (confidence: number): string => {
    if (confidence >= 70) return "High confidence";
    if (confidence >= 30) return "Medium confidence";
    return "Low confidence";
  };

  // 🆕 CHANGE #2: Get "based on" text based on primary source
  const getBasedOnText = (): string => {
    const source = prediction.primary_source;
    const basedOn = prediction.based_on;

    if (source === "community_reviews" && basedOn?.reviewsFromMatchingDemo) {
      return `Based on ${basedOn.reviewsFromMatchingDemo} reviews from people like you`;
    } else if (source === "ml_prediction") {
      return `Based on similar locations`;
    } else if (source === "statistics") {
      return `Based on area statistics`;
    }

    // Fallback to old behavior
    return prediction.based_on_locations > 0
      ? `Based on ${prediction.based_on_locations} locations`
      : "Limited data";
  };

  // 🆕 CHANGE #3: Get header text based on source
  const getHeaderText = (): string => {
    const source = prediction.primary_source;

    if (source === "statistics") {
      return "Safety Prediction";
    } else if (source === "ml_prediction") {
      return "AI Prediction";
    }
    return "AI Safety Prediction";
  };

  const badgeColor = getBadgeColor(confidencePercent);

  return (
    <View
      style={[
        styles.container,
        { borderLeftWidth: 4, borderLeftColor: badgeColor },
      ]}
    >
      {/* 🆕 Header changes based on source */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
        <Text style={styles.headerText}>{getHeaderText()}</Text>
      </View>

      <Text style={styles.scoreText}>
        {prediction.predicted_safety_score.toFixed(1)}
        <Text style={styles.scoreSubtext}>/5</Text>
      </Text>

      {/* 🆕 Confidence level text + based on text */}
      <Text style={styles.confidenceText}>
        {getConfidenceLevel(confidencePercent)} • {getBasedOnText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    marginHorizontal: 14,
    gap: 6,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    marginLeft: 6,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  scoreSubtext: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  confidenceText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});

export default PredictionBadge;
