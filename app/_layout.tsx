// app/_layout.tsx - CLEAN, SIMPLE LAYOUT
import React from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { View, Text, StyleSheet } from "react-native";
import { store } from "@/store";
import { AuthManager, useAuth } from "@/providers/AuthManager";
import { DeepLinkManager } from "@/providers/DeepLinkManager";
import NotificationProvider from "@/components/NotificationProvider";
import { theme } from "@/styles/theme";
import * as Sentry from "@sentry/react-native";

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
      <Text style={styles.splashText}>SafePath</Text>
    </View>
  );
}

// Main navigation based on auth state
function AppNavigator() {
  const { isLoading, isAuthenticated, needsOnboarding } = useAuth();

  // Show loading screen during auth initialization
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        // Authenticated user screens
        needsOnboarding ? (
          <Stack.Screen name="onboarding" />
        ) : (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="review" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="privacy-settings" />
            <Stack.Screen name="notification-settings" />
            <Stack.Screen name="display-settings" />
            <Stack.Screen name="edit-review" />
          </>
        )
      ) : (
        // Unauthenticated screens
        <>
          <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(auth)" />
        </>
      )}
    </Stack>
  );
}

// Root layout with providers
function RootLayout() {
  return (
    <Provider store={store}>
      <AuthManager>
        <DeepLinkManager>
          <NotificationProvider>
            <AppNavigator />
          </NotificationProvider>
        </DeepLinkManager>
      </AuthManager>
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
});

export default Sentry.wrap(RootLayout);
