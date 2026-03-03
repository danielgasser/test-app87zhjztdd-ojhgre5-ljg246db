import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { premiumStyles } from "@/styles/premiumStyles";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { formatDateTime } from "@/utils/timeHelpers";

interface RewardSuccessContentProps {
  expiresAt: string;
  featureLabel: string;
  onClose: () => void;
}

export function RewardSuccessContent({
  expiresAt,
  featureLabel,
  onClose,
}: RewardSuccessContentProps) {
  const { timeFormat } = useUserPreferences();

  return (
    <>
      <View style={premiumStyles.iconContainer}>
        <Ionicons
          name="checkmark-circle"
          size={32}
          color={theme.colors.secondary}
        />
      </View>
      <Text style={premiumStyles.title}>Access Granted!</Text>
      <Text style={premiumStyles.featureName}>{featureLabel}</Text>
      <Text style={premiumStyles.description}>
        {`Active until ${formatDateTime(expiresAt, timeFormat)}`}
      </Text>
      <TouchableOpacity style={premiumStyles.okButton} onPress={onClose}>
        <Text style={premiumStyles.okButtonText}>OK</Text>
      </TouchableOpacity>
    </>
  );
}
