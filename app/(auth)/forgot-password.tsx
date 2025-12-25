import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { supabase } from "@/services/supabase";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { commonStyles } from "@/styles/common";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      notify.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      notify.error("Please enter a valid email address");
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
        }
      );

      if (error) throw error;

      setEmailSent(true);
      notify.success(
        "Password reset link sent! Please check your email.",
        "Check Your Inbox"
      );
    } catch (error: any) {
      logger.error("Password reset error:", error);
      notify.error(
        error.message || "Failed to send reset email. Please try again.",
        "Error"
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
              <Text style={styles.title}>Forgot Password?</Text>
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
                  <Text style={commonStyles.formLabel}>Email Address</Text>
                  <TextInput
                    style={commonStyles.input}
                    placeholder="Enter your email"
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
                    <Text style={styles.resetButtonText}>Send Reset Link</Text>
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
                    Check your email at{" "}
                    <Text style={styles.emailText}>{email}</Text>
                  </Text>
                  <Text style={styles.successSubtext}>
                    Click the link in the email to reset your password. The link
                    will expire in 1 hour.
                  </Text>
                </View>

                {/* Resend Button */}
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => setEmailSent(false)}
                >
                  <Text style={styles.resendButtonText}>
                    Didn't receive the email? Try again
                  </Text>
                </TouchableOpacity>

                {/* Back to Login */}
                <TouchableOpacity
                  style={styles.backToLoginButton}
                  onPress={() => router.replace("/login")}
                >
                  <Text style={styles.backToLoginText}>Back to Sign In</Text>
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
                <Text style={styles.loginLinkText}>Back to Login</Text>
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
