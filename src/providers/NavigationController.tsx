import React, { useEffect, useRef } from "react";
import { router, useSegments, usePathname } from "expo-router";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/services/supabase";
import { logger } from "@/utils/logger";

// ============================================================================
// NAVIGATION CONTROLLER
// ============================================================================

export function NavigationController({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isLoading,
    isAuthenticated,
    needsOnboarding,
    onboardingChecked,
    pendingDeepLink,
    clearPendingDeepLink,
    signOut,
  } = useAuth();

  const segments = useSegments();
  const pathname = usePathname();

  // Track if we've done initial navigation
  const hasNavigated = useRef(false);
  // Track if we've checked profile existence
  const profileChecked = useRef(false);

  // ============================================================================
  // CHECK PROFILE EXISTS IN DB
  // ============================================================================
  useEffect(() => {
    // Only check once when authenticated and onboarding status is known
    if (!isAuthenticated || !onboardingChecked || profileChecked.current) {
      return;
    }

    const checkProfileExists = async () => {
      try {
        logger.info(
          "🧭 NavigationController: Checking if profile exists in DB"
        );

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          logger.warn("🧭 No user found during profile check");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (error && error.code === "PGRST116") {
          // Profile doesn't exist - sign them out
          logger.warn("🧭 Profile not found in DB, signing out", {
            userId: user.id,
          });
          //await signOut();
          //return;
        }

        if (error) {
          logger.error("🧭 Error checking profile:", error);
          return;
        }

        logger.info("🧭 Profile exists in DB", { profileId: profile.id });
        profileChecked.current = true;
      } catch (error) {
        logger.error("🧭 Error in profile check:", error);
      }
    };

    checkProfileExists();
  }, [isAuthenticated, onboardingChecked]);

  // Reset profile check when user signs out
  useEffect(() => {
    if (!isAuthenticated) {
      profileChecked.current = false;
    }
  }, [isAuthenticated]);

  // ============================================================================
  // MAIN NAVIGATION LOGIC
  // ============================================================================
  useEffect(() => {
    // Don't navigate while loading
    if (isLoading) {
      logger.info("🧭 NavigationController: Still loading, waiting...");
      return;
    }

    // Don't navigate until onboarding status is checked (for authenticated users)
    if (isAuthenticated && !onboardingChecked) {
      logger.info("🧭 NavigationController: Waiting for onboarding status...");
      return;
    }

    const currentSegment = segments[0];
    logger.info("🧭 NavigationController: Navigation check", {
      isAuthenticated,
      needsOnboarding,
      onboardingChecked,
      currentSegment,
      pathname,
      hasNavigated: hasNavigated.current,
    });

    // ========================================================================
    // ROUTE DECISION LOGIC
    // ========================================================================

    if (!isAuthenticated) {
      // -------- NOT AUTHENTICATED --------
      const publicRoutes = ["welcome", "(auth)"];
      const isOnPublicRoute = publicRoutes.some(
        (route) => currentSegment === route || pathname?.includes(route)
      );

      if (!isOnPublicRoute) {
        logger.info("🧭 Not authenticated, navigating to welcome");
        router.replace("/welcome");
        hasNavigated.current = true;
      }
    } else {
      // -------- AUTHENTICATED --------

      // Check if we have a pending deep link and we're ready to process it
      if (pendingDeepLink && !needsOnboarding) {
        logger.info(`🧭 Processing pending deep link: ${pendingDeepLink}`);
        router.push(pendingDeepLink as any);
        clearPendingDeepLink();
        hasNavigated.current = true;
        return;
      }

      if (needsOnboarding) {
        // -------- NEEDS ONBOARDING --------
        if (currentSegment !== "onboarding") {
          logger.info("🧭 Needs onboarding, navigating to onboarding");
          router.replace("/onboarding");
          hasNavigated.current = true;
        }
      } else {
        // -------- READY TO USE APP --------
        const protectedRoutes = [
          "(tabs)",
          "review",
          "edit-profile",
          "privacy-settings",
          "notification-settings",
          "display-settings",
          "edit-review",
        ];
        const isOnProtectedRoute = protectedRoutes.some(
          (route) => currentSegment === route || pathname?.includes(route)
        );

        if (!isOnProtectedRoute) {
          logger.info("🧭 Authenticated and onboarded, navigating to app");
          router.replace("/(tabs)");
          hasNavigated.current = true;
        }
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    needsOnboarding,
    onboardingChecked,
    segments,
    pathname,
    pendingDeepLink,
  ]);

  // ============================================================================
  // RESET NAVIGATION FLAG ON ROUTE CHANGE
  // ============================================================================
  useEffect(() => {
    // Reset flag when user manually navigates somewhere
    hasNavigated.current = false;
  }, [pathname]);

  return <>{children}</>;
}
