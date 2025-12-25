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
import {
  updateUserProfile,
  NotificationPreferences,
} from "../src/store/userSlice";
import { getDefaultPreferences } from "@/utils/preferenceDefaults";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { useAuth } from "@/providers/AuthProvider";
import { commonStyles } from "@/styles/common";

export default function DisplaySettings() {
  const { user } = useAuth();
  const profile = useAppSelector((state: any) => state.user.profile);
  const userCountry = useAppSelector(
    (state: any) => state.locations.userCountry
  );

  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h");
  const [distanceUnit, setDistanceUnit] = useState<"metric" | "imperial">(
    "metric"
  );
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();

  // Load settings from profile when available
  useEffect(() => {
    if (profile) {
      const prefs: NotificationPreferences =
        profile.notification_preferences || {};

      // Load preferences or use country-based defaults
      const defaults = getDefaultPreferences(userCountry);
      setTimeFormat(prefs.time_format ?? defaults.time_format);
      setDistanceUnit(prefs.distance_unit ?? defaults.distance_unit);

      setLoading(false);
    }
  }, [profile, userCountry]);

  const savePreference = async (field: string, value: string) => {
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

      notify.success("Preference saved");
    } catch (error) {
      notify.error("Failed to save preference. Please try again.");
      logger.error("Save error:", error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
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
        <Text style={styles.headerTitle}>Display Preferences</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionDescription}>
          Customize how times and distances are displayed throughout the app
        </Text>

        <SettingToggle
          label="Time Format"
          description={`Show times in ${
            timeFormat === "12h" ? "12-hour (3:45 PM)" : "24-hour (15:45)"
          } format`}
          value={timeFormat === "12h"}
          onToggle={async () => {
            const newFormat = timeFormat === "12h" ? "24h" : "12h";
            setTimeFormat(newFormat);
            await savePreference("time_format", newFormat);
          }}
        />

        <SettingToggle
          label="Distance Units"
          description={`Show distances in ${
            distanceUnit === "metric"
              ? "kilometers and meters"
              : "miles and feet"
          }`}
          value={distanceUnit === "metric"}
          onToggle={async () => {
            const newUnit = distanceUnit === "metric" ? "imperial" : "metric";
            setDistanceUnit(newUnit);
            await savePreference("distance_unit", newUnit);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
