import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../src/styles/theme";
import SettingToggle from "@/components/SettingsToggle";
import { useAppSelector } from "../src/store/hooks";
import { ActivityIndicator } from "react-native";

export default function PrivacySettings() {
  const user = useAppSelector((state: any) => state.auth.user);
  const profile = useAppSelector((state: any) => state.user.profile);

  const [showDemographics, setShowDemographics] = useState(false);
  const [allowLocationHistory, setAllowLocationHistory] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setShowDemographics(profile.show_demographics ?? true);
      setProfileVisibility(profile.privacy_level === "public");
      setLoading(false);
    }
  }, [profile]);
  if (loading) {
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
          <Text style={styles.headerTitle}>Privacy Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Demographic Privacy</Text>

          <SettingToggle
            label="Show demographics on reviews"
            description="Display your demographic information when you post reviews"
            value={showDemographics}
            onToggle={() => setShowDemographics(!showDemographics)}
          />

          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
            Profile Privacy
          </Text>

          <SettingToggle
            label="Public profile"
            description="Allow other users to view your profile and travel statistics"
            value={profileVisibility}
            onToggle={() => setProfileVisibility(!profileVisibility)}
          />

          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
            Location & History
          </Text>

          <SettingToggle
            label="Save location history"
            description="Keep track of places you've visited for personalized recommendations"
            value={allowLocationHistory}
            onToggle={() => setAllowLocationHistory(!allowLocationHistory)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
    marginBottom: theme.spacing.lg,
  },
  sectionTitleSpaced: {
    marginTop: theme.spacing.xl,
  },
});
