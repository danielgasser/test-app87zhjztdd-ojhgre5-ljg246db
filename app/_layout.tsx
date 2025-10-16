import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Provider } from "react-redux";
import { store } from "src/store";
import { Linking } from "react-native";
import { supabase } from "@/services/supabase";

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

  useEffect(() => {
    // Handle deep link URLs for OAuth
    const handleUrl = (event: { url: string }) => {
      const url = event.url;
      console.log("Deep link received:", url);
    };

    // Get initial URL (when app opens from a link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("Initial URL:", url);
        handleUrl({ url });
      }
    });

    // Listen for URL events while app is running
    const subscription = Linking.addEventListener("url", handleUrl);

    return () => subscription.remove();
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
