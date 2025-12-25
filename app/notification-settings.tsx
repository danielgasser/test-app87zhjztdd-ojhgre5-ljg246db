import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../src/styles/theme";
import SettingToggle from "../src/components/SettingToggle";
import { useAppSelector, useAppDispatch } from "../src/store/hooks";
import { updateUserProfile } from "../src/store/userSlice";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { NotificationPreferences } from "../src/store/userSlice";
import { useAuth } from "@/providers/AuthProvider";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { showPremiumPrompt } from "@/store/premiumPromptSlice";
import { commonStyles } from "@/styles/common";

export default function NotificationSettings() {
  const { user } = useAuth();
  const profile = useAppSelector((state: any) => state.user.profile);

  // Notification preferences state
  const [safetyAlerts, setSafetyAlerts] = useState(true);
  const [routeSafetyChanges, setRouteSafetyChanges] = useState(true);
  const [locationTriggers, setLocationTriggers] = useState(false);
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();
  const { hasAccess: hasLocationTriggersAccess } =
    useFeatureAccess("locationTriggers");

  // Load settings from profile when available
  useEffect(() => {
    if (profile) {
      // TODO: Load from profile notification preferences when we add the field
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      const prefs: NotificationPreferences =
        profile.notification_preferences || {};
      setSafetyAlerts(prefs.safety_alerts ?? true);
      setRouteSafetyChanges(prefs.route_safety_changes ?? true);
      setLocationTriggers(prefs.location_triggers ?? false);

      setLoading(false);
    }
  }, [profile]);

  const saveNotificationPreference = async (
    field: string,
    value: boolean | string
  ) => {
    if (!user) return;
    try {
      const updatedPrefs = {
        ...profile.notification_preferences,
        [field]: value,
      };

      await dispatch(
        updateUserProfile({
          userId: user.id,
          profileData: { notification_preferences: updatedPrefs },
        })
      ).unwrap();
    } catch (error) {
      notify.error("Failed to save setting. Please try again.");
      logger.error("Save error:", error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={commonStyles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Header */}
      <View style={commonStyles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[commonStyles.primaryButton, commonStyles.backButton]}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Notifications</Text>
        <View style={commonStyles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content}>
        <SettingToggle
          label="Safety Alerts"
          description="Get real-time alerts about unsafe areas on your route"
          value={safetyAlerts}
          onToggle={async () => {
            const newValue = !safetyAlerts;
            setSafetyAlerts(newValue);
            await saveNotificationPreference("safety_alerts", newValue);
          }}
        />

        <SettingToggle
          label="Location Safety Changes"
          description="Alerts when a previously-safe location gets new negative reviews"
          value={routeSafetyChanges}
          onToggle={async () => {
            const newValue = !routeSafetyChanges;
            setRouteSafetyChanges(newValue);
            await saveNotificationPreference("route_safety_changes", newValue);
          }}
        />

        <SettingToggle
          label="Proactive Safety Alerts"
          description="Get notified when you're near a highly-rated spot"
          value={locationTriggers}
          onToggle={async () => {
            // If free user tries to enable, show premium prompt
            if (!hasLocationTriggersAccess && !locationTriggers) {
              dispatch(
                showPremiumPrompt({
                  feature: "locationTriggers",
                  description:
                    "Get notified when you're near highly-rated safe spots for your demographics.",
                })
              );
              return;
            }

            const newValue = !locationTriggers;
            setLocationTriggers(newValue);
            await saveNotificationPreference("location_triggers", newValue);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  sectionTitleSpaced: {
    marginTop: theme.spacing.xl,
  },
});
