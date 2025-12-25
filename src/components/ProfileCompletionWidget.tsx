import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FIELD_DISPLAY_NAMES } from "@/constants/profileRequirements";
import { theme } from "@/styles/theme";
import { commonStyles } from "@/styles/common";

interface ProfileCompletionWidgetProps {
  missingFields: string[];
  completionPercentage: number;
}
export default function ProfileCompletionWidget({
  missingFields,
  completionPercentage,
}: ProfileCompletionWidgetProps) {
  // Don't show if profile is complete
  if (completionPercentage === 100) {
    return (
      <View style={styles.completeContainer}>
        <Ionicons
          name="checkmark-circle"
          size={32}
          color={theme.colors.success}
        />
        <Text style={styles.completeText}>Profile Complete! ✨</Text>
      </View>
    );
  }

  const handleCompleteProfile = () => {
    if (missingFields.length > 0) {
      // Jump to first missing field
      router.push({
        pathname: "/onboarding",
        params: { jumpToField: missingFields[0] },
      });
    } else {
      // No missing fields, just go to onboarding
      router.push("/onboarding");
    }
  };

  return (
    <View style={styles.specContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="person-circle" size={24} color={theme.colors.primary} />
        <Text style={styles.title}>Profile Completion</Text>
        <Text style={styles.percentage}>{completionPercentage}%</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${completionPercentage}%` },
          ]}
        />
      </View>

      {/* Missing Fields */}
      {missingFields.length > 0 && (
        <View style={styles.missingFieldsContainer}>
          <Text style={styles.missingFieldsLabel}>
            Add {missingFields.length} more field
            {missingFields.length !== 1 ? "s" : ""}:
          </Text>
          <Text style={styles.missingFieldsList}>
            {missingFields
              .map((field) => FIELD_DISPLAY_NAMES[field])
              .join(", ")}
          </Text>
        </View>
      )}

      {/* Complete Button */}
      <TouchableOpacity
        style={commonStyles.primaryButton}
        onPress={handleCompleteProfile}
      >
        <Text style={commonStyles.primaryButtonText}>Complete Profile</Text>
        <Ionicons name="arrow-forward" size={16} color={theme.colors.card} />
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  specContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  completeContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  completeText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.success,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  percentage: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  missingFieldsContainer: {
    backgroundColor: theme.colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  missingFieldsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  missingFieldsList: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
});
