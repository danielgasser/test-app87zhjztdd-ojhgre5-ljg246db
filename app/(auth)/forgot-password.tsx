import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { AppText as Text } from "@/components/AppText";
import { AppTextInput as TextInput } from "../../src/components/AppTextInput";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { supabase } from "@/services/supabase";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { commonStyles } from "@/styles/common";
import { useTranslation } from "react-i18next";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResetPassword = async () => {
    if (cooldown > 0) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      notify.error(t("auth.please_enter_your_email_address"));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      notify.error(t("auth.please_enter_a_valid_email_address"));
      return;
    }

    setLoading(true);

    try {
      // Use Supabase's built-in resetPasswordForEmail
      // This will trigger your send-email-hook for custom email template
      const { error } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auth-verify?next=reset-password`,
        },
      );

      if (error) throw error;

      setEmailSent(true);
      setCooldown(60);

      notify.success(
        t("auth.reset_link_sent"),
        t("common.check_inbox") + " " + trimmedEmail,
      );
    } catch (error: any) {
      logger.error("Password reset error:", error);
      notify.error(
        error.message || t("auth.send_reset_link_failed"),
        t("common.error"),
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
            {/* Header */}
            <View style={styles.specHeader}>
              <Ionicons
                name="lock-closed-outline"
                size={64}
                color={theme.colors.primary}
                style={styles.icon}
              />
              <Text style={styles.title}>{t("auth.forgot_password")}</Text>
              <Text style={styles.subtitle}>
                {emailSent
                  ? "We've sent you a password reset link"
                  : "No worries, we'll send you reset instructions"}
              </Text>
            </View>

            {!emailSent ? (
              <>
                {/* Email Input */}
                <View style={styles.form}>
                  <Text style={commonStyles.formLabel}>
                    {t("common.email_address")}
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    placeholder={t("common.enter_your_email")}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
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
                      {t("auth.send_reset_link")}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Success Message */}
                <View style={styles.successBox}>
                  <Ionicons
                    name="checkmark-circle"
                    size={48}
                    color={theme.colors.success}
                    style={styles.successIcon}
                  />
                  <Text style={styles.successText}>
                    {t("auth.check_your_email_at")}{" "}
                    <Text style={styles.emailText}>{email}</Text>
                  </Text>
                  <Text style={styles.successSubtext}>
                    {t("auth.click_the_link_in_the_email_to_reset")}
                  </Text>
                </View>

                {/* Resend Button */}
                <TouchableOpacity
                  style={[
                    styles.resendButton,
                    cooldown > 0 && styles.resetButtonDisabled,
                  ]}
                  onPress={() => cooldown === 0 && setEmailSent(false)}
                  disabled={cooldown > 0}
                >
                  <Text style={styles.resendButtonText}>
                    {cooldown > 0
                      ? t("auth.resend_cooldown", { seconds: cooldown })
                      : t("auth.didnt_receive_the_email_try_again")}
                  </Text>
                </TouchableOpacity>

                {/* Back to Login */}
                <TouchableOpacity
                  style={styles.backToLoginButton}
                  onPress={() => router.replace("/login")}
                >
                  <Text style={styles.backToLoginText}>
                    {t("auth.back_to_sign_in")}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Back to Login (when form is visible) */}
            {!emailSent && (
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.back()}
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
  specHeader: {
    alignItems: "center",
    marginBottom: theme.spacing.xxl,
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
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 22,
  },
  form: {
    marginBottom: theme.spacing.xl,
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
  successBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: "center",
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.success + "30",
  },
  successIcon: {
    marginBottom: theme.spacing.md,
  },
  successText: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  emailText: {
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  successSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  resendButton: {
    alignItems: "center",
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  resendButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  backToLoginButton: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backToLoginText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  loginLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  loginLinkText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: theme.spacing.xs,
  },
});
