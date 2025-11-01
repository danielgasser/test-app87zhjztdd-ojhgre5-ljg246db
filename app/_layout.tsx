import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Provider } from "react-redux";
import { store } from "src/store";
import { supabase } from "@/services/supabase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSession } from "@/store/authSlice";
import {
  Keyboard,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
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
  fetchUserReviews,
} from "@/store/locationsSlice";
import { calculateRouteSafety } from "@/store/locationsSlice";
import { formatDistanceToNow } from "date-fns";
import { notify } from "@/utils/notificationService";
import { notificationService } from "@/services/notificationService";
import { useLocationTriggers } from "@/hooks/useLocationTriggers";
import * as Sentry from "@sentry/react-native";
import { logger } from "@/utils/logger";
import * as Notifications from "expo-notifications";
import NetInfo from "@react-native-community/netinfo";
import { offlineQueue } from "@/services/offlineQueue";
import { clearAllSessions } from "@/utils/debugUtils";

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false, // ← No debug logs

  // Reduce performance tracking drastically
  tracesSampleRate: __DEV__ ? 0 : 0.1, // 0% dev, 10% production
  enableAutoPerformanceTracing: false, // ← Disable automatic perf tracking

  environment: __DEV__ ? "development" : "production",

  // ⭐ KEY: Disable breadcrumb collection
  integrations: [
    Sentry.breadcrumbsIntegration({
      console: false, // ← No console.log breadcrumbs
      dom: false, // ← No click/touch breadcrumbs
      fetch: false, // ← No HTTP request breadcrumbs
      xhr: false, // ← No XMLHttpRequest breadcrumbs
    }),
  ],

  // ⭐ Extra filter: Only capture errors/warnings
  beforeBreadcrumb(breadcrumb, hint) {
    // Only allow error-level breadcrumbs through
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
      <NotificationProvider>
        <RootLayoutNav />
      </NotificationProvider>
    </Provider>
  );
}

function RootLayoutNav() {
  // For DEBUG
  const [showDebug, setShowDebug] = useState(__DEV__); // Only show in development

  const [isHandlingCallback, setIsHandlingCallback] = useState(false);

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
        if (event === "INITIAL_SESSION") {
          // App restart - check onboarding and route
          if (session) {
            dispatch(setSession(session));
            const emailConfirmed = session.user.email_confirmed_at;

            // Check onboarding status
            if (!isHandlingCallback && emailConfirmed) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("onboarding_complete")
                .eq("user_id", session.user.id)
                .single();

              // Route based on onboarding
              if (!profile || !profile.onboarding_complete) {
                router.replace("/onboarding");
              } else {
                router.replace("/(tabs)");
              }
            }
            // Register for push notifications
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
                });
            }
          }

          // Mark auth check as complete
          setAuthCheckComplete(true);
        } else if (event === "SIGNED_IN" && session) {
          // New login - let login screen handle routing
          dispatch(setSession(session));

          // Register for push notifications
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
              });
          }

          // Mark auth check as complete
          setAuthCheckComplete(true);
        } else if (event === "SIGNED_OUT") {
          // Mark auth check as complete
          setAuthCheckComplete(true);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [dispatch]);

  // Listen for notification taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<
          string,
          any
        >;

        if (!data || typeof data !== "object") return;

        // Handle different notification types
        switch (data.type) {
          case "location_trigger":
          case "location_safety_change":
            // Navigate to location details
            if (data.locationId) {
              router.push(
                `/(tabs)/(locations)/location-details?id=${data.locationId}`
              );
            }
            break;

          case "route_safety_alert":
            // Navigate to map (where active navigation is)
            if (data.locationId) {
              router.push(`/(tabs)/index?locationId=${data.locationId}`);
            } else {
              // Fallback to map if no location ID
              router.push("/(tabs)/index");
            }
            break;
          case "batched_route_safety_alerts":
            // For batched alerts, open the first (closest) location
            if (data.reviews && data.reviews.length > 0) {
              router.push(
                `/(tabs)/(locations)/location-details?id=${data.reviews[0].locationId}`
              );
            }
            break;
          default:
            logger.warn("Unknown notification type:", data.type);
        }
      }
    );

    return () => subscription.remove();
  }, []);

  // Process offline queue when connection restored
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        const count = await offlineQueue.processAll();
        if (count > 0) {
          notify.success(
            `${count} queued review${count > 1 ? "s" : ""} synced!`
          );

          // Refresh user reviews to show synced reviews
          const user = await supabase.auth.getUser();
          if (user.data.user) {
            dispatch(fetchUserReviews(user.data.user.id));
          }
        }
      }
    });

    return () => unsubscribe();
  }, [dispatch]);
  // Deep link listener for OAuth callback
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      // Handle password reset
      if (url.includes("safepath://reset-password")) {
        const hashPart = url.split("#")[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const type = params.get("type");

          if (type === "recovery" && accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (!error) {
              router.replace("/(auth)/reset-password");
            }
          }
        }
        return;
      }

      // Handle email confirmation (type=signup) OR Google OAuth (callback)
      if (url.includes("#access_token=")) {
        setIsHandlingCallback(true);

        try {
          const hashPart = url.split("#")[1];
          const params = new URLSearchParams(hashPart);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              logger.error("🟡 _LAYOUT: Session error:", error);
              router.replace("/login");
              return;
            }

            if (data.session) {
              dispatch(setSession(data.session));

              // Check onboarding status
              const { data: profile } = await supabase
                .from("profiles")
                .select("onboarding_complete")
                .eq("user_id", data.session.user.id)
                .single();

              // Route based on onboarding
              if (!profile || !profile.onboarding_complete) {
                router.replace("/onboarding");
              } else {
                router.replace("/(tabs)");
              }
            }
          }
        } catch (error) {
          logger.error("🟡 _LAYOUT: Error:", error);
          router.replace("/login");
        } finally {
          setTimeout(() => setIsHandlingCallback(false), 1000);
        }
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
      <View style={{ flex: 1 }}>
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
        {showDebug && (
          <TouchableOpacity
            style={debugStyles.floatingButton}
            onPress={clearAllSessions}
          >
            <Text style={debugStyles.buttonText}>🔥</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}
export default Sentry.wrap(RootLayout);
// Add these styles at the bottom:
const debugStyles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    top: 120,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    fontSize: 24,
  },
});
