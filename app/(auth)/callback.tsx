// app/(auth)/callback.tsx - REACT NATIVE CALLBACK HANDLING
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/providers/AuthManager";
import { theme } from "@/styles/theme";
import { logger } from "@/utils/logger";
import * as Linking from "expo-linking";

export default function AuthCallback() {
  const { completeOnboarding } = useAuth();
  const [status, setStatus] = useState("Processing authentication...");
  const params = useLocalSearchParams();

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      try {
        setStatus("Completing sign in...");

        // Method 1: Check if we have tokens in URL params (from deep link)
        const {
          access_token,
          refresh_token,
          error: urlError,
          error_description,
        } = params;

        if (urlError) {
          const errorMsg = Array.isArray(error_description)
            ? error_description[0]
            : error_description || "Authentication failed";
          throw new Error(String(errorMsg));
        }

        if (access_token && refresh_token) {
          // Ensure tokens are strings (not arrays)
          const accessTokenStr = Array.isArray(access_token)
            ? access_token[0]
            : access_token;
          const refreshTokenStr = Array.isArray(refresh_token)
            ? refresh_token[0]
            : refresh_token;

          // We have tokens from URL params - set session
          const { data, error } = await supabase.auth.setSession({
            access_token: accessTokenStr,
            refresh_token: refreshTokenStr,
          });

          if (error) throw error;

          if (data.session && mounted) {
            setStatus("Setting up your account...");
            await checkOnboardingAndRoute(data.session.user.id);
          }
          return;
        }

        // Method 2: Check for initial URL (when app is opened from deep link)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes("#access_token=")) {
          const urlParams = parseUrlHash(initialUrl);

          if (urlParams.access_token && urlParams.refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token: urlParams.access_token,
              refresh_token: urlParams.refresh_token,
            });

            if (error) throw error;

            if (data.session && mounted) {
              setStatus("Setting up your account...");
              await checkOnboardingAndRoute(data.session.user.id);
            }
            return;
          }
        }

        // Method 3: Check current session (Supabase might have handled it automatically)
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          // User is authenticated, check onboarding
          await checkOnboardingAndRoute(session.user.id);
        } else {
          setStatus("Authentication failed - no session found");
          setTimeout(() => router.replace("/(auth)/login"), 2000);
        }
      } catch (error) {
        logger.error("Auth callback error:", error);
        setStatus(`Authentication failed: ${error}`);
        setTimeout(() => router.replace("/(auth)/login"), 3000);
      }
    };

    // Helper function to parse URL hash parameters
    const parseUrlHash = (url: string): Record<string, string> => {
      const hashPart = url.split("#")[1];
      if (!hashPart) return {};

      const params: Record<string, string> = {};
      hashPart.split("&").forEach((param) => {
        const [key, value] = param.split("=");
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });
      return params;
    };

    const checkOnboardingAndRoute = async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("user_id", userId)
          .single();

        if (!mounted) return;

        if (!profile?.onboarding_complete) {
          setStatus("Redirecting to setup...");
          router.replace("/onboarding");
        } else {
          completeOnboarding(); // Update auth state
          setStatus("Welcome back!");
          router.replace("/(tabs)");
        }
      } catch (error) {
        logger.error("Onboarding check error:", error);
        // Assume needs onboarding if check fails
        router.replace("/onboarding");
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [params, completeOnboarding]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  status: {
    marginTop: 20,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: "center",
  },
});
