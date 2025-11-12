import React from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { store } from "@/store";
import { AuthProvider } from "@/providers/AuthProvider";
import NotificationProvider from "@/components/NotificationProvider";
import { RouterOrchestrator } from "@/providers/RouterOrchestrator";
import * as Sentry from "@sentry/react-native";

// Initialize Sentry (moved to top level for clarity)
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false,
  tracesSampleRate: __DEV__ ? 0 : 0.1,
  enableAutoPerformanceTracing: false,
  environment: __DEV__ ? "development" : "production",
  integrations: [
    Sentry.breadcrumbsIntegration({
      console: false,
      dom: false,
      fetch: false,
      xhr: false,
    }),
  ],
  beforeBreadcrumb(breadcrumb) {
    if (
      breadcrumb.level &&
      breadcrumb.level !== "error" &&
      breadcrumb.level !== "warning"
    ) {
      return null;
    }
    return breadcrumb;
  },
});

function RootLayout() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <NotificationProvider>
          <RouterOrchestrator>
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
          </RouterOrchestrator>
        </NotificationProvider>
      </AuthProvider>
    </Provider>
  );
}

export default Sentry.wrap(RootLayout);
