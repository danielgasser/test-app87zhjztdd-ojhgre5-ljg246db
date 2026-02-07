import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
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

export default function LocationDisclosureScreen() {
  const { user, refreshOnboardingStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Request notification permissions
      const { status: notifStatus } =
        await Notifications.requestPermissionsAsync();
      logger.info(`Notification permission: ${notifStatus}`);

      // Request foreground location permission
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();
      logger.info(`Foreground location permission: ${foregroundStatus}`);

      // Request background location permission (required for navigation alerts)
      if (foregroundStatus === "granted") {
        const { status: backgroundStatus } =
          await Location.requestBackgroundPermissionsAsync();
        logger.info(`Background location permission: ${backgroundStatus}`);
      }

      // Save disclosure acceptance regardless of permission results
      const { error } = await supabase
        .from("profiles")
        .update({ location_disclosure_accepted_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) throw error;
      recordLocationDisclosureAcceptance().catch((err) => {
        logger.warn("Failed to record location disclosure to iubenda:", err);
      });
      await refreshOnboardingStatus();

      // NavigationController will handle routing to onboarding
    } catch (error) {
      logger.error("Failed to save location disclosure:", error);
      notify.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="location" size={64} color={theme.colors.primary} />
        </View>

        <Text style={styles.title}>Location Access</Text>
        <Text style={styles.subtitle}>
          TruGuide needs location access to keep you safe
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
              <Text style={styles.featureTitle}>Turn-by-Turn Navigation</Text>
              <Text style={styles.featureDescription}>
                Get directions with real-time safety ratings along your route
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="warning" size={24} color={theme.colors.warning} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Safety Alerts</Text>
              <Text style={styles.featureDescription}>
                Receive notifications when approaching areas with low safety
                ratings
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
              <Text style={styles.featureTitle}>Smart Rerouting</Text>
              <Text style={styles.featureDescription}>
                Get automatic suggestions for safer alternative routes
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.infoText}>
            Background location is used only during active navigation to provide
            safety alerts. Your location data is never sold or shared with third
            parties.
          </Text>
        </View>

        {Platform.OS === "android" && (
          <View style={styles.androidNote}>
            <Text style={styles.androidNoteText}>
              On the next screen, select "Allow all the time" for the best
              experience with navigation and safety alerts.
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
            <Text style={commonStyles.primaryButtonText}>Continue</Text>
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
    marginBottom: theme.spacing.xl,
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
