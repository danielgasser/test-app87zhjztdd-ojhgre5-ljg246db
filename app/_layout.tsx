import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Provider } from "react-redux";
import { store } from "src/store";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { checkSession } from "src/store/authSlice";

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}

function RootLayoutNav() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (!isReady || loading) return;

    // Navigation logic after app is ready
    if (isFirstLaunch) {
      router.replace("/welcome");
    } else if (user) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(auth)/login");
    }
  }, [isReady, loading, isFirstLaunch, user]);

  const initializeApp = async () => {
    try {
      // Check first launch
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      if (hasLaunched === null) {
        setIsFirstLaunch(true);
        await AsyncStorage.setItem("hasLaunched", "true");
      } else {
        setIsFirstLaunch(false);
      }

      // Check auth session
      await dispatch(checkSession());

      setIsReady(true);
    } catch (error) {
      console.error("Error initializing app:", error);
      setIsFirstLaunch(false);
      setIsReady(true);
    }
  };

  // Show nothing while initializing
  if (!isReady) {
    return null;
  }

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
