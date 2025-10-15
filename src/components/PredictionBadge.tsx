import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";

interface MLPrediction {
  confidence: number;
  predicted_safety_score: number;
  based_on_locations: number;
}
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
        <Text style={styles.loadingText}>Getting AI prediction...</Text>
      </View>
    );
  }

  if (!prediction) {
    return null;
  }

  // 🚨 CRITICAL: This is likely where the bug was!
  // Convert decimal confidence to percentage properly
  const confidencePercent = Math.round(prediction.confidence * 100);

  // Determine badge color based on confidence
  const getBadgeColor = (confidence: number) => {
    if (confidence >= 70) return theme.colors.success; // Green - High confidence
    if (confidence >= 30) return theme.colors.accent; // Orange - Medium confidence
    return theme.colors.error; // Red - Low confidence
  };

  const badgeColor = getBadgeColor(confidencePercent);

  return (
    <View style={[styles.container, { backgroundColor: badgeColor }]}>
      <Ionicons name="bulb" size={16} color={theme.colors.background} />
      <Text style={styles.predictionText}>
        AI Prediction: {prediction.predicted_safety_score.toFixed(1)}/5
      </Text>
      <Text style={styles.confidenceText}>
        ({confidencePercent}% confident)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  predictionText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: "600",
  },
  confidenceText: {
    color: theme.colors.background,
    fontSize: 12,
    opacity: 0.9,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});

export default PredictionBadge;
