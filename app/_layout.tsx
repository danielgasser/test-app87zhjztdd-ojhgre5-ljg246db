import "@/tasks/navigationLocationTask";
import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { Provider } from "react-redux";
import { View, Text, StyleSheet, Image } from "react-native";
import { store } from "@/store";
import { useAuth } from "@/providers/AuthProvider";
import { DeepLinkHandler } from "@/providers/DeepLinkHandler";
import NotificationProvider from "@/components/NotificationProvider";
import { theme } from "@/styles/theme";
import * as Sentry from "@sentry/react-native";
import { NavigationController } from "@/providers/NavigationController";
import { AuthProvider } from "@/providers/AuthProvider";
import logoImage from "assets/images/SafePathLogoTransparent1024x1024.png";
import { notificationService } from "@/services/notificationService";
import * as Notifications from "expo-notifications";
import { logger } from "@/utils/logger";

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
      }
    );
  }, []);

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
