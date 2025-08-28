import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
        <Ionicons name="hourglass-outline" size={16} color="#666" />
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

  console.log(`🎯 PredictionBadge: Raw confidence:`, prediction.confidence);
  console.log(
    `🎯 PredictionBadge: Confidence type:`,
    typeof prediction.confidence
  );
  console.log(`🎯 PredictionBadge: Calculated percentage:`, confidencePercent);

  // Determine badge color based on confidence
  const getBadgeColor = (confidence: number) => {
    if (confidence >= 70) return "#4CAF50"; // Green - High confidence
    if (confidence >= 30) return "#FF9800"; // Orange - Medium confidence
    return "#F44336"; // Red - Low confidence
  };

  const badgeColor = getBadgeColor(confidencePercent);

  return (
    <View style={[styles.container, { backgroundColor: badgeColor }]}>
      <Ionicons name="bulb" size={16} color="#FFF" />
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
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  confidenceText: {
    color: "#FFF",
    fontSize: 12,
    opacity: 0.9,
  },
  loadingText: {
    color: "#666",
    fontSize: 14,
  },
});

export default PredictionBadge;
