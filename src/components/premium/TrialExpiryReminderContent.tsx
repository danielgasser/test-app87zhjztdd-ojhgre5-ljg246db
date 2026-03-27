import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { premiumStyles } from "@/styles/premiumStyles";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { formatDateTime } from "@/utils/timeHelpers";
import { useTranslation } from "react-i18next";

interface TrialExpiryReminderContentProps {
  expiresAt: string;
  featureLabel: string;
  onClose: () => void;
  onUpgrade: () => void;
}

export function TrialExpiryReminderContent({
  expiresAt,
  featureLabel,
  onClose,
  onUpgrade,
}: TrialExpiryReminderContentProps) {
  const { t } = useTranslation();
  const { timeFormat } = useUserPreferences();

  const msRemaining = new Date(expiresAt).getTime() - Date.now();
  const hoursRemaining = Math.max(
    0,
    Math.floor(msRemaining / (1000 * 60 * 60)),
  );
  const minutesRemaining = Math.max(
    0,
    Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60)),
  );

  const timeLabel =
    hoursRemaining > 0
      ? `${hoursRemaining}h ${minutesRemaining}m`
      : `${minutesRemaining}m`;

  return (
    <>
      <View style={premiumStyles.iconContainer}>
        <Ionicons name="time-outline" size={32} color={theme.colors.warning} />
      </View>
      <Text style={premiumStyles.title}>
        {t("premium.trial_expiring_soon")}
      </Text>
      <Text style={premiumStyles.featureName}>{featureLabel}</Text>
      <Text style={premiumStyles.description}>
        {`Your free access expires in ${timeLabel} (${formatDateTime(expiresAt, timeFormat)}). Upgrade to keep it permanently.`}
      </Text>
      <View style={premiumStyles.buttons}>
        <TouchableOpacity style={premiumStyles.cancelButton} onPress={onClose}>
          <Text style={premiumStyles.cancelButtonText}>
            {t("common.dismiss")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={premiumStyles.upgradeButton}
          onPress={onUpgrade}
        >
          <Text style={premiumStyles.upgradeButtonText}>
            {t("common.upgrade")}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
