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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
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
          description={
            hasLocationTriggersAccess
              ? "Get notified when you're near a highly-rated spot"
              : "Premium feature - Get notified when you're near a highly-rated spot"
          }
          value={hasLocationTriggersAccess && locationTriggers}
          onToggle={async () => {
            if (!hasLocationTriggersAccess) {
              router.push("/subscription");
              return;
            }
            const newValue = !locationTriggers;
            setLocationTriggers(newValue);
            await saveNotificationPreference("location_triggers", newValue);
          }}
          disabled={!hasLocationTriggersAccess}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  sectionTitleSpaced: {
    marginTop: theme.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
