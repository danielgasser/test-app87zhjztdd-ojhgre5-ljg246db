import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
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
  const [statusHistory, setStatusHistory] = useState<string[]>([]);
  const addStatus = (message: string) => {
    setStatusHistory((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };
  useEffect(() => {
    const handleCallback = async () => {
      try {
        addStatus("Starting callback...");

        const url = await Linking.getInitialURL();
        addStatus(`URL: ${url ? url.substring(0, 100) : "NONE"}`);

        // Parse URL params
        if (url) {
          const parsed = Linking.parse(url);
          addStatus(`Path: ${parsed.path || "none"}`);
          addStatus(
            `Params: ${JSON.stringify(parsed.queryParams || {}).substring(
              0,
              150
            )}`
          );
        }

        addStatus("Waiting 3 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        addStatus("Calling getSession...");

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        addStatus(session ? "✅ Session FOUND" : "❌ Session NOT FOUND");
        if (error) {
          addStatus(`Session error: ${error.message}`);
        }
        addStatus(
          session ? `✅ Session found: ${session.user.email}` : "❌ NO SESSION"
        );

        if (!session) {
          addStatus("Redirecting to login in 5 seconds...");
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
        addStatus(`EXCEPTION: ${error.message}`);
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
      <ScrollView style={styles.debugContainer}>
        {statusHistory.map((status, i) => (
          <Text key={i} style={styles.debugText}>
            {status}
          </Text>
        ))}
      </ScrollView>
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
  debugContainer: {
    flex: 1,
    width: "100%",
    padding: 10,
  },
  debugText: {
    marginTop: 20,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
