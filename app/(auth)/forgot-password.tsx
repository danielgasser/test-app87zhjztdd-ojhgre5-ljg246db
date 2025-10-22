import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { supabase } from "@/services/supabase";
import { notify } from "@/utils/notificationService";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      notify.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      notify.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "safepath://reset-password",
      });

      if (error) throw error;

      setEmailSent(true);
      notify.success(
        "Password reset link sent! Please check your email.",
        "Check Your Inbox"
      );
    } catch (error: any) {
      console.error("Password reset error:", error);
      notify.error(
        error.message || "Failed to send reset email. Please try again.",
        "Error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
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
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
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
                  <Text style={styles.backToLoginText}>Back to Login</Text>
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
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: theme.spacing.xl,
    left: theme.spacing.xl,
    zIndex: 10,
    padding: theme.spacing.sm,
  },
  header: {
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
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
