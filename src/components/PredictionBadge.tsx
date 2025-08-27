import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface PredictionBadgeProps {
  predictedScore: number;
  confidence: number;
  style?: any;
}

export const PredictionBadge: React.FC<PredictionBadgeProps> = ({
  predictedScore,
  confidence,
  style,
}) => {
  const getBadgeColor = (score: number) => {
    if (score >= 4) return "#4CAF50";
    if (score >= 3) return "#FFC107";
    return "#F44336";
  };

  const getConfidenceText = (conf: number) => {
    if (conf >= 0.7) return "High";
    if (conf >= 0.4) return "Medium";
    return "Low";
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.badge,
          { backgroundColor: getBadgeColor(predictedScore) },
        ]}
      >
        <Text style={styles.scoreText}>{predictedScore.toFixed(1)}</Text>
        <Text style={styles.aiLabel}>AI</Text>
      </View>
      <View style={styles.confidenceContainer}>
        <Text style={styles.confidenceText}>
          {Math.round(confidence * 100)}% confident
        </Text>
        <Text style={styles.confidenceLevel}>
          {getConfidenceText(confidence)} confidence
        </Text>
      </View>
    </View>
  );
};

// Custom marker component for predicted locations
interface PredictedMarkerProps {
  coordinate: { latitude: number; longitude: number };
  title: string;
  predictedScore: number;
  confidence: number;
  onPress?: () => void;
}

export const PredictedMarker: React.FC<PredictedMarkerProps> = ({
  coordinate,
  title,
  predictedScore,
  confidence,
  onPress,
}) => {
  return (
    <View style={styles.markerContainer}>
      {/* Main marker pin */}
      <View
        style={[
          styles.markerPin,
          {
            backgroundColor:
              predictedScore >= 4
                ? "#4CAF50"
                : predictedScore >= 3
                ? "#FFC107"
                : "#F44336",
          },
        ]}
      >
        <Text style={styles.markerText}>{predictedScore.toFixed(1)}</Text>
      </View>

      {/* AI indicator */}
      <View style={styles.aiIndicator}>
        <Text style={styles.aiText}>🤖</Text>
      </View>

      {/* Confidence badge */}
      <View style={styles.confidenceBadge}>
        <Text style={styles.confidenceBadgeText}>
          {Math.round(confidence * 100)}%
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFF",
    opacity: 0.9,
  },
  confidenceContainer: {
    marginTop: 4,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  confidenceText: {
    fontSize: 10,
    color: "#FFF",
    fontWeight: "600",
  },
  confidenceLevel: {
    fontSize: 8,
    color: "#FFF",
    opacity: 0.8,
  },

  // Marker styles
  markerContainer: {
    alignItems: "center",
    position: "relative",
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  markerText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFF",
  },
  aiIndicator: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    backgroundColor: "#2196F3",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFF",
  },
  aiText: {
    fontSize: 10,
  },
  confidenceBadge: {
    marginTop: 2,
    backgroundColor: "rgba(33, 150, 243, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confidenceBadgeText: {
    fontSize: 9,
    color: "#FFF",
    fontWeight: "600",
  },
});
