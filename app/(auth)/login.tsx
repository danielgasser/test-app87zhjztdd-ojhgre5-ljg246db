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
import { useAuth } from "@/providers/AuthManager";
import { supabase } from "@/services/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { isLoading } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      notify.error("Please fill in all fields");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) throw error;
      const result = data;
      // Check onboarding status
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("user_id", result.user.id)
        .single();

      // Route based on onboarding
      if (!profile || !profile.onboarding_complete) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err) {
      notify.error(`${err}` || "Invalid credentials", "Login Failed");
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
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken!,
      });

      if (error) throw error;

      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("user_id", data.user.id)
        .single();

      // Route based on onboarding status
      if (!profile || !profile.onboarding_complete) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        return; // User canceled
      }
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
    } catch (error: any) {
      notify.error(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
            <View style={styles.header}>
              <Text style={styles.title}>SafePath</Text>
              <Text style={styles.subtitle}>Travel with confidence</Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
              <TouchableOpacity
                onPress={() => router.push("/forgot-password")}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Text>
              </TouchableOpacity>
              {/* Social Login Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
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

                  {/* Move the OR divider inside the Platform check */}
                  <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.divider} />
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
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Link href="/register" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Sign Up</Text>
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
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 50,
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
  form: {
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: 8,
    fontSize: 18,
    backgroundColor: theme.colors.inputBackground,
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
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
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
    backgroundColor: "#4285F4", // Google blue
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
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  link: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
