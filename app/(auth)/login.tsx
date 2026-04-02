import React, { useState } from "react";
import { theme } from "src/styles/theme";

import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
} from "react-native";
import { AppText as Text } from "@/components/AppText";
import { AppTextInput as TextInput } from "../../src/components/AppTextInput";
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
import { useTranslation } from "react-i18next";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { refreshOnboardingStatus } = useAuth();
  const { setAppleName } = useAuth();
  const handleLogin = async () => {
    if (!email || !password) {
      notify.error(t("auth.please_fill_in_all_fields"));
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

      const { fullName } = credential;

      if (fullName?.givenName || fullName?.familyName) {
        // Get the newly created user
        const name = [fullName?.givenName, fullName?.familyName]
          .filter(Boolean)
          .join(" ");

        if (name) {
          // REPLACE the database upsert with this:
          setAppleName(name);
          logger.info(`✅ Apple name stored for onboarding: ${name}`);
        }
      }

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
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        notify.error(error?.message);
        return;
      }

      if (!data?.url) {
        notify.error(t("auth.no_oauth_url_returned"));
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        "safepath://callback",
      );

      if (result.type === "cancel" || result.type === "dismiss") {
        return;
      }

      // Extract tokens from callback URL
      if (result.type === "success" && result.url) {
        // Parse URL - Supabase puts tokens in the hash fragment
        const url = result.url;
        const hashFragment = url.split("#")[1];

        if (!hashFragment) {
          notify.error(t("auth.authentication_failed_no_response_data"));
          return;
        }

        // Parse hash fragment manually
        const params: Record<string, string> = {};
        hashFragment.split("&").forEach((pair) => {
          const [key, value] = pair.split("=");
          if (key && value) {
            params[key] = decodeURIComponent(value);
          }
        });

        const access_token = params.access_token;
        const refresh_token = params.refresh_token;
        const error_param = params.error;
        const error_description = params.error_description;

        if (error_param) {
          notify.error(error_description || "Authentication failed");
          return;
        }

        if (access_token && refresh_token) {
          // Route to callback.tsx with tokens
          router.push({
            pathname: "/(auth)/callback",
            params: {
              access_token,
              refresh_token,
            },
          } as any);
        } else {
          notify.error(t("auth.authentication_failed_no_tokens_received"));
        }
      }
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
              <Text style={styles.title}>{t("auth.truguide")}</Text>
              <Text style={styles.subtitle}>
                {t("auth.travel_with_confidence")}
              </Text>
            </View>

            <View style={commonStyles.form}>
              <TextInput
                style={commonStyles.input}
                placeholder={t("auth.email")}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t("common.password")}
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
                <Text style={styles.forgotPasswordText}>
                  {t("auth.forgot_password")}
                </Text>
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
                <Text style={styles.dividerText}>{t("auth.or")}</Text>
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
                      {t("auth.sign_in_with_apple")}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.dividerContainer}>
                    <View style={commonStyles.divider} />
                    <Text style={styles.dividerText}>{t("auth.or")}</Text>
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
                <Text style={styles.googleButtonText}>
                  {t("auth.sign_in_with_google")}
                </Text>
              </TouchableOpacity>

              <View style={commonStyles.footer}>
                <Text style={commonStyles.footerText}>
                  {t("auth.no_account_yet")}
                </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text style={commonStyles.textPrimaryLink}>
                      {t("common.sign_up")}
                    </Text>
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
    flexGrow: 1,
    textAlign: "center",
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
