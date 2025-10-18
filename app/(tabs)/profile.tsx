import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
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

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { profile, loading } = useAppSelector((state) => state.user);
  const [uploading, setUploading] = useState(false);
  const isLoggedIn = !!user;
  const hasCompletedOnboarding = !!profile;
  const handleLogout = async () => {
    try {
      await dispatch(signOut()).unwrap();
      router.replace("/(auth)/login");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out");
    }
  };

  const handleEditProfile = () => {
    router.push("/onboarding");
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
      Alert.alert(
        "Permission Denied",
        "We need camera roll permissions to upload a profile picture."
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

      Alert.alert("Success", "Profile picture updated!");
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeProfilePicture = async () => {
    Alert.alert(
      "Remove Profile Picture",
      "Are you sure you want to remove your profile picture?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setUploading(true);
              await dispatch(
                updateUserProfile({
                  userId: user!.id,
                  profileData: { avatar_url: undefined },
                })
              ).unwrap();
              Alert.alert("Success", "Profile picture removed!");
            } catch (error) {
              Alert.alert("Error", "Failed to remove profile picture.");
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  const renderDemographics = () => {
    if (!profile) return null;

    const demographics = [];
    if (profile.race_ethnicity && profile.race_ethnicity.length > 0) {
      demographics.push(`Race/Ethnicity: ${profile.race_ethnicity.join(", ")}`);
    }
    if (profile.gender) {
      demographics.push(`Gender: ${profile.gender}`);
    }
    if (profile.lgbtq_status !== undefined) {
      demographics.push(`LGBTQ+: ${profile.lgbtq_status ? "Yes" : "No"}`);
    }
    if (profile.disability_status && profile.disability_status.length > 0) {
      demographics.push(
        `Disabilities: ${profile.disability_status.join(", ")}`
      );
    }
    if (profile.religion) {
      demographics.push(`Religion: ${profile.religion}`);
    }
    if (profile.age_range) {
      demographics.push(`Age: ${profile.age_range}`);
    }

    return demographics.map((demo, index) => (
      <Text key={index} style={styles.demographicText}>
        {demo}
      </Text>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {!isLoggedIn ? (
          // NOT LOGGED IN - Only show Sign In button
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
          // LOGGED IN but NO PROFILE - Show Set Up Profile
          <View style={styles.setupContainer}>
            <Text style={styles.setupTitle}>Complete Your Profile</Text>
            <Text style={styles.setupDescription}>
              Set up your profile to get personalized safety recommendations
            </Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => router.push("/onboarding")}
            >
              <Text style={styles.setupButtonText}>Set Up Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // LOGGED IN and HAS PROFILE - Show full profile UI
          <>
            <View style={styles.header}>
              {/* Avatar section */}
              <TouchableOpacity
                onPress={pickImage}
                disabled={uploading}
                style={styles.avatarContainer}
              >
                {uploading ? (
                  <View style={styles.avatarPlaceholder}>
                    <ActivityIndicator
                      size="large"
                      color={theme.colors.primary}
                    />
                  </View>
                ) : profile?.avatar_url ? (
                  <>
                    <Image
                      key={profile.avatar_url}
                      source={{ uri: profile.avatar_url }}
                      style={styles.avatar}
                    />
                  </>
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={50} color="#999" />
                  </View>
                )}
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={20} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* User info */}
              <Text style={styles.name}>
                {profile.full_name || "SafePath User"}
              </Text>
              <Text style={styles.email}>{user.email}</Text>

              {/* Edit Profile Button */}
              <TouchableOpacity onPress={handleEditProfile}>
                <Text style={styles.editText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
            {/* Reset Banners Button (for testing)
                    // ToDo: remove in production (before Realease)
       */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                { backgroundColor: theme.colors.warning },
              ]}
              onPress={async () => {
                await AsyncStorage.removeItem("profile_banner_dismissals");
                // Import resetAll from the slice
                dispatch(resetAll());
                Alert.alert("Success", "All banner dismissals cleared!");
              }}
            >
              <Ionicons
                name="refresh"
                size={24}
                color={theme.colors.background}
              />
              <Text
                style={[styles.menuText, { color: theme.colors.background }]}
              >
                Reset Banners (Testing)
              </Text>
            </TouchableOpacity>
            {/* Demographics Card */}
            <View style={styles.demographicsCard}>{renderDemographics()}</View>
            {/* Profile Completion Widget - ADD THIS */}
            <View style={{ paddingHorizontal: 20 }}>
              <ProfileCompletionWidget
                missingFields={profileCompletion.missingFields}
                completionPercentage={profileCompletion.completionPercentage}
              />
            </View>
            {/* Settings Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderSettings}>
                <Text style={styles.sectionTitle}>Settings</Text>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => router.push("/notification-settings")}
                >
                  <MaterialIcons name="notifications" size={24} color="#333" />
                  <Text style={styles.menuText}>Notifications</Text>
                  <MaterialIcons name="chevron-right" size={24} color="#999" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => router.push("/privacy-settings")}
                >
                  <MaterialIcons name="privacy-tip" size={24} color="#333" />
                  <Text style={styles.menuText}>Privacy</Text>
                  <MaterialIcons name="chevron-right" size={24} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  notLoggedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
    marginTop: 100,
  },
  name: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  notLoggedInText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 8,
  },
  signInButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  setupContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
    marginTop: 100,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  setupDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    alignItems: "center",
    padding: 30,
    backgroundColor: theme.colors.card,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: theme.colors.inputBorder,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: theme.colors.border,
  },
  removePhotoText: {
    color: theme.colors.error,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  email: {
    fontSize: 18,
    color: theme.colors.text,
    marginTop: 10,
  },
  fullName: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginTop: 20,
    backgroundColor: theme.colors.background,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: theme.spacing.md,
  },
  sectionHeaderSettings: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  editProfile: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  editText: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  demographicsCard: {
    marginHorizontal: 20,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
  },
  demographicText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  setupButton: {
    marginHorizontal: 20,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    alignItems: "center",
  },
  setupButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  menuText: {
    flex: 1,
    fontSize: 20,
    color: theme.colors.text,
    marginLeft: 15,
  },
  logoutButton: {
    margin: 20,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: {
    color: theme.colors.textOnPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
});
