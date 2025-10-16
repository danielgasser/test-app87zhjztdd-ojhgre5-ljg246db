import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Provider } from "react-redux";
import { store } from "src/store";
import { supabase } from "@/services/supabase";
import { useAppDispatch } from "@/store/hooks";
import { setSession } from "@/store/authSlice";
import { Alert, Linking } from "react-native";

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}

function RootLayoutNav() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Auth state listener
  // In app/_layout.tsx, update the onAuthStateChange:

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          dispatch(setSession(session));

          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_complete")
            .eq("user_id", session.user.id)
            .single();

          if (!profile || !profile.onboarding_complete) {
            // Check if this is email confirmation (user just verified)
            const isEmailConfirmation =
              session.user.email_confirmed_at &&
              new Date(session.user.email_confirmed_at).getTime() >
                Date.now() - 60000; // Within last minute

            if (isEmailConfirmation) {
              // Show welcome message for new users
              setTimeout(() => {
                Alert.alert(
                  "Welcome to SafePath! 🛡️",
                  "Your email has been confirmed. Let's set up your profile so we can provide personalized safety recommendations.",
                  [
                    {
                      text: "Get Started",
                      onPress: () => router.replace("/onboarding"),
                    },
                  ]
                );
              }, 500);
            } else {
              router.replace("/onboarding");
            }
          } else {
            router.replace("/(tabs)");
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [dispatch, router]);

  // Deep link listener for OAuth callback
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      console.log("🔗 Deep link received:", url);

      if (url.includes("safepath://callback")) {
        console.log("✅ OAuth callback detected");

        // Wait for Supabase to process tokens
        await new Promise((resolve) => setTimeout(resolve, 500));

        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            console.error("❌ Session error:", error);
            return;
          }

          if (session) {
            console.log("✅ Session found, updating Redux");
            dispatch(setSession(session));
          } else {
            console.log("⚠️ No session after OAuth");
          }
        } catch (err) {
          console.error("❌ handleUrl error:", err);
        }
      }
    };

    const subscription = Linking.addEventListener("url", handleUrl);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [dispatch]);

  // First launch check
  useEffect(() => {
    checkFirstLaunch();
  }, []);

  useEffect(() => {
    if (isFirstLaunch === null) return;

    if (isFirstLaunch) {
      router.replace("/welcome");
    } else {
      router.replace("/(tabs)");
    }
  }, [isFirstLaunch, router]);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      if (hasLaunched === null) {
        setIsFirstLaunch(true);
        await AsyncStorage.setItem("hasLaunched", "true");
      } else {
        setIsFirstLaunch(false);
      }
    } catch (error) {
      console.error("Error checking first launch:", error);
      setIsFirstLaunch(false);
    }
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="welcome"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="review" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
