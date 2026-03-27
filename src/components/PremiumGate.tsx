import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureName } from "@/config/features";
import { theme } from "@/styles/theme";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

type FallbackBehavior = "hide" | "blur" | "prompt";

interface PremiumGateProps {
  feature: FeatureName;
  children: React.ReactNode;
  fallback?: FallbackBehavior;
  onUpgradePress?: () => void;
  minHeight?: number;
}

export function PremiumGate({
  feature,
  children,
  fallback = "prompt",
  onUpgradePress,
  minHeight = 120,
}: PremiumGateProps) {
  const { t } = useTranslation();

  const { hasAccess, featureLabel, requiredTier } = useFeatureAccess(feature);
  if (hasAccess) {
    return <>{children}</>;
  }

  switch (fallback) {
    case "hide":
      return null;

    case "blur":
      return (
        <View>
          <TouchableOpacity
            style={[styles.blurContainer, { minHeight }]}
            onPress={onUpgradePress || (() => router.push("/subscription"))}
            activeOpacity={0.8}
          >
            <View style={styles.blurredContent}>{children}</View>
            <View style={styles.blurOverlay}>
              <Ionicons
                name="lock-closed"
                size={32}
                color={theme.colors.primary}
              />
              <Text style={styles.blurText}>
                <Ionicons name="star" size={24} color={theme.colors.accent} />
                {requiredTier.charAt(0).toUpperCase() +
                  requiredTier.slice(1)}{" "}
                Feature
              </Text>
              <Text style={styles.tapToUpgrade}>
                {t("premium.tap_to_upgrade")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    case "prompt":
    default:
      return (
        <TouchableOpacity
          style={styles.promptContainer}
          onPress={onUpgradePress || (() => router.push("/subscription"))}
        >
          <View style={styles.promptContent}>
            <Ionicons
              name="lock-closed"
              size={24}
              color={theme.colors.primary}
            />
            <View style={styles.promptTextContainer}>
              <Text style={styles.promptTitle}>{featureLabel}</Text>
              <Text style={styles.promptSubtitle}>
                Upgrade to {requiredTier} to unlock
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </View>
        </TouchableOpacity>
      );
  }
}

export { GlobalPremiumPromptModal } from "./premium/GlobalPremiumPromptModal";

const styles = StyleSheet.create({
  blurContainer: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 12,
    minHeight: 120,
  },
  blurredContent: {
    opacity: 0.3,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  blurText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  tapToUpgrade: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textOnPrimary,
    padding: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  promptContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
  },
  promptContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  promptTextContainer: {
    flex: 1,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  promptSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

export default PremiumGate;
