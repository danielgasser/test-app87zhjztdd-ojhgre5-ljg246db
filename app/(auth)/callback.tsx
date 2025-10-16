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
        setStatus("Checking session...");

        // Wait for session to be established
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setStatus("No session found, redirecting...");
          setTimeout(() => router.replace("/login"), 1000);
          return;
        }

        // Update Redux
        dispatch(setSession(session));

        // Check onboarding
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
        setTimeout(() => router.replace("/login"), 2000);
      }
    };

    handleCallback();
  }, [dispatch, router]);

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
