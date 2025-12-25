import React, { useState } from "react";
import { theme } from "src/styles/theme";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { notify } from "@/utils/notificationService";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/services/supabase";
import { logger } from "@/utils/logger";
import { commonStyles } from "@/styles/common";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { refreshOnboardingStatus } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      notify.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      // Refresh onboarding status (updates AuthProvider)
      await refreshOnboardingStatus();

      // NavigationController will handle routing based on auth state
      // No manual routing needed!
    } catch (err: any) {
      logger.error(`🔐 Login error:`, err);
      notify.error(err.message || "Invalid credentials", "Login Failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Sign in to Supabase with the Apple credential
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken!,
      });

      if (error) throw error;

      // Refresh onboarding status
      await refreshOnboardingStatus();

      // NavigationController will handle routing
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        return; // User canceled
      }
      logger.error(`🔐 Apple Sign-In error:`, error);
      notify.error(error.message || "Failed to sign in with Apple");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "safepath://callback",
        },
      });

      if (error) {
        notify.error(error?.message);
        return;
      }

      if (!data?.url) {
        notify.error("No OAuth URL returned");
        return;
      }

      const canOpen = await Linking.canOpenURL(data.url);

      if (!canOpen) {
        notify.error(
          `Cannot open URL: ${data.url.substring(0, 50)}...`,
          "Error"
        );
        return;
      }

      await Linking.openURL(data.url);
      // OAuth callback will be handled by DeepLinkHandler -> callback.tsx
    } catch (error: any) {
      logger.error(`🔐 Google Sign-In error:`, error);
      notify.error(error.message);
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flex: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={commonStyles.subHeader}>
              <Text style={styles.title}>SafePath</Text>
              <Text style={styles.subtitle}>Travel with confidence</Text>
            </View>

            <View style={commonStyles.form}>
              <TextInput
                style={commonStyles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
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
              <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot-password")}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  commonStyles.primaryButton,
                  isLoading && commonStyles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <Text style={commonStyles.primaryButtonText}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Text>
              </TouchableOpacity>

              {/* Social Login Divider */}
              <View style={styles.dividerContainer}>
                <View style={commonStyles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={commonStyles.divider} />
              </View>

              {/* Apple Sign In Button */}
              {Platform.OS === "ios" && (
                <>
                  <TouchableOpacity
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                  >
                    <Ionicons
                      name="logo-apple"
                      size={20}
                      color={theme.colors.background}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.appleButtonText}>
                      Sign in with Apple
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.dividerContainer}>
                    <View style={commonStyles.divider} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={commonStyles.divider} />
                  </View>
                </>
              )}

              {/* Google Sign In Button */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
              >
                <Ionicons
                  name="logo-google"
                  size={20}
                  color={theme.colors.background}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </TouchableOpacity>

              <View style={commonStyles.footer}>
                <Text style={commonStyles.footerText}>
                  Don't have an account?{" "}
                </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text style={commonStyles.textPrimaryLink}>Sign Up</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 22,
    color: theme.colors.textSecondary,
  },

  eyeButton: {
    padding: theme.spacing.md,
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: 5,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 18,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerText: {
    marginHorizontal: 10,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  appleButton: {
    backgroundColor: theme.colors.shadowBlack,
    padding: theme.spacing.md,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  appleButtonText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: "600",
  },
  googleButton: {
    backgroundColor: "#4285F4",
    padding: theme.spacing.md,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 0,
  },
  googleButtonText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: "600",
  },
});
