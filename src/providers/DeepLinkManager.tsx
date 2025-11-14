// src/providers/DeepLinkManager.tsx - CLEAN DEEP LINK HANDLING
import React, { useEffect } from "react";
import { Linking } from "react-native";
import { router } from "expo-router";
import { useAuth } from "./AuthManager";
import { logger } from "@/utils/logger";
import { supabase } from "@/services/supabase";

type DeepLinkAction =
  | "password-reset"
  | "email-change-confirm"
  | "oauth-callback"
  | "notification"
  | "welcome";

interface ParsedDeepLink {
  action: DeepLinkAction;
  params: Record<string, string>;
  targetRoute?: string;
}

export function DeepLinkManager({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    needsOnboarding,
    setPendingDeepLink,
    processPendingDeepLink,
  } = useAuth();

  // Parse deep link URL
  const parseDeepLink = (url: string): ParsedDeepLink | null => {
    try {
      logger.info("Parsing deep link:", { url });

      // Password reset links
      if (url.includes("type=recovery")) {
        return {
          action: "password-reset",
          params: extractUrlParams(url),
          targetRoute: "/(auth)/reset-password",
        };
      }

      // Email change confirmation
      if (url.includes("type=email_change")) {
        return {
          action: "email-change-confirm",
          params: extractUrlParams(url),
          targetRoute: "/(auth)/email-change-confirm",
        };
      }

      // OAuth callbacks
      if (url.includes("access_token=")) {
        return {
          action: "oauth-callback",
          params: extractUrlParams(url),
          targetRoute: "/(auth)/callback",
        };
      }

      // Push notification deep links
      if (url.includes("/location/") || url.includes("/review/")) {
        return {
          action: "notification",
          params: {},
          targetRoute: url.replace(/.*:\/\/[^\/]+/, ""), // Remove scheme and host
        };
      }

      // Welcome/marketing links
      if (url.includes("/welcome")) {
        return {
          action: "welcome",
          params: {},
          targetRoute: "/welcome",
        };
      }

      return null;
    } catch (error) {
      logger.error("Error parsing deep link:", error);
      return null;
    }
  };

  // Extract URL parameters from hash or query
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

  // Handle deep link
  const handleDeepLink = async (url: string) => {
    const parsed = parseDeepLink(url);
    if (!parsed) {
      logger.warn("Unhandled deep link:", { url });
      return;
    }

    logger.info("Handling deep link:", parsed);

    switch (parsed.action) {
      case "password-reset":
        const { access_token, refresh_token, type } = parsed.params;
        if (type === "recovery" && access_token && refresh_token) {
          logger.info("Setting recovery session");
          try {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (!error && parsed.targetRoute) {
              router.push(parsed.targetRoute as any);
            } else {
              logger.error("Error setting session:", error);
              router.push("/(auth)/forgot-password");
            }
          } catch (error) {
            logger.error("Session setting failed:", error);
            router.push("/(auth)/forgot-password");
          }
        } else {
          logger.warn("Missing tokens for password reset");
          router.push("/(auth)/forgot-password");
        }
        break;
      case "email-change-confirm":
      case "oauth-callback":
        // Auth-related links - always handle immediately
        if (parsed.targetRoute) {
          router.push(parsed.targetRoute as any);
        }
        break;

      case "notification":
        // Content links - require authentication
        if (isAuthenticated && !needsOnboarding && parsed.targetRoute) {
          router.push(parsed.targetRoute as any);
        } else if (parsed.targetRoute) {
          // Queue for later processing
          setPendingDeepLink(parsed.targetRoute);
          const targetedRoute = parsed.targetRoute;
          logger.info("Queued deep link for after auth:", { targetedRoute });
        }
        break;

      case "welcome":
        // Marketing links - always handle immediately
        if (parsed.targetRoute) {
          router.push(parsed.targetRoute as any);
        }
        break;

      default:
        logger.warn("Unhandled deep link action:", parsed.action);
    }
  };

  // Listen for deep links
  useEffect(() => {
    // Handle initial URL (app opened from deep link)
    const getInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        logger.info("Initial deep link:", { initialUrl });
        await handleDeepLink(initialUrl);
      }
    };

    getInitialUrl();

    // Listen for subsequent URLs (app already running)
    const subscription = Linking.addEventListener("url", async ({ url }) => {
      logger.info("Incoming deep link:", { url });
      await handleDeepLink(url);
    });

    return () => subscription?.remove();
  }, []); // No dependencies - this effect should only run once

  // Process pending deep links when auth state changes
  useEffect(() => {
    if (isAuthenticated && !needsOnboarding) {
      processPendingDeepLink();
    }
  }, [isAuthenticated, needsOnboarding, processPendingDeepLink]);

  return <>{children}</>;
}
