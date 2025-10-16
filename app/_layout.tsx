import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Provider } from "react-redux";
import { store } from "src/store";
import { supabase } from "@/services/supabase";
import { useAppDispatch } from "@/store/hooks";
import { setSession } from "@/store/authSlice";

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
            router.replace("/onboarding");
          } else {
            router.replace("/(tabs)");
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  useEffect(() => {
    if (isFirstLaunch === null) return;

    // Navigate based on first launch status
    if (isFirstLaunch) {
      router.replace("/welcome");
    } else {
      router.replace("/(tabs)");
    }
  }, [isFirstLaunch]);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      if (hasLaunched === null) {
        // First time launching
        setIsFirstLaunch(true);
        await AsyncStorage.setItem("hasLaunched", "true");
      } else {
        // Not first time
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
