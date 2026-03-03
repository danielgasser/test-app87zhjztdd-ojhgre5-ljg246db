import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { premiumStyles } from "@/styles/premiumStyles";
import { APP_CONFIG } from "@/config/appConfig";

interface PremiumPromptContentProps {
  featureLabel: string;
  requiredTier: string;
  description: string | null;
  showWatchAd: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onWatchAd: () => void;
}

export function PremiumPromptContent({
  featureLabel,
  requiredTier,
  description,
  showWatchAd,
  onClose,
  onUpgrade,
  onWatchAd,
}: PremiumPromptContentProps) {
  return (
    <>
      <View style={premiumStyles.iconContainer}>
        <Ionicons name="star" size={32} color={theme.colors.accent} />
      </View>
      <Text style={premiumStyles.title}>Premium Feature</Text>
      <Text style={premiumStyles.featureName}>{featureLabel}</Text>
      <Text style={premiumStyles.description}>
        {description || `Upgrade to ${requiredTier} to unlock this feature.`}
      </Text>
      <View style={premiumStyles.buttons}>
        <TouchableOpacity style={premiumStyles.cancelButton} onPress={onClose}>
          <Text style={premiumStyles.cancelButtonText}>Not Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={premiumStyles.upgradeButton}
          onPress={onUpgrade}
        >
          <Ionicons name="star" size={16} color={theme.colors.background} />
          <Text style={premiumStyles.upgradeButtonText}>Upgrade</Text>
        </TouchableOpacity>
      </View>
      {showWatchAd && (
        <View style={premiumStyles.watchAdContainer}>
          <TouchableOpacity
            style={premiumStyles.watchAdButton}
            onPress={onWatchAd}
          >
            <Ionicons
              name="play-circle"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={premiumStyles.watchAdButtonText}>
              Watch Ad (${APP_CONFIG.PREMIUM.AD_REWARD_DURATION_HOURS}h free)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
