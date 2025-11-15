import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "src/styles/theme";
import { useAppSelector, useAppDispatch } from "src/store/hooks";
import { supabase } from "@/services/supabase";
import { updateUserProfile } from "src/store/userSlice";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { passwordChecker } from "@/utils/passwordChecker";
import { useAuth } from "@/providers/AuthProvider";

export default function EditProfileScreen() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { profile } = useAppSelector((state) => state.user);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [oauthProvider, setOAuthProvider] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      setFullName(profile.full_name || "");
      setEmail(user.email || "");

      // Detect OAuth provider
      const provider =
        user.app_metadata?.provider || user.app_metadata?.providers?.[0];
      console.log("provider", user.app_metadata);
      if (provider && provider !== "email") {
        setIsOAuthUser(true);
        setOAuthProvider(
          provider === "google"
            ? "Google"
            : provider === "apple"
            ? "Apple"
            : provider
        );
      }
    }
  }, [user, profile]);

  const handleUpdateName = async () => {
    if (!fullName.trim()) {
      notify.error("Please enter your full name");
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        updateUserProfile({
          userId: user!.id,
          profileData: { full_name: fullName },
        })
      ).unwrap();

      notify.success("Name updated successfully");
    } catch (error: any) {
      logger.error("Name update error:", error);
      notify.error(error.message || "Failed to update name");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (isOAuthUser) {
      notify.error("Cannot change email for OAuth accounts");
      return;
    }

    if (!email.trim()) {
      notify.error("Please enter your email");
      return;
    }

    if (email === user?.email) {
      notify.error("This is already your current email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser(
        {
          email: email.trim(),
        },
        {
          emailRedirectTo: "safepath://email-change-confirm",
        }
      );

      if (error) {
        throw error;
      }
      notify.success(
        "Confirmation email sent! Please confirm your new email address to confirm the change."
      );
      setEmail(user?.email || "");
    } catch (error: any) {
      logger.error("Email update error:", error);

      const errorMessage = error.message?.toLowerCase() || "";
      if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("already been registered")
      ) {
        notify.error(
          "Unable to update email. Please try a different email address or contact support."
        );
      } else {
        notify.error("Failed to update email. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (isOAuthUser) {
      notify.error("Cannot change password for OAuth accounts");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      notify.error("Please fill in all password fields");
      return;
    }

    if (!passwordChecker(newPassword)) {
      return;
    }

    if (newPassword !== confirmPassword) {
      notify.error("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // First, re-authenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      notify.success(
        "Password updated successfully! Please sign in with your new password."
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));
      await supabase.auth.signOut();

      router.replace("/login");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      logger.error("Password update error:", error);
      notify.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* OAuth Info Banner */}
          {isOAuthUser && (
            <View style={styles.oauthBanner}>
              <Ionicons
                name={oauthProvider === "Google" ? "logo-google" : "logo-apple"}
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.oauthText}>
                Signed in with {oauthProvider}
              </Text>
            </View>
          )}

          {/* Full Name Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleUpdateName}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.textOnPrimary} />
              ) : (
                <Text style={styles.buttonText}>Update Name</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Email Section - Only for non-OAuth users */}
          {!isOAuthUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Email Address</Text>
              <Text style={styles.helperText}>
                You'll need to confirm the your new email address.
              </Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleUpdateEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.textOnPrimary} />
                ) : (
                  <Text style={styles.buttonText}>Update Email</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* OAuth Email Display - Read-only */}
          {isOAuthUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Email Address</Text>
              <View style={styles.oauthInfoBox}>
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.oauthInfoText}>
                  {email} (managed by {oauthProvider})
                </Text>
              </View>
              <Text style={styles.helperText}>
                Email is managed by your {oauthProvider} account and cannot be
                changed here
              </Text>
            </View>
          )}

          {/* Password Section - Only for non-OAuth users */}
          {!isOAuthUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <Text style={styles.helperText}>
                Password must be at least 8 characters
              </Text>

              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                autoComplete="current-password"
              />

              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                autoComplete="new-password"
              />

              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                autoComplete="new-password"
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleUpdatePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.textOnPrimary} />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* OAuth Password Info */}
          {isOAuthUser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Password</Text>
              <View style={styles.oauthInfoBox}>
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.oauthInfoText}>
                  Password managed by {oauthProvider}
                </Text>
              </View>
              <Text style={styles.helperText}>
                Your password is managed by your {oauthProvider} account
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  oauthBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary + "20",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  oauthText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  helperText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  oauthInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  oauthInfoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
});
