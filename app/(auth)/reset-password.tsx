import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { AppTextInput as TextInput } from "../../src/components/AppTextInput";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { supabase } from "@/services/supabase";
import { notify } from "@/utils/notificationService";
import { useLocalSearchParams } from "expo-router";
import { logger } from "@/utils/logger";
import { passwordChecker } from "@/utils/passwordChecker";
import { commonStyles } from "@/styles/common";
import { useTranslation } from "react-i18next";

export default function ResetPasswordScreen() {
  const { t } = useTranslation();

  const params = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isValidatingToken, setIsValidatingToken] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      // First try to set session from URL params
      const { access_token, refresh_token, type } = params;

      if (access_token && refresh_token && type === "recovery") {
        const { error } = await supabase.auth.setSession({
          access_token: access_token as string,
          refresh_token: refresh_token as string,
        });

        if (!error) {
          setIsValidatingToken(false);
          return;
        }
      }

      // Fallback: check for existing session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setIsValidatingToken(false);
      } else {
        notify.error(t("auth.invalid_or_expired_reset_link"));
        router.replace("/(auth)/forgot-password");
      }
    };

    checkSession();
  }, []);

  const validatePassword = (_password: string): boolean => {
    if (!passwordChecker(newPassword)) {
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    if (!trimmedNewPassword || !trimmedConfirmPassword) {
      notify.error(t("auth.please_fill_in_all_fields"));
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      notify.error(t("auth.passwords_do_not_match"));
      return;
    }

    if (!validatePassword(trimmedNewPassword)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: trimmedNewPassword,
      });

      if (error) throw error;

      notify.success("Your password has been reset successfully!", "Success");

      // Sign out and redirect to login
      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (error: any) {
      logger.error("Password reset error:", error);
      notify.error(
        error.message || "Failed to reset password. Please try again.",
        "Error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {isValidatingToken ? (
              // Show loading while validating token
              <View style={commonStyles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={commonStyles.loadingText}>
                  {t('auth.validating_reset_link')}</Text>
              </View>
            ) : (
              <>
                {/* Header */}
                <View style={commonStyles.header}>
                  <Ionicons
                    name="key-outline"
                    size={64}
                    color={theme.colors.primary}
                    style={styles.icon}
                  />
                  <Text style={styles.title}>
                    {t("auth.create_new_password")}
                  </Text>
                  <Text style={styles.subtitle}>
                    {t('auth.your_new_password_must_be_different')}</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                  {/* New Password */}
                  <Text style={commonStyles.formLabel}>
                    {t("auth.new_password")}
                  </Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder={t("auth.enter_new_password")}
                      placeholderTextColor={theme.colors.textSecondary}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={24}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password */}
                  <Text style={commonStyles.formLabel}>
                    {t("auth.confirm_password")}
                  </Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder={t("common.confirm_new_password")}
                      placeholderTextColor={theme.colors.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      <Ionicons
                        name={
                          showConfirmPassword
                            ? "eye-off-outline"
                            : "eye-outline"
                        }
                        size={24}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Password Requirements */}
                  <View style={styles.requirementsBox}>
                    <Text style={styles.requirementsTitle}>
                      {t('auth.password_must_contain')}</Text>
                    <Text style={styles.requirement}>
                      {t('auth.at_least_8_characters')}</Text>
                    <Text style={styles.requirement}>
                      {t('auth.uppercase_and_lowercase_letters')}</Text>
                    <Text style={styles.requirement}>
                      {t('auth.at_least_one_number')}</Text>
                    <Text style={styles.requirement}>
                      {t('auth.at_least_one_special_character')}</Text>
                  </View>
                </View>

                {/* Reset Button */}
                <TouchableOpacity
                  style={[
                    styles.resetButton,
                    loading && styles.resetButtonDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={theme.colors.background} />
                  ) : (
                    <Text style={styles.resetButtonText}>
                      {t("auth.reset_password")}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.loginLink}
                  onPress={() => router.replace("/login")}
                  disabled={loading}
                >
                  <Ionicons
                    name="arrow-back"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.loginLinkText}>
                    {t("auth.back_to_login")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: "center",
  },
  icon: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 20,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  passwordInput: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  eyeButton: {
    padding: theme.spacing.md,
  },
  requirementsBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  requirement: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  resetButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "bold",
  },
  loginLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  loginLinkText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: theme.spacing.xs,
  },
});
