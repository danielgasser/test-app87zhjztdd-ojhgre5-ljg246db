import React, { useState } from "react";
import { theme } from "src/styles/theme";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { Link, router } from "expo-router";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { signIn, setSession } from "src/store/authSlice";
import { supabase } from "@/services/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      await dispatch(signIn({ email, password })).unwrap();
      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert("Login Failed", error || "Invalid credentials");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address first");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "safepath://reset-password",
      });

      if (error) throw error;

      Alert.alert(
        "Check your email",
        "We sent you a password reset link. Please check your email."
      );
    } catch (error: any) {
      Alert.alert("Error", error.message);
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

      // CRITICAL: Update Redux state with the session
      if (data.session) {
        dispatch(setSession(data.session));
      }

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
      Alert.alert("Error", error.message || "Failed to sign in with Apple");
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

      if (error) throw error;

      // Open the OAuth URL
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to sign in with Google");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
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
            onPress={handleForgotPassword}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Signing in..." : "Sign In"}
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
              <Text style={styles.appleButtonText}> Sign in with Apple</Text>
            </TouchableOpacity>
          )}
          {/* Social Login Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>
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
