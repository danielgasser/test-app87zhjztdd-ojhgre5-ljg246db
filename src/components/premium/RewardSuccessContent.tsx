import React from "react";
import { View, TouchableOpacity } from "react-native";
import { AppText as Text } from "@/components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { premiumStyles } from "@/styles/premiumStyles";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { formatDateTime } from "@/utils/timeHelpers";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
      <Text style={premiumStyles.title}>{t("premium.access_granted")}</Text>
      <Text style={premiumStyles.featureName}>{featureLabel}</Text>
      <Text style={premiumStyles.description}>
        {`Active until ${formatDateTime(expiresAt, timeFormat)}`}
      </Text>
      <TouchableOpacity style={premiumStyles.okButton} onPress={onClose}>
        <Text style={premiumStyles.okButtonText}>{t("common.ok")}</Text>
      </TouchableOpacity>
    </>
  );
}
