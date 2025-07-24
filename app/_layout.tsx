// app/_layout.tsx - Add profile completion enforcement

import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { Provider } from "react-redux";
import { store } from "../src/store";
import { supabase } from "../src/services/supabase";
import { useAppDispatch, useAppSelector } from "../src/store/hooks";
import { setSession, checkSession } from "../src/store/authSlice";
import { View, ActivityIndicator } from "react-native";
import { fetchUserProfile } from "../src/store/userSlice";

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading: authLoading } = useAppSelector((state) => state.auth);
  const {
    profile,
    loading: profileLoading,
    onboardingComplete,
  } = useAppSelector((state) => state.user);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    dispatch(checkSession()).finally(() => {
      setIsReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setSession(session));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  // Fetch user profile when authenticated
  useEffect(() => {
    if (user?.id && !profile) {
      dispatch(fetchUserProfile(user.id));
    }
  }, [user?.id, profile, dispatch]);

  // Navigation logic with profile completion enforcement
  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    const onOnboardingScreen = segments[segments.length - 1] === "onboarding";

    console.log("🔍 Navigation Check:", {
      isReady,
      authLoading,
      profileLoading,
      hasUser: !!user,
      onboardingComplete,
      inAuthGroup,
      onOnboardingScreen,
      segments,
    });

    if (isReady && !authLoading && !profileLoading) {
      if (!user && !inAuthGroup) {
        // No user, redirect to login
        console.log("👤 No user - redirecting to login");
        router.replace("/login");
      } else if (user && inAuthGroup && !onOnboardingScreen) {
        // User logged in but on auth screen (not onboarding) - check profile
        if (onboardingComplete) {
          console.log("✅ Profile complete - redirecting to main app");
          router.replace("/");
        } else {
          console.log("❌ Profile incomplete - redirecting to onboarding");
          router.replace("/onboarding");
        }
      } else if (
        user &&
        !inAuthGroup &&
        !onboardingComplete &&
        !onOnboardingScreen
      ) {
        // User in main app but profile incomplete - force onboarding
        console.log("🚨 BLOCKING: Profile incomplete - forcing onboarding");
        router.replace("/onboarding");
      }
    }
  }, [
    user,
    segments,
    authLoading,
    profileLoading,
    isReady,
    onboardingComplete,
    router,
  ]);

  if (!isReady || authLoading || (user && profileLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}
