import "@/tasks/navigationLocationTask";
import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { Provider } from "react-redux";
import { View, StyleSheet, Image } from "react-native";
import { store } from "@/store";
import { useAuth } from "@/providers/AuthProvider";
import { DeepLinkHandler } from "@/providers/DeepLinkHandler";
import NotificationProvider from "@/components/NotificationProvider";
import { theme } from "@/styles/theme";
import * as Sentry from "@sentry/react-native";
import { NavigationController } from "@/providers/NavigationController";
import { AuthProvider } from "@/providers/AuthProvider";
import logoImage from "assets/images/TruGuideLogoTransparent1024x1024.png";
import { notificationService } from "@/services/notificationService";
import * as Notifications from "expo-notifications";
import { logger } from "@/utils/logger";
import {
  initializeAdMob,
  loadInterstitialAd,
  loadRewardedAd,
  requestAdConsentIfNeeded,
} from "@/services/adMobService";
import { initializeRevenueCat } from "@/services/revenueCatService";
import { GlobalPremiumPromptModal } from "@/components/PremiumGate";
import { useLocationTriggers } from "@/hooks/useLocationTriggers";

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false,
  tracesSampleRate: __DEV__ ? 0 : 0.1,
});

// Loading screen
function SplashScreen() {
  return (
    <View style={styles.splash}>
      <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />
    </View>
  );
}

// Main navigation based on auth state
function AppNavigator() {
  const { isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    notificationService.setupNotificationResponseHandler(router);
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        logger.info("📬 Notification received:", notification);
      },
    );
    // Initialize AdMob
    const initAds = async () => {
      await initializeAdMob();
      await requestAdConsentIfNeeded();
      loadInterstitialAd();
      loadRewardedAd();
    };

    initAds();
    initializeRevenueCat();

    return () => {
      subscription.remove();
    };
  }, []);
  useLocationTriggers();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen
        name="legal-acceptance"
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="location-disclosure"
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="review" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="privacy-settings" />
      <Stack.Screen name="notification-settings" />
      <Stack.Screen name="display-settings" />
      <Stack.Screen name="edit-review" />
      <Stack.Screen
        name="subscription"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="route-planning"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

// Root layout with providers
function RootLayout() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <NavigationController>
          <DeepLinkHandler>
            <NotificationProvider>
              <AppNavigator />
            </NotificationProvider>
          </DeepLinkHandler>
        </NavigationController>
      </AuthProvider>
      <GlobalPremiumPromptModal />
    </Provider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  splashText: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  logoImage: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
});

export default Sentry.wrap(RootLayout);
