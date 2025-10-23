import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Provider } from "react-redux";
import { store } from "src/store";
import { supabase } from "@/services/supabase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSession } from "@/store/authSlice";
import { Keyboard, Linking, TouchableWithoutFeedback } from "react-native";
import {
  loadDismissals,
  loadDismissalsFromStorage,
} from "@/store/profileBannerSlice";
import NotificationProvider from "@/components/NotificationProvider";
import {
  checkForActiveNavigation,
  startNavigationSession,
  endNavigationSession,
  setSelectedRoute,
  startNavigation,
  SafeRoute,
  RouteCoordinate,
} from "@/store/locationsSlice";
import { calculateRouteSafety } from "@/store/locationsSlice";
import { formatDistanceToNow } from "date-fns";
import { notify } from "@/utils/notificationService";
import { notificationService } from "@/services/notificationService";
import { useLocationTriggers } from "@/hooks/useLocationTriggers";
import * as Sentry from "@sentry/react-native";
import { logger } from "@/utils/logger";

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__, // Enable debug logs in development
  tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
  environment: __DEV__ ? "development" : "production",
});

function RootLayout() {
  return (
    <Provider store={store}>
      <NotificationProvider>
        <RootLayoutNav />
      </NotificationProvider>
    </Provider>
  );
}

function RootLayoutNav() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  // Inside RootLayoutNav, before the useEffect
  const handleContinueNavigation = async (activeRoute: any) => {
    try {
      // Validate route coordinates structure
      if (
        !Array.isArray(activeRoute.route_coordinates) ||
        activeRoute.route_coordinates.length === 0 ||
        !activeRoute.route_coordinates.every(
          (coord: any) =>
            typeof coord === "object" &&
            coord !== null &&
            typeof coord.latitude === "number" &&
            typeof coord.longitude === "number"
        )
      ) {
        notify.error("Invalid route data format");
        return;
      }

      const routeCoords =
        activeRoute.route_coordinates as unknown as RouteCoordinate[];
      notify.info("Recalculating route safety...");

      const state = store.getState();
      const userProfile = state.user.profile;

      if (!userProfile) {
        notify.error("Profile required to calculate route safety");
        return;
      }

      const safetyAnalysis = await dispatch(
        calculateRouteSafety({
          route_coordinates: routeCoords,
          user_demographics: {
            race_ethnicity: userProfile.race_ethnicity?.[0] || "",
            gender: userProfile.gender || "",
            lgbtq_status: String(userProfile.lgbtq_status ?? ""),
            religion: userProfile.religion || "",
            disability_status: userProfile.disability_status?.[0] || "",
            age_range: userProfile.age_range || "",
          },
        })
      ).unwrap();

      const safeRoute: SafeRoute = {
        id: `db_route_${activeRoute.id}`,
        name: `${activeRoute.origin_name} → ${activeRoute.destination_name}`,
        route_type: "balanced",
        coordinates: routeCoords,
        route_points: routeCoords,
        estimated_duration_minutes: activeRoute.duration_minutes,
        distance_kilometers: activeRoute.distance_km,
        safety_analysis: safetyAnalysis,
        created_at: activeRoute.created_at,
        databaseId: activeRoute.id,
      };

      dispatch(setSelectedRoute(safeRoute));
      await dispatch(startNavigationSession(activeRoute.id));
      dispatch(startNavigation());
      router.push("/(tabs)");
    } catch (error) {
      notify.error("Failed to restore route. Please try again.");
    }
  };
  // Auth state listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
          dispatch(setSession(session));

          // Register for push notifications on login
          if (session.user?.id) {
            notificationService
              .registerForPushNotifications()
              .then((pushToken) => {
                if (pushToken) {
                  return notificationService.savePushToken(
                    session.user.id,
                    pushToken
                  );
                }
              })
              .catch((error) => {
                logger.error("Failed to register push token:", error);
                notify.error("Something went wrong. Please try again");
              });
          }
          // Don't route here - let deep link or callback screen handle it
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [dispatch]);

  // Deep link listener for OAuth callback
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (url.includes("safepath://callback")) {
        // Navigate WITH the URL as a param
        router.push({
          pathname: "/(auth)/callback",
          params: { deepLinkUrl: url },
        });
      }
      if (url.includes("safepath://reset-password")) {
        // Parse tokens from URL hash
        const hashPart = url.split("#")[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const type = params.get("type");

          if (type === "recovery" && accessToken && refreshToken) {
            // Set session BEFORE navigating
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (!error) {
              // Now navigate - session is already set
              router.push("/(auth)/reset-password");
              return;
            }
          }
        }
        // If no tokens or error, still go to reset-password (will show error)
        router.push("/(auth)/reset-password");
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
  }, []);

  // First launch check
  useEffect(() => {
    checkFirstLaunch();
  }, []);

  useEffect(() => {
    const initializeBannerState = async () => {
      const dismissals = await loadDismissalsFromStorage();
      dispatch(loadDismissals(dismissals));
    };

    initializeBannerState();
  }, [dispatch]);

  // Save banner dismissals to AsyncStorage whenever they change
  const bannerDismissals = useAppSelector(
    (state) => state.profileBanner.dismissedBanners
  );

  useEffect(() => {
    const saveBannerState = async () => {
      const { saveDismissalsToStorage } = await import(
        "@/store/profileBannerSlice"
      );
      await saveDismissalsToStorage(bannerDismissals);
    };

    if (Object.keys(bannerDismissals).length > 0) {
      saveBannerState();
    }
  }, [bannerDismissals]);

  // Handle first launch routing - ONLY if auth didn't handle it
  useEffect(() => {
    if (isFirstLaunch === null || authCheckComplete) return;

    if (isFirstLaunch) {
      router.replace("/welcome");
    } else {
      router.replace("/(tabs)");
    }
  }, [isFirstLaunch, authCheckComplete, router]);

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
      logger.error("Error checking first launch:", error);
      setIsFirstLaunch(false);
    }
  };

  // Check for unfinished navigation sessions on app start
  useEffect(() => {
    const checkNavigation = async () => {
      try {
        const activeRoute = await dispatch(checkForActiveNavigation()).unwrap();

        if (!activeRoute) return; // No active navigation found

        // Check if user is currently navigating
        const state = store.getState();
        const isCurrentlyNavigating = state.locations.navigationActive;

        if (isCurrentlyNavigating) {
          // User is already navigating, do nothing
          return;
        }
        if (!activeRoute.navigation_started_at) {
          logger.error("Active route missing start time");
          return;
        }
        // User has unfinished route but not currently navigating - ask them
        const routeTime = new Date(activeRoute.navigation_started_at);
        const timeAgo = formatDistanceToNow(routeTime, { addSuffix: true });

        notify.confirm(
          "Unfinished Route",
          `You have a route from ${timeAgo}. Would you like to continue?`,
          [
            {
              text: "Discard",
              style: "destructive",
              onPress: async () => {
                await dispatch(endNavigationSession(activeRoute.id));
              },
            },
            {
              text: "Not Now",
              style: "cancel",
              onPress: () => {},
            },
            {
              text: "Continue",
              onPress: () => {
                handleContinueNavigation(activeRoute);
              },
            },
          ]
        );
      } catch (error) {
        logger.error("Error checking active navigation:", error);
      }
    };

    // Only check after auth is complete and user is logged in
    if (authCheckComplete) {
      checkNavigation();
    }
  }, [authCheckComplete, dispatch]);

  useLocationTriggers();
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
    </TouchableWithoutFeedback>
  );
}
export default Sentry.wrap(RootLayout);
