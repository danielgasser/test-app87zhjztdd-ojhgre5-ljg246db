import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { AppText as Text } from "@/components/AppText";
import { AppTextInput as TextInput } from "../src/components/AppTextInput";
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
import { commonStyles } from "@/styles/common";
import { useTranslation } from "react-i18next";

export default function EditProfileScreen() {
  const { t } = useTranslation();

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
      if (provider && provider !== "email") {
        setIsOAuthUser(true);
        setOAuthProvider(
          provider === "google"
            ? "Google"
            : provider === "apple"
              ? "Apple"
              : provider,
        );
      }
    }
  }, [user, profile]);

  const handleUpdateName = async () => {
    if (!fullName.trim()) {
      notify.error(t("settings.please_enter_your_full_name"));
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        updateUserProfile({
          userId: user!.id,
          profileData: { full_name: fullName },
        }),
      ).unwrap();

      notify.success(t("settings.name_updated_successfully"));
    } catch (error: any) {
      logger.error("Name update error:", error);
      notify.error(error.message || t("settings.failed_to_update_name"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (isOAuthUser) {
      notify.error(t("settings.cannot_change_email_for_oauth_accounts"));
      return;
    }

    if (!email.trim()) {
      notify.error(t("settings.please_enter_your_email"));
      return;
    }

    if (email === user?.email) {
      notify.error(t("settings.this_is_already_your_current_email"));
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
        },
      );

      if (error) {
        throw error;
      }
      notify.success(t("settings.confirmation_email_sent"));
      setEmail(user?.email || "");
    } catch (error: any) {
      logger.error("Email update error:", error);

      const errorMessage = error.message?.toLowerCase() || "";
      if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("already been registered")
      ) {
        notify.error(t("settings.email_already_exists"));
      } else {
        notify.error(t("settings.failed_to_update_email_please_try_again"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (isOAuthUser) {
      notify.error(t("settings.cannot_change_password_for_oauth"));
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      notify.error(t("settings.please_fill_in_all_password_fields"));
      return;
    }

    if (!passwordChecker(newPassword)) {
      return;
    }

    if (newPassword !== confirmPassword) {
      notify.error(t("settings.new_passwords_do_not_match"));
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

      notify.success(t("settings.password_updated_successfully"));

      await new Promise((resolve) => setTimeout(resolve as () => void, 1500));
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
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={commonStyles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={commonStyles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={28}
              style={commonStyles.backButtonText}
            />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>
            {t("common.edit_profile")}
          </Text>
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
                {t("profile.signed_in_with", { provider: oauthProvider })}
              </Text>
            </View>
          )}

          {/* Full Name Section */}
          <View style={styles.section}>
            <Text style={commonStyles.sectionTitle}>
              {t("settings.name_or_nickname")}
            </Text>
            <TextInput
              style={commonStyles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t("common.name_or_a_nickname")}
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[
                commonStyles.primaryButton,
                loading && commonStyles.buttonDisabled,
              ]}
              onPress={handleUpdateName}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.textOnPrimary} />
              ) : (
                <Text style={commonStyles.primaryButtonText}>
                  {t("settings.update_name")}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Email Section - Only for non-OAuth users */}
          {!isOAuthUser && (
            <View style={styles.section}>
              <Text style={commonStyles.sectionTitle}>
                {t("common.email_address")}
              </Text>
              <Text style={styles.helperText}>
                {t("settings.youll_need_to_confirm_the_your_new")}
              </Text>
              <TextInput
                style={commonStyles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t("common.enter_your_email")}
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <TouchableOpacity
                style={[
                  commonStyles.primaryButton,
                  loading && commonStyles.buttonDisabled,
                ]}
                onPress={handleUpdateEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.textOnPrimary} />
                ) : (
                  <Text style={commonStyles.primaryButtonText}>
                    {t("settings.update_email")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* OAuth Email Display - Read-only */}
          {isOAuthUser && (
            <View style={styles.section}>
              <Text style={commonStyles.sectionTitle}>
                {t("common.email_address")}
              </Text>
              <View style={styles.oauthInfoBox}>
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.oauthInfoText}>
                  {email} ({t("profile.account_managed_by")} {oauthProvider})
                </Text>
              </View>
              <Text style={styles.helperText}>
                {t("profile.account_managed_by_text", { text: oauthProvider })}
              </Text>
            </View>
          )}

          {/* Password Section - Only for non-OAuth users */}
          {!isOAuthUser && (
            <View style={styles.section}>
              <Text style={commonStyles.sectionTitle}>
                {t("settings.change_password")}
              </Text>
              <Text style={styles.helperText}>
                {t("settings.password_must_be_at_least_8_characters")}
              </Text>

              <TextInput
                style={commonStyles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t("settings.current_password")}
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                autoComplete="current-password"
              />

              <TextInput
                style={commonStyles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t("settings.new_password")}
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                autoComplete="new-password"
              />

              <TextInput
                style={commonStyles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t("common.confirm_new_password")}
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                autoComplete="new-password"
              />

              <TouchableOpacity
                style={[
                  commonStyles.primaryButton,
                  loading && commonStyles.buttonDisabled,
                ]}
                onPress={handleUpdatePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.textOnPrimary} />
                ) : (
                  <Text style={commonStyles.primaryButtonText}>
                    {t("settings.update_password")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* OAuth Password Info */}
          {isOAuthUser && (
            <View style={styles.section}>
              <Text style={commonStyles.sectionTitle}>
                {t("common.password")}
              </Text>
              <View style={styles.oauthInfoBox}>
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.oauthInfoText}>
                  ({t("profile.password_managed_by")} {oauthProvider}){" "}
                </Text>
              </View>
              <Text style={styles.helperText}>
                {t("profile.password_managed_by_text", { text: oauthProvider })}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  helperText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
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
