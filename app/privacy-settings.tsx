import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Share,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../src/styles/theme";
import SettingToggle from "../src/components/SettingToggle";
import { useAppSelector } from "../src/store/hooks";
import { ActivityIndicator } from "react-native";
import { updateUserProfile } from "../src/store/userSlice";
import { supabase } from "@/services/supabase";
import { useAppDispatch } from "../src/store/hooks";
import { signOut } from "../src/store/authSlice";
import { fetchRecentReviews } from "@/store/locationsSlice";
import { notify } from "@/utils/notificationService";

export default function PrivacySettings() {
  const user = useAppSelector((state: any) => state.auth.user);
  const profile = useAppSelector((state: any) => state.user.profile);
  const userLocation = useAppSelector((state) => state.locations.userLocation);

  const [showDemographics, setShowDemographics] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewDataModalVisible, setViewDataModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (profile) {
      setShowDemographics(profile.show_demographics ?? true);
      setProfileVisibility(profile.privacy_level === "public");
      setLoading(false);
    }
  }, [profile]);

  const savePrivacySetting = async (field: string, value: any) => {
    try {
      await dispatch(
        updateUserProfile({
          userId: user.id,
          profileData: { [field]: value },
        })
      ).unwrap();

      // NEW: Reload community reviews after privacy change
      if (field === "show_demographics" && userLocation) {
        dispatch(
          fetchRecentReviews({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          })
        );
      }
    } catch (error) {
      notify.error("Failed to save setting. Please try again.");
      console.error("Save error:", error);
    }
  };

  const handleExportData = async () => {
    try {
      // Gather all user data
      const exportData = {
        account: {
          email: user?.email,
          created_at: user?.created_at,
          id: user?.id,
        },
        profile: {
          full_name: profile?.full_name,
          race_ethnicity: profile?.race_ethnicity,
          gender: profile?.gender,
          lgbtq_status: profile?.lgbtq_status,
          religion: profile?.religion,
          age_range: profile?.age_range,
          disability_status: profile?.disability_status,
          privacy_level: profile?.privacy_level,
          show_demographics: profile?.show_demographics,
        },
        privacy_settings: {
          demographics_visible: showDemographics,
          profile_public: profileVisibility,
        },
        export_date: new Date().toISOString(),
        note: "This is all the data SafePath has collected about you.",
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      // Create filename from email or user ID
      const username = user?.email?.split("@")[0] || `user_${user?.id}`;
      const filename = `safepath_data_${username}.json`;

      // For iOS/Android, the Share API will show the filename in some contexts
      if (Platform.OS === "ios") {
        await Share.share(
          {
            message: `${filename}\n\n${jsonString}`,
            title: filename,
          },
          {
            subject: filename,
            dialogTitle: `Export ${filename}`,
          }
        );
      } else {
        await Share.share(
          {
            message: jsonString,
            title: filename,
          },
          {
            subject: filename,
            dialogTitle: `Export ${filename}`,
          }
        );
      }
    } catch (error) {
      notify.error("Failed to export data. Please try again.");
      console.error("Export error:", error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteConfirmVisible(false);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        notify.error("You must be logged in to delete your account.");
        return;
      }

      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-account`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete account");
      }

      // Rest of success handling...
      await dispatch(signOut()).unwrap();

      notify.confirm(
        "Account Deleted",
        "Your account has been permanently deleted.",
        [{ text: "OK", onPress: () => router.replace("/welcome") }]
      );
    } catch (error) {
      console.error("=== DELETE ERROR ===", error);
      notify.error(`Failed to delete account: `);
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
        <Text style={styles.headerTitle}>Privacy Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Demographic Privacy</Text>

        <SettingToggle
          label="Show demographics on reviews"
          description="Display your demographic information when you post reviews"
          value={showDemographics}
          onToggle={async () => {
            const newValue = !showDemographics;
            setShowDemographics(newValue);
            await savePrivacySetting("show_demographics", newValue);
          }}
        />

        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          Profile Privacy
        </Text>

        <SettingToggle
          label="Public profile"
          description="Allow other users to view your profile and travel statistics"
          value={profileVisibility}
          onToggle={async () => {
            const newValue = !profileVisibility;
            setProfileVisibility(newValue);
            await savePrivacySetting(
              "privacy_level",
              newValue ? "public" : "private"
            );
          }}
        />
        {/*}
        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          Location & History
        </Text>

        <View style={styles.infoCard}>
          <MaterialIcons
            name="privacy-tip"
            size={24}
            color={theme.colors.primary}
          />
         
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Your Privacy Matters</Text>
            <Text style={styles.infoDescription}>
              SafePath does not track or store your location history. We only
              save locations when you explicitly leave a review.
            </Text>
          </View>
        </View>{*/}

        {/* Account Management Section */}
        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          Account Management
        </Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setViewDataModalVisible(true)}
        >
          <MaterialIcons name="folder" size={24} color={theme.colors.text} />
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>View My Data</Text>
            <Text style={styles.actionDescription}>
              See what information SafePath has collected
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleExportData}
        >
          <MaterialIcons
            name="download"
            size={24}
            color={theme.colors.primary}
          />
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Export My Data</Text>
            <Text style={styles.actionDescription}>
              Download all your data in JSON format
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => {
            setDeleteConfirmVisible(true);
          }}
        >
          <MaterialIcons
            name="delete-forever"
            size={24}
            color={theme.colors.error}
          />
          <View style={styles.actionTextContainer}>
            <Text style={[styles.actionTitle, styles.dangerText]}>
              Delete Account
            </Text>
            <Text style={styles.actionDescription}>
              Permanently delete your account and all data
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      </ScrollView>
      {/* View Data Modal */}
      <Modal
        visible={viewDataModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Data</Text>
            <TouchableOpacity onPress={() => setViewDataModalVisible(false)}>
              <MaterialIcons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.dataSection}>Profile Information</Text>
            <Text style={styles.dataText}>Email: {user?.email}</Text>
            <Text style={styles.dataText}>
              Name: {profile?.full_name || "Not set"}
            </Text>
            <Text style={styles.dataText}>
              Account Created: {new Date(user?.created_at).toLocaleDateString()}
            </Text>

            <Text style={styles.dataSection}>Demographic Data</Text>
            <Text style={styles.dataText}>
              Race/Ethnicity: {profile?.race_ethnicity?.join(", ") || "Not set"}
            </Text>
            <Text style={styles.dataText}>
              Gender: {profile?.gender || "Not set"}
            </Text>
            <Text style={styles.dataText}>
              LGBTQ+: {profile?.lgbtq_status ? "Yes" : "No"}
            </Text>
            <Text style={styles.dataText}>
              Religion: {profile?.religion || "Not set"}
            </Text>
            <Text style={styles.dataText}>
              Age Range: {profile?.age_range || "Not set"}
            </Text>
            <Text style={styles.dataText}>
              Disability Status:
              {profile?.disability_status?.join(", ") || "None"}
            </Text>

            <Text style={styles.dataSection}>Privacy Settings</Text>
            <Text style={styles.dataText}>
              Privacy Level: {profile?.privacy_level || "public"}
            </Text>
            <Text style={styles.dataText}>
              Show Demographics: {profile?.show_demographics ? "Yes" : "No"}
            </Text>

            <Text style={styles.dataSection}>Activity</Text>
            <Text style={styles.dataText}>Reviews Posted: Coming soon</Text>
            <Text style={styles.dataText}>Routes Planned: Not tracked</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <MaterialIcons
              name="warning"
              size={48}
              color={theme.colors.error}
            />
            <Text style={styles.deleteTitle}>Delete Account?</Text>
            <Text style={styles.deleteMessage}>
              This will permanently delete your account and all associated data
              including your profile, reviews, and settings.
              {"\n\n"}This action cannot be undone.
            </Text>
            <View style={styles.deleteButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={() => {
                  handleDeleteAccount();
                }}
              >
                <Text style={styles.confirmDeleteText}>Delete Forever</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  deleteModal: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: theme.spacing.xl,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  deleteTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  deleteMessage: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  deleteButtons: {
    flexDirection: "row",
    gap: theme.spacing.md,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  confirmDeleteButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 8,
    backgroundColor: theme.colors.error,
    alignItems: "center",
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  dataSection: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  dataText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 22,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.error + "40",
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  dangerText: {
    color: theme.colors.error,
  },
  infoCard: {
    flexDirection: "row",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primaryLight + "20",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
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
