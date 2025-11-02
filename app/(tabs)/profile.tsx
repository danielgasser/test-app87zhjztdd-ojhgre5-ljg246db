import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Pressable,
  GestureResponderEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { signOut } from "src/store/authSlice";
import { updateUserProfile, fetchUserProfile } from "src/store/userSlice";
import { supabase } from "src/services/supabase";
import { theme } from "src/styles/theme";
import { router } from "expo-router";
import { decode } from "base64-arraybuffer";
import ProfileCompletionWidget from "@/components/ProfileCompletionWidget";
import { checkProfileCompleteness } from "@/utils/profileValidation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resetAll } from "@/store/profileBannerSlice";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { APP_CONFIG } from "@/utils/appConfig";
const appConfig = require("../../app.config.js");

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { profile, loading } = useAppSelector((state) => state.user);
  const [uploading, setUploading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    activity: true,
    demographics: false,
    settings: false,
    account: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };
  const isLoggedIn = !!user;
  const hasCompletedOnboarding = !!profile;
  const handleLogout = async () => {
    try {
      await dispatch(signOut()).unwrap();
      router.replace("/(auth)/login");
    } catch (error) {
      notify.error("Failed to sign out");
    }
  };

  const handleEditProfile = () => {
    router.push("/onboarding");
  };

  const handleVersionLongPress = () => {
    // Check if user is authorized
    if (
      user?.email &&
      APP_CONFIG.DEBUG.AUTHORIZED_EMAILS.includes(user.email)
    ) {
      router.push("/(tabs)/debug");
    }
  };
  // Calculate profile completion
  const profileCompletion = React.useMemo(() => {
    if (!profile) return { missingFields: [], completionPercentage: 0 };

    const result = checkProfileCompleteness(profile);
    return {
      missingFields: result.missingFields,
      completionPercentage: result.completionPercentage,
    };
  }, [profile]);

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      notify.confirm(
        "We need camera roll access to upload profile pictures. Would you like to open settings?",
        "Permission Denied",
        [
          { text: "Cancel", style: "cancel", onPress: () => {} },
          {
            text: "Open Settings",
            style: "default",
            onPress: () => Linking.openSettings(),
          },
        ],
        "warning"
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      // Create file name
      const fileName = `${user?.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      // Fetch the image and convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create a FileReader to convert blob to base64
      const fileReaderInstance = new FileReader();
      fileReaderInstance.readAsDataURL(blob);

      const base64data = await new Promise((resolve) => {
        fileReaderInstance.onload = () => {
          const base64String = fileReaderInstance.result as string;
          const base64 = base64String.split(",")[1];
          resolve(base64);
        };
      });

      // Decode base64 string
      const { data, error: uploadError } = await supabase.storage
        .from("user-avatars")
        .upload(filePath, decode(base64data as string), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("user-avatars").getPublicUrl(filePath);

      await dispatch(
        updateUserProfile({
          userId: user!.id,
          profileData: { avatar_url: publicUrl },
        })
      ).unwrap();

      // Refresh the profile to ensure we have the latest data
      await dispatch(fetchUserProfile(user!.id));
      notify.success("Profile picture updated!", "Success");
    } catch (error: any) {
      logger.error("Upload error:", error);
      notify.error("Failed to upload image. Please try again.", "Upload Error");
    } finally {
      setUploading(false);
    }
  };

  const removeProfilePicture = async () => {
    try {
      setUploading(true);

      // Update profile to remove avatar_url
      await dispatch(
        updateUserProfile({
          userId: user!.id,
          profileData: { avatar_url: null }, // Changed from undefined to null
        })
      ).unwrap();

      // Refresh profile to get updated data
      await dispatch(fetchUserProfile(user!.id));

      notify.success("Profile picture removed!");
    } catch (error) {
      logger.error("Remove avatar error:", error);
      notify.error("Failed to remove profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProfilePicture = () => {
    notify.confirm(
      "Are you sure you want to remove your profile picture?",
      "Remove Profile Picture",
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        { text: "Remove", style: "destructive", onPress: removeProfilePicture },
      ],
      "warning"
    );
  };

  const renderDemographics = () => {
    if (!profile) return null;

    const demographics = [];

    if (profile.race_ethnicity && profile.race_ethnicity.length > 0) {
      demographics.push(...profile.race_ethnicity);
    }
    if (profile.gender) {
      demographics.push(profile.gender);
    }
    if (profile.lgbtq_status) {
      demographics.push("LGBTQ+");
    }
    if (profile.disability_status && profile.disability_status.length > 0) {
      demographics.push(
        ...profile.disability_status.map((d) => `Disability: ${d}`)
      );
    }
    if (profile.religion) {
      demographics.push(profile.religion);
    }
    if (profile.age_range) {
      demographics.push(profile.age_range);
    }

    if (demographics.length === 0) {
      return (
        <Text style={styles.noDemographicsText}>No demographics added yet</Text>
      );
    }

    return (
      <View style={styles.demographicsChipContainer}>
        {demographics.map((demo, index) => (
          <View key={index} style={styles.demographicChip}>
            <Text style={styles.demographicChipText}>{demo}</Text>
          </View>
        ))}
      </View>
    );
  };

  function handleDeleteAccount(event: GestureResponderEvent): void {
    throw new Error("Function not implemented.");
  }

  return (
    <SafeAreaView style={styles.container}>
      {!isLoggedIn ? (
        <View style={styles.notLoggedInContainer}>
          <Text style={styles.notLoggedInText}>
            Please sign in to view your profile
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : !hasCompletedOnboarding ? (
        <View style={styles.onboardingContainer}>
          <Ionicons
            name="information-circle"
            size={64}
            color={theme.colors.primary}
          />
          <Text style={styles.onboardingTitle}>Complete Your Profile</Text>
          <Text style={styles.onboardingText}>
            Add your demographic information to get personalized safety
            recommendations
          </Text>
          <TouchableOpacity
            style={styles.completeProfileButton}
            onPress={() => router.push("/onboarding")}
          >
            <Text style={styles.completeProfileButtonText}>
              Complete Profile
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.profileContainer}>
          {/* Fixed Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.avatarContainer}
            >
              {uploading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} />
              ) : profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={40}
                    color={theme.colors.textSecondary}
                  />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons
                  name="camera"
                  size={16}
                  color={theme.colors.textOnPrimary}
                />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>
              {profile?.full_name || "SafePath User"}
            </Text>
            <Text style={styles.memberSince}>
              Member since{" "}
              {new Date(profile?.created_at || Date.now()).toLocaleDateString()}
            </Text>
          </View>

          {/* Collapsible Sections */}
          <ScrollView
            style={styles.sectionsContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Activity Section */}
            <CollapsibleSection
              title="My Activity"
              icon="stats-chart"
              isExpanded={expandedSections.activity}
              onToggle={() => toggleSection("activity")}
            >
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {profile?.total_reviews || 0}
                  </Text>
                  <Text style={styles.statLabel}>Reviews Posted</Text>
                </View>
              </View>
            </CollapsibleSection>
            {/* Demographics Section */}
            <CollapsibleSection
              title="Demographics"
              icon="people"
              isExpanded={expandedSections.demographics}
              onToggle={() => toggleSection("demographics")}
            >
              {renderDemographics()}
            </CollapsibleSection>
            {/* Settings Section */}
            {/* Settings Section */}
            <CollapsibleSection
              title="Settings"
              icon="settings"
              isExpanded={expandedSections.settings}
              onToggle={() => toggleSection("settings")}
            >
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push("/privacy-settings")}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.settingText}>Privacy Settings</Text>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push("/notification-settings")}
              >
                <Ionicons
                  name="notifications"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.settingText}>Notifications</Text>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </CollapsibleSection>
            {/* Account Section */}
            <CollapsibleSection
              title="Account"
              icon="person-circle"
              isExpanded={expandedSections.account}
              onToggle={() => toggleSection("account")}
            >
              <TouchableOpacity
                style={styles.accountItem}
                onPress={() => router.push("/onboarding")}
              >
                <Ionicons
                  name="create"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.accountText}>Edit Profile</Text>
              </TouchableOpacity>

              {profile?.avatar_url && (
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={handleRemoveProfilePicture}
                >
                  <Ionicons name="image" size={24} color={theme.colors.error} />
                  <Text
                    style={[styles.accountText, { color: theme.colors.error }]}
                  >
                    Remove Profile Picture
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.accountItem}
                onPress={handleLogout}
              >
                <Ionicons
                  name="log-out"
                  size={24}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.accountText}>Sign Out</Text>
              </TouchableOpacity>
            </CollapsibleSection>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={24}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
      {isExpanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  notLoggedInText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  signInButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  onboardingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  onboardingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  completeProfileButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  completeProfileButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  profileContainer: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.backgroundSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  memberSince: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  sectionsContainer: {
    flex: 1,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  sectionContent: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  statsGrid: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  demographicsChipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  demographicChip: {
    backgroundColor: theme.colors.primary + "20",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  demographicChipText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  noDemographicsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  accountText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
});
