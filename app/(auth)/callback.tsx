import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { theme } from "@/styles/theme";
import { logger } from "@/utils/logger";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AuthCallback() {
  const { refreshOnboardingStatus } = useAuth();
  const [status, setStatus] = useState("Processing authentication...");
  const params = useLocalSearchParams();
  useEffect(() => {
    if (!params.access_token && !params.refresh_token) {
      logger.info("🔐 Waiting for OAuth params...");
      return;
    }
    let mounted = true;

    const handleCallback = async () => {
      try {
        setStatus("Completing sign in...");
        logger.info(`🔐 Callback params received:`, params); // <-- ADD THIS

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

          setStatus("Success! Redirecting...");

          // Wait for auth state to propagate
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // NavigationController will handle routing
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
      } finally {
        if (mounted) {
        }
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [params.access_token, params.refresh_token]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={async () => {
          await supabase.auth.signOut();
          await AsyncStorage.clear();
          router.replace("/(auth)/login");
        }}
        style={{
          position: "absolute",
          top: 50,
          right: 20,
          zIndex: 999,
          padding: 10,
        }}
      >
        <Text style={{ color: "red", fontWeight: "bold" }}>DEV: Sign Out</Text>
      </TouchableOpacity>
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
