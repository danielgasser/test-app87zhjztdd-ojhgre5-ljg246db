import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { AppText as Text } from "@/components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from "@/services/revenueCatService";
import { theme } from "@/styles/theme";
import { notify } from "@/utils/notificationService";
import { commonStyles } from "@/styles/common";
import { useTranslation } from "react-i18next";

interface PaywallProps {
  onPurchaseComplete?: () => void;
  onClose?: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({
  onPurchaseComplete,
  onClose,
}) => {
  const { t } = useTranslation();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setIsLoading(true);
    const currentOffering = await getOfferings();
    setOffering(currentOffering);

    if (currentOffering?.annual) {
      setSelectedPackage(currentOffering.annual);
    }
    setIsLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    const result = await purchasePackage(selectedPackage);

    if (result.success) {
      notify.success(t("premium.welcome_to_truguide_premium"));
      onPurchaseComplete?.();
    } else if (result.error !== "User cancelled") {
      notify.error(result.error || "Purchase failed");
    }
    setIsPurchasing(false);
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    const result = await restorePurchases();

    if (result.isPremium) {
      notify.success(t("premium.purchases_restored"));
      onPurchaseComplete?.();
    } else if (result.success) {
      notify.info(t("premium.no_previous_purchases_found"));
    } else {
      notify.error(result.error || "Restore failed");
    }
    setIsPurchasing(false);
  };

  if (isLoading) {
    return (
      <View style={commonStyles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const packages = [
    { key: "monthly", pkg: offering?.monthly, label: "Monthly", savings: null },
    {
      key: "annual",
      pkg: offering?.annual,
      label: "Annual",
      savings: "Save 33%",
    },
    {
      key: "lifetime",
      pkg: offering?.lifetime,
      label: "Lifetime",
      savings: "Best Value",
    },
  ].filter((p) => p.pkg);

  return (
    <ScrollView
      style={commonStyles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.specHeader}>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.iconContainer}>
          <Ionicons
            name="shield-checkmark"
            size={48}
            color={theme.colors.primary}
          />
        </View>
        <Text style={styles.title}>{t("common.upgrade_to_premium")}</Text>
        <Text style={styles.subtitle}>
          {t("premium.unlock_all_features_and_travel_with")}
        </Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {[
          "Unlimited route history",
          "Offline route access",
          "Advanced safety filters",
          "Ad-free experience",
          "Priority support",
        ].map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.success}
            />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* Package Selection */}
      <View style={styles.packages}>
        {packages.map(({ key, pkg, label, savings }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.packageCard,
              selectedPackage?.identifier === pkg?.identifier &&
                styles.packageCardSelected,
            ]}
            onPress={() => setSelectedPackage(pkg!)}
          >
            {savings && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>{savings}</Text>
              </View>
            )}
            <Text style={styles.packageLabel}>{label}</Text>
            <Text style={styles.packagePrice}>{pkg?.product.priceString}</Text>
            {key !== "lifetime" && (
              <Text style={styles.packagePeriod}>
                /{key === "monthly" ? "month" : "year"}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Purchase Button */}
      <TouchableOpacity
        style={[
          styles.purchaseButton,
          isPurchasing && styles.purchaseButtonDisabled,
        ]}
        onPress={handlePurchase}
        disabled={isPurchasing || !selectedPackage}
      >
        {isPurchasing ? (
          <ActivityIndicator color={theme.colors.textOnPrimary} />
        ) : (
          <Text style={styles.purchaseButtonText}>
            {t("premium.subscribe_now")}
          </Text>
        )}
      </TouchableOpacity>

      {/* Restore */}
      <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
        <Text style={styles.restoreText}>{t("premium.restore_purchases")}</Text>
      </TouchableOpacity>

      {/* Legal */}
      <Text style={styles.legalText}>
        {t(
          Platform.OS === "ios"
            ? "premium.payment_legal_ios"
            : "premium.payment_legal_android",
        )}
      </Text>
      {/* Links */}
      <View style={styles.legalLinks}>
        <TouchableOpacity
          onPress={() => Linking.openURL("https://truguide.app/privacy-policy")}
        >
          <Text style={styles.linkText}>{t("common.privacy_policy")}</Text>
        </TouchableOpacity>
        <Text style={styles.legalText}>{t("common.unknown")}</Text>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
            )
          }
        >
          <Text style={styles.linkText}>{t("common.terms_of_use")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.lg,
  },
  specHeader: {
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  closeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: theme.spacing.sm,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  features: {
    marginBottom: theme.spacing.xl,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  featureText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  packages: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  packageCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  packageCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "10",
  },
  savingsBadge: {
    position: "absolute",
    top: -10,
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  packageLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  packagePeriod: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  purchaseButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textOnPrimary,
  },
  restoreButton: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  restoreText: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  legalText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  linkText: {
    fontSize: 12,
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
});
