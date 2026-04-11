import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
  AppState,
} from "react-native";
import { AppText as Text } from "@/components/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { theme } from "@/styles/theme";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { recordLocationDisclosureAcceptance } from "@/services/consentService";
import { commonStyles } from "@/styles/common";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

export default function LocationDisclosureScreen() {
  const { t } = useTranslation();
  const { user, refreshOnboardingStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    foreground: false,
    background: false,
  });

  const handleContinue = async () => {
    console.log("handleContinue called, user?.id:", user?.id);

    if (!user?.id) return;

    setIsLoading(true);
    try {
      console.log("Requesting notification permissions...");
      // Request notification permissions
      const { status: notifStatus } =
        await Notifications.requestPermissionsAsync();
      logger.info(`Notification permission: ${notifStatus}`);
      console.log("Notification permission:", notifStatus);

      console.log("Updating profile...");
      // Save disclosure acceptance regardless of permission results
      const { error } = await supabase
        .from("profiles")
        .update({ location_disclosure_accepted_at: new Date().toISOString() })
        .eq("user_id", user.id);

      console.log("Profile update error:", error);
      if (error) throw error;
      console.log("Recording disclosure...");
      recordLocationDisclosureAcceptance().catch((err) => {
        logger.warn("Failed to record location disclosure to iubenda:", err);
      });
      console.log("Refreshing onboarding status...");
      await refreshOnboardingStatus();
      console.log("Done!");
      router.replace("/(tabs)");

      // NavigationController will handle routing to onboarding
    } catch (error) {
      logger.error("Failed to save location disclosure:", error);
      notify.error(t("common.something_went_wrong_please_try_again"));
    } finally {
      setIsLoading(false);
    }
  };

  const checkLocationPermissions = async () => {
    const foreground = await Location.getForegroundPermissionsAsync();
    const background = await Location.getBackgroundPermissionsAsync();

    console.log("Foreground:", foreground.status); // 'granted' | 'denied' | 'undetermined'
    console.log("Background:", background.status);

    return {
      foreground: foreground.status === "granted",
      background: background.status === "granted",
    };
  };
  useEffect(() => {
    checkLocationPermissions().then(setPermissions);
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkLocationPermissions().then(setPermissions);
      }
    });

    return () => subscription.remove();
  }, []);
  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="location" size={64} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>{t("legal.location_access")}</Text>
        <Text style={styles.subtitle}>
          {t("legal.truguide_needs_location_access_to_keep")}
        </Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons
                name="navigate"
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>
                {t("legal.turnbyturn_navigation")}
              </Text>
              <Text style={styles.featureDescription}>
                {t("legal.get_directions_with_realtime_safety")}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="warning" size={24} color={theme.colors.warning} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>
                {t("legal.safety_alerts")}
              </Text>
              <Text style={styles.featureDescription}>
                {t("legal.receive_notifications_when_approaching")}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons
                name="swap-horizontal"
                size={24}
                color={theme.colors.secondary}
              />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>
                {t("legal.smart_rerouting")}
              </Text>
              <Text style={styles.featureDescription}>
                {t("legal.get_automatic_suggestions_for_safer")}
              </Text>
            </View>
          </View>
        </View>
        {permissions.foreground && permissions.background ? (
          <View style={styles.infoBoxSettings}>
            <TouchableOpacity
              style={[commonStyles.secondaryButton, commonStyles.buttonFake]}
            >
              <Text style={commonStyles.secondaryButtonText}>
                {t("legal.location_access_granted")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoBoxSettings}>
            <TouchableOpacity
              style={commonStyles.secondaryButton}
              onPress={() => Linking.openSettings()}
            >
              <Text style={commonStyles.secondaryButtonText}>
                {t("common.open_settings")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.infoText}>
            {t("legal.background_location_is_used_only_during")}
          </Text>
        </View>
        {Platform.OS === "android" && (
          <View style={styles.androidNote}>
            <Text style={styles.androidNoteText}>
              {t("legal.on_the_next_screen_select_allow_all_the")}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={commonStyles.footer}>
        <TouchableOpacity
          style={commonStyles.primaryButton}
          onPress={handleContinue}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textOnPrimary} />
          ) : (
            <Text style={commonStyles.primaryButtonText}>
              {t("common.continue")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: theme.spacing.screenPadding,
  },
  iconContainer: {
    alignItems: "center",
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  featureList: {
    marginBottom: theme.spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    marginBottom: theme.spacing.lg,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  featureText: {
    flex: 1,
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
    zIndex: 100,
  },
  infoBoxSettings: {
    flex: 1,
    justifyContent: "center",
    marginTop: 0,
    marginBottom: theme.spacing.md,
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  androidNote: {
    backgroundColor: theme.colors.warning + "20",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  androidNoteText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
});
