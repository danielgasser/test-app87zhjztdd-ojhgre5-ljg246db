import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { theme } from "@/styles/theme";
import { logger } from "@/utils/logger";

export default function AuthCallback() {
  const { refreshOnboardingStatus } = useAuth();
  const [status, setStatus] = useState("Processing authentication...");
  const params = useLocalSearchParams();

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      try {
        setStatus("Completing sign in...");

        // Get tokens from URL params (passed by DeepLinkHandler)
        const {
          access_token,
          refresh_token,
          error: urlError,
          error_description,
        } = params;

        // Check for errors
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

          logger.info(`🔐 Setting OAuth session from callback`);

          // Set the session
          const { error } = await supabase.auth.setSession({
            access_token: accessTokenStr,
            refresh_token: refreshTokenStr,
          });

          if (error) throw error;

          if (mounted) {
            setStatus("Success! Redirecting...");

            // Refresh onboarding status (will update AuthProvider state)
            await refreshOnboardingStatus();

            // NavigationController will handle routing based on auth state
            // No need to manually route here
          }
          return;
        }

        // If no tokens, try to get current session
        logger.info(`🔐 No tokens in params, checking current session`);
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          setStatus("Success! Redirecting...");
          await refreshOnboardingStatus();
          // NavigationController will handle routing
        } else {
          throw new Error("No session found");
        }
      } catch (error: any) {
        logger.error(`🔐 Auth callback error:`, error);
        setStatus(`Authentication failed: ${error.message}`);

        // AuthProvider will see no session and NavigationController will route to welcome
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.statusText}>{status}</Text>
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
  statusText: {
    marginTop: 20,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: "center",
  },
});
