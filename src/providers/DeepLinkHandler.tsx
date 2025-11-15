import React, { useEffect } from "react";
import { Linking } from "react-native";
import { router } from "expo-router";
import { useAuth } from "./AuthProvider";
import { logger } from "@/utils/logger";
import { supabase } from "@/services/supabase";

// ============================================================================
// TYPES
// ============================================================================

type DeepLinkAction =
  | "password-reset"
  | "email-change"
  | "oauth-callback"
  | "content-link"
  | "welcome"
  | "unknown";

interface ParsedDeepLink {
  action: DeepLinkAction;
  params: Record<string, string>;
  targetRoute?: string;
}

// ============================================================================
// DEEP LINK HANDLER
// ============================================================================

export function DeepLinkHandler({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, needsOnboarding, setPendingDeepLink } = useAuth();

  // ============================================================================
  // PARSE DEEP LINK URL
  // ============================================================================
  const parseDeepLink = (url: string): ParsedDeepLink => {
    try {
      // Extract params from URL
      const params = extractUrlParams(url);

      // Password reset links
      if (url.includes("type=recovery") || params.type === "recovery") {
        return {
          action: "password-reset",
          params,
          targetRoute: "/(auth)/reset-password",
        };
      }

      // Email change confirmation
      if (url.includes("type=email_change") || params.type === "email_change") {
        return {
          action: "email-change",
          params,
          targetRoute: "/(auth)/email-change-confirm",
        };
      }

      // OAuth callbacks (Google, Apple)
      if (url.includes("access_token=") || params.access_token) {
        return {
          action: "oauth-callback",
          params,
          targetRoute: "/(auth)/callback",
        };
      }

      // Welcome/signup links
      if (url.includes("/welcome") || url.includes("welcome")) {
        return {
          action: "welcome",
          params,
          targetRoute: "/welcome",
        };
      }

      // Content deep links (notifications, shared links)
      if (url.includes("/location/") || url.includes("/review/")) {
        const contentPath = url.replace(/.*:\/\/[^\/]+/, ""); // Remove scheme and host
        return {
          action: "content-link",
          params,
          targetRoute: contentPath,
        };
      }

      // Unknown/unhandled link
      return {
        action: "unknown",
        params,
      };
    } catch (error) {
      logger.error(`🔗 Error parsing deep link:`, error);
      return {
        action: "unknown",
        params: {},
      };
    }
  };

  // ============================================================================
  // EXTRACT URL PARAMETERS
  // ============================================================================
  const extractUrlParams = (url: string): Record<string, string> => {
    const params: Record<string, string> = {};

    // Handle hash parameters (OAuth, password reset)
    const hashMatch = url.match(/#(.+)/);
    if (hashMatch) {
      const hashParams = new URLSearchParams(hashMatch[1]);
      hashParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    // Handle query parameters
    const queryMatch = url.match(/\?([^#]+)/);
    if (queryMatch) {
      const queryParams = new URLSearchParams(queryMatch[1]);
      queryParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    return params;
  };

  // ============================================================================
  // HANDLE DEEP LINK
  // ============================================================================
  const handleDeepLink = async (url: string) => {
    const parsed = parseDeepLink(url);

    switch (parsed.action) {
      // ========================================================================
      // PASSWORD RESET - Navigate immediately with params
      // ========================================================================
      case "password-reset": {
        const { access_token, refresh_token, type } = parsed.params;

        if (type === "recovery" && access_token && refresh_token) {
          logger.info(
            `🔗 Password reset link detected, navigating with tokens`
          );
          // Pass tokens to reset-password screen
          router.push({
            pathname: "/(auth)/reset-password",
            params: {
              access_token,
              refresh_token,
              type,
            },
          } as any);
        } else {
          logger.warn(
            `🔗 Invalid password reset link, navigating to forgot-password`
          );
          router.push("/(auth)/forgot-password");
        }
        break;
      }

      // ========================================================================
      // EMAIL CHANGE - Navigate immediately
      // ========================================================================
      case "email-change": {
        logger.info(`🔗 Email change confirmation link detected`);
        if (parsed.targetRoute) {
          router.push(parsed.targetRoute as any);
        }
        break;
      }

      // ========================================================================
      // OAUTH CALLBACK - Navigate immediately
      // ========================================================================
      case "oauth-callback": {
        logger.info(`🔗 OAuth callback detected`);
        logger.info(`🔗 OAuth params being passed:`, parsed.params); // <-- ADD THIS
        router.push({
          pathname: "/(auth)/callback",
          params: parsed.params, // This includes access_token, refresh_token, etc.
        } as any);
        break;
      }

      // ========================================================================
      // WELCOME LINK - Handle signup session
      // ========================================================================
      case "welcome": {
        const { access_token, refresh_token, type } = parsed.params;

        if (type === "signup" && access_token && refresh_token) {
          try {
            logger.info(`🔗 Signup confirmation, setting session`);
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            // Auth state change will trigger navigation via NavigationController
          } catch (error) {
            logger.error(`🔗 Failed to set signup session:`, error);
            router.push("/welcome");
          }
        } else {
          router.push("/welcome");
        }
        break;
      }

      // ========================================================================
      // CONTENT LINKS - Queue for after auth/onboarding
      // ========================================================================
      case "content-link": {
        if (!parsed.targetRoute) break;

        if (isAuthenticated && !needsOnboarding) {
          // Ready to navigate now
          logger.info(
            `🔗 User ready, navigating to content: ${parsed.targetRoute}`
          );
          router.push(parsed.targetRoute as any);
        } else {
          // Queue for later (NavigationController will process)
          logger.info(
            `🔗 Queueing content link for after auth: ${parsed.targetRoute}`
          );
          setPendingDeepLink(parsed.targetRoute);
        }
        break;
      }

      // ========================================================================
      // UNKNOWN - Log and ignore
      // ========================================================================
      case "unknown":
      default: {
        logger.warn(`🔗 Unknown deep link format: ${url}`);
        break;
      }
    }
  };

  // ============================================================================
  // LISTEN FOR DEEP LINKS
  // ============================================================================
  useEffect(() => {
    // Handle initial URL (app opened from deep link)
    const getInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          logger.info(`🔗 Initial deep link: ${initialUrl}`);
          await handleDeepLink(initialUrl);
        }
      } catch (error) {
        logger.error(`🔗 Error getting initial URL:`, error);
      }
    };

    getInitialUrl();

    // Listen for subsequent URLs (app already running)
    const subscription = Linking.addEventListener("url", async ({ url }) => {
      await handleDeepLink(url);
    });

    return () => {
      subscription?.remove();
    };
  }, []); // Run once on mount

  // ============================================================================
  // UPDATE WHEN AUTH STATE CHANGES
  // ============================================================================
  // This effect allows us to re-process content links when auth state changes
  useEffect(() => {
    // Dependencies ensure handleDeepLink has latest auth state
  }, [isAuthenticated, needsOnboarding]);

  return <>{children}</>;
}
