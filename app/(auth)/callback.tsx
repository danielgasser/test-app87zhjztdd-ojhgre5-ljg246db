import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/services/supabase";
import { theme } from "src/styles/theme";
import { useAppDispatch } from "@/store/hooks";
import { setSession } from "@/store/authSlice";
import * as Linking from "expo-linking";

export default function AuthCallback() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState("Processing...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the URL that opened the app
        const url = await Linking.getInitialURL();
        setStatus(`URL: ${url?.substring(0, 50)}...`);

        if (!url) {
          setStatus("No URL received");
          setTimeout(() => router.replace("/login"), 2000);
          return;
        }

        // Extract tokens from URL
        const urlObj = Linking.parse(url);
        const params = urlObj.queryParams;

        setStatus("Checking session...");

        // Wait a moment for Supabase to process tokens
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          setStatus(`Error: ${error.message}`);
          setTimeout(() => router.replace("/login"), 3000);
          return;
        }

        if (!session) {
          setStatus("No session found");
          setTimeout(() => router.replace("/login"), 2000);
          return;
        }

        setStatus("Session found! Checking profile...");
        dispatch(setSession(session));

        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("user_id", session.user.id)
          .single();

        if (!profile || !profile.onboarding_complete) {
          router.replace("/onboarding");
        } else {
          router.replace("/(tabs)");
        }
      } catch (error: any) {
        setStatus(`Error: ${error.message}`);
        setTimeout(() => router.replace("/login"), 3000);
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>Completing sign in...</Text>
      <Text style={styles.debugText}>{status}</Text>
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
  text: {
    marginTop: 20,
    fontSize: 16,
    color: theme.colors.text,
  },
  debugText: {
    marginTop: 20,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
