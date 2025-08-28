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
  Platform,
  TextInput,
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

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { profile, loading } = useAppSelector((state) => state.user);
  const [uploading, setUploading] = useState(false);

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
        <View style={styles.header}>
          {/* Profile Picture Section */}
          <TouchableOpacity
            onPress={pickImage}
            disabled={uploading}
            style={styles.avatarContainer}
          >
            {uploading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
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

          {profile?.avatar_url && !uploading && (
            <TouchableOpacity onPress={removeProfilePicture}>
              <Text style={styles.removePhotoText}>Remove Photo</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.email}>{user?.email}</Text>
          {profile?.full_name && (
            <Text style={styles.fullName}>
              {profile.full_name}

              <TextInput value={profile.id} />
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Demographics</Text>
            <TouchableOpacity onPress={handleEditProfile}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          {profile ? (
            <View style={styles.demographicsCard}>{renderDemographics()}</View>
          ) : (
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => router.push("/onboarding")}
            >
              <Text style={styles.setupButtonText}>Set up profile</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity style={styles.menuItem}>
            <MaterialIcons name="notifications" size={24} color="#333" />
            <Text style={styles.menuText}>Notifications</Text>
            <MaterialIcons name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <MaterialIcons name="privacy-tip" size={24} color="#333" />
            <Text style={styles.menuText}>Privacy</Text>
            <MaterialIcons name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
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
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#e0e0e0",
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
    borderColor: "#fff",
  },
  removePhotoText: {
    color: theme.colors.error,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  email: {
    fontSize: 18,
    color: "#333",
    marginTop: 10,
  },
  fullName: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  section: {
    marginTop: 20,
    backgroundColor: "#fff",
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  editText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  demographicsCard: {
    marginHorizontal: 20,
    padding: theme.spacing.md,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  demographicText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  setupButton: {
    marginHorizontal: 20,
    padding: theme.spacing.md,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
  },
  setupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 15,
  },
  logoutButton: {
    margin: 20,
    padding: theme.spacing.md,
    backgroundColor: "#ff3b30",
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
