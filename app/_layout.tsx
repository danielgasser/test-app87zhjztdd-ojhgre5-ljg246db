// app/_layout.tsx - INDUSTRY STANDARD PATTERN
import React from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { Text, View, StyleSheet } from "react-native";
import { store } from "@/store";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { DeepLinkProvider, useDeepLink } from "@/providers/DeepLinkQueue";
import NotificationProvider from "@/components/NotificationProvider";
import { theme } from "@/styles/theme";
import * as Sentry from "@sentry/react-native";

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false,
  tracesSampleRate: __DEV__ ? 0 : 0.1,
});

// Loading screen component
function SplashScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>SafePath</Text>
    </View>
  );
}

// Navigation component with conditional rendering
function RootNavigator() {
  const { isLoading, userToken, needsOnboarding } = useAuth();
  const { processQueuedLinks } = useDeepLink();

  // Process queued deep links when user signs in
  React.useEffect(() => {
    if (userToken && !needsOnboarding) {
      processQueuedLinks();
    }
  }, [userToken, needsOnboarding, processQueuedLinks]);

  // Show splash while loading
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {userToken ? (
        // Authenticated screens
        <>
          {needsOnboarding ? (
            <Stack.Screen name="onboarding" />
          ) : (
            <>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="review" />
            </>
          )}
        </>
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

function RootLayout() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <DeepLinkProvider>
          <NotificationProvider>
            <RootNavigator />
          </NotificationProvider>
        </DeepLinkProvider>
      </AuthProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
  },
});

export default Sentry.wrap(RootLayout);
