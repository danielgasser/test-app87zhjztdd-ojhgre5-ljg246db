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
import { useLocalSearchParams } from "expo-router";

export default function AuthCallback() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState("Processing...");
  const [statusHistory, setStatusHistory] = useState<string[]>([]);
  const { deepLinkUrl } = useLocalSearchParams<{ deepLinkUrl?: string }>();

  const addStatus = (message: string) => {
    setStatusHistory((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  useEffect(() => {
    let handled = false;

    const handleCallback = async (urlParam?: string | null) => {
      if (handled) return;
      handled = true;

      const url = urlParam || deepLinkUrl || null;

      try {
        addStatus("Starting callback...");
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

        // First, try to exchange the URL hash for a session
        if (url && url.includes("#access_token=")) {
          addStatus("Found tokens in URL, exchanging...");

          const { data, error } = await supabase.auth.setSession({
            access_token: url.split("access_token=")[1].split("&")[0],
            refresh_token: url.split("refresh_token=")[1].split("&")[0],
          });

          if (error) {
            addStatus(`❌ Exchange error: ${error.message}`);
            throw error;
          }

          if (data.session) {
            addStatus("✅ Session created from URL tokens!");

            // Update Redux with session
            dispatch(setSession(data.session));
            addStatus("Session dispatched to Redux");

            // Check onboarding status
            const { data: profile } = await supabase
              .from("profiles")
              .select("onboarding_complete")
              .eq("user_id", data.session.user.id)
              .single();

            addStatus(
              `Profile check: ${
                profile?.onboarding_complete ? "Complete" : "Incomplete"
              }`
            );

            // Route based on onboarding
            if (!profile || !profile.onboarding_complete) {
              addStatus("Routing to onboarding...");
              router.replace("/onboarding");
            } else {
              addStatus("Routing to app...");
              router.replace("/(tabs)");
            }
          }
        } else {
          // Fallback to getSession
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          addStatus(session ? "✅ Session FOUND" : "❌ Session NOT FOUND");
          if (error) {
            addStatus(`Session error: ${error.message}`);
          }

          if (session) {
            dispatch(setSession(session));
            addStatus("Session dispatched to Redux");

            // Check onboarding status
            const { data: profile } = await supabase
              .from("profiles")
              .select("onboarding_complete")
              .eq("user_id", session.user.id)
              .single();

            addStatus(
              `Profile check: ${
                profile?.onboarding_complete ? "Complete" : "Incomplete"
              }`
            );

            // Route based on onboarding
            if (!profile || !profile.onboarding_complete) {
              addStatus("Routing to onboarding...");
              router.replace("/onboarding");
            } else {
              addStatus("Routing to app...");
              router.replace("/(tabs)");
            }
          } else {
            addStatus("❌ NO SESSION");
            addStatus("Redirecting to login in 5 seconds...");
            setTimeout(() => router.replace("/login"), 5000);
          }
        }
      } catch (error: any) {
        addStatus(`EXCEPTION: ${error.message}`);
        setTimeout(() => router.replace("/login"), 2000);
      }
    };

    // Call handleCallback immediately if we have deepLinkUrl from route params
    if (deepLinkUrl) {
      handleCallback(deepLinkUrl);
    }

    // Listen for incoming URLs (when app is already running)
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleCallback(url);
    });

    return () => {
      subscription.remove();
    };
  }, [deepLinkUrl]);

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
