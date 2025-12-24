import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureName } from "@/config/features";
import { theme } from "@/styles/theme";
import { router } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hidePremiumPrompt } from "@/store/premiumPromptSlice";

type FallbackBehavior = "hide" | "blur" | "prompt";

interface PremiumGateProps {
  feature: FeatureName;
  children: React.ReactNode;
  fallback?: FallbackBehavior;
  onUpgradePress?: () => void;
}

export function PremiumGate({
  feature,
  children,
  fallback = "prompt",
  onUpgradePress,
}: PremiumGateProps) {
  const { hasAccess, featureLabel, requiredTier } = useFeatureAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  switch (fallback) {
    case "hide":
      return null;

    case "blur":
      return (
        <TouchableOpacity
          style={styles.blurContainer}
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
            <Text style={styles.tapToUpgrade}>Tap To Upgrade</Text>
          </View>
        </TouchableOpacity>
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

// Global Premium Prompt Modal - mount once in _layout.tsx
export function GlobalPremiumPromptModal() {
  const dispatch = useAppDispatch();
  const { visible, feature, description } = useAppSelector(
    (state) => state.premiumPrompt
  );
  const { featureLabel, requiredTier } = useFeatureAccess(
    feature || "saveLocations"
  );

  const handleClose = () => {
    dispatch(hidePremiumPrompt());
  };

  const handleUpgrade = () => {
    dispatch(hidePremiumPrompt());
    setTimeout(() => {
      router.push("/subscription");
    }, 150);
  };

  if (!visible) return null;

  return (
    <View style={globalStyles.absoluteOverlay} pointerEvents="box-none">
      <TouchableOpacity
        style={globalStyles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={globalStyles.container}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={globalStyles.iconContainer}>
            <Ionicons name="star" size={32} color={theme.colors.accent} />
          </View>

          <Text style={globalStyles.title}>Premium Feature</Text>
          <Text style={globalStyles.featureName}>{featureLabel}</Text>
          <Text style={globalStyles.description}>
            {description ||
              `Upgrade to ${requiredTier} to unlock this feature.`}
          </Text>

          <View style={globalStyles.buttons}>
            <TouchableOpacity
              style={globalStyles.cancelButton}
              onPress={handleClose}
            >
              <Text style={globalStyles.cancelButtonText}>Not Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={globalStyles.upgradeButton}
              onPress={handleUpgrade}
            >
              <Ionicons name="star" size={16} color={theme.colors.background} />
              <Text style={globalStyles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}
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
    backgroundColor: "rgba(255,255,255,0.4)",
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

const globalStyles = StyleSheet.create({
  absoluteOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${theme.colors.accent}20`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 8,
  },
  featureName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  upgradeButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.background,
  },
});

export default PremiumGate;
