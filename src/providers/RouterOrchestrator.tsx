import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthProvider";
import { DeepLinkManager, DeepLinkIntent } from "./DeepLinkManager";
import { RouteManager, AppRoute, RoutingContext } from "./RouteManager";
import { useNavigationManager } from "./NavigationManager";
import { useAppDispatch } from "@/store/hooks";
import {
  loadDismissals,
  loadDismissalsFromStorage,
} from "@/store/profileBannerSlice";
import { useLocationTriggers } from "@/hooks/useLocationTriggers";
import { clearAllSessions } from "@/utils/debugUtils";
import { logger } from "@/utils/logger";

export function RouterOrchestrator({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDebug] = useState(__DEV__);

  const router = useRouter();
  const authState = useAuth();
  const dispatch = useAppDispatch();
  const { checkForUnfinishedNavigation } = useNavigationManager();

  useLocationTriggers();

  // Single initialization effect
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        logger.info("RouterOrchestrator: Starting app initialization");

        // Wait for auth to finish loading
        if (authState.isLoading) {
          return;
        }

        // 1. Initialize banner state (non-blocking)
        const dismissals = await loadDismissalsFromStorage();
        dispatch(loadDismissals(dismissals));

        // 2. Check for initial deep link
        const initialDeepLink = await DeepLinkManager.getInitialURL();

        // 3. Check if first launch
        const isFirstLaunch = await RouteManager.checkFirstLaunch();

        // 4. Make routing decision
        const routingContext: RoutingContext = {
          authState,
          deepLinkIntent: initialDeepLink.type ? initialDeepLink : undefined,
          isFirstLaunch,
        };

        const targetRoute = RouteManager.determineRoute(routingContext);
        RouteManager.logRouting(routingContext, targetRoute);

        // 5. Handle deep link actions first
        if (initialDeepLink.type) {
          const handled = await handleDeepLink(initialDeepLink);
          if (!handled) {
            // Deep link failed, fall back to regular routing
            logger.warn(
              "Deep link handling failed, falling back to regular routing"
            );
          }
        }

        // 6. Navigate if needed
        if (targetRoute && isMounted) {
          if (RouteManager.validateRoute(targetRoute, authState)) {
            logger.info("RouterOrchestrator: Routing to", { targetRoute });
            router.replace(targetRoute);
          }
        }

        // 7. Check for unfinished navigation (after auth and routing)
        if (authState.isAuthenticated && !authState.needsOnboarding) {
          await checkForUnfinishedNavigation();
        }

        if (isMounted) {
          setIsInitialized(true);
          logger.info("RouterOrchestrator: App initialization complete");
        }
      } catch (error) {
        logger.error("RouterOrchestrator: Initialization failed", { error });
        if (isMounted) {
          setIsInitialized(true); // Still mark as initialized to show UI
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, [authState, router, dispatch, checkForUnfinishedNavigation]);

  // Set up deep link listener
  useEffect(() => {
    const removeListener = DeepLinkManager.setupListener(handleDeepLink);
    return removeListener;
  }, []);

  const handleDeepLink = async (intent: DeepLinkIntent): Promise<boolean> => {
    if (!intent.type) return false;

    logger.info("RouterOrchestrator: Handling deep link", {
      type: intent.type,
    });

    try {
      switch (intent.type) {
        case "password_reset":
          if (intent.data) {
            const success = await DeepLinkManager.handlePasswordReset(
              intent.data as { accessToken: string; refreshToken: string }
            );
            if (success && intent.targetRoute) {
              router.replace(intent.targetRoute);
              return true;
            }
          }
          break;

        case "oauth_callback":
          if (intent.data) {
            const success = await DeepLinkManager.handleOAuthCallback(
              intent.data as { accessToken: string; refreshToken: string }
            ); // AuthProvider will handle the routing after OAuth success
            return success;
          }
          break;

        case "notification":
          // Navigate to main app, notification will be handled there
          if (authState.isAuthenticated && intent.targetRoute) {
            router.replace(intent.targetRoute);
            return true;
          }
          break;

        case "welcome":
          if (intent.targetRoute) {
            router.replace(intent.targetRoute);
            return true;
          }
          break;
      }
    } catch (error) {
      logger.error("RouterOrchestrator: Deep link handling failed", { error });
    }

    return false;
  };

  // Show loading state until everything is initialized
  if (!isInitialized || authState.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>SafePath</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {children}
        {showDebug && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={clearAllSessions}
          >
            <Text style={styles.debugButtonText}>🔥</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  debugButton: {
    position: "absolute",
    top: 260,
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
  debugButtonText: {
    fontSize: 24,
  },
});
