import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import { logger } from "@/utils/logger";

// ============================================================================
// STATE TYPES
// ============================================================================

type AuthState = {
  // Auth state
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: User | null;

  // Onboarding state
  needsOnboarding: boolean;
  onboardingChecked: boolean; // Track if we've checked DB

  // Deep link state (queued for after auth)
  pendingDeepLink: string | null;
};

type AuthAction =
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_SESSION"; session: Session | null }
  | { type: "SET_ONBOARDING_STATUS"; needsOnboarding: boolean }
  | { type: "SET_PENDING_LINK"; url: string | null }
  | { type: "SIGN_OUT" };

// ============================================================================
// REDUCER
// ============================================================================

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };

    case "SET_SESSION":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: !!action.session,
        session: action.session,
        user: action.session?.user || null,
        // Reset onboarding check when session changes
        onboardingChecked: false,
        needsOnboarding: false,
      };

    case "SET_ONBOARDING_STATUS":
      return {
        ...state,
        needsOnboarding: action.needsOnboarding,
        onboardingChecked: true,
      };

    case "SET_PENDING_LINK":
      return { ...state, pendingDeepLink: action.url };

    case "SIGN_OUT":
      return {
        isLoading: false,
        isAuthenticated: false,
        session: null,
        user: null,
        needsOnboarding: false,
        onboardingChecked: false,
        pendingDeepLink: null,
      };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

type AuthContextType = AuthState & {
  signOut: () => Promise<void>;
  setPendingDeepLink: (url: string | null) => void;
  clearPendingDeepLink: () => void;
  setOnboardingStatus: (needsOnboarding: boolean) => void;
  refreshOnboardingStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    isLoading: true,
    isAuthenticated: false,
    session: null,
    user: null,
    needsOnboarding: false,
    onboardingChecked: false,
    pendingDeepLink: null,
  });

  const mounted = useRef(true);

  // ============================================================================
  // INITIALIZE: Load initial session
  // ============================================================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        logger.info("🔐 AuthProvider: Initializing...");

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted.current) return;

        if (error) {
          logger.error("Failed to get initial session:", error);
          dispatch({ type: "SET_SESSION", session: null });
          return;
        }

        dispatch({ type: "SET_SESSION", session });
        logger.info("🔐 AuthProvider: Initial session loaded", {
          authenticated: !!session,
          userId: session?.user?.id,
        });

        // If we have a session, check onboarding status
        if (session?.user) {
          await checkOnboardingStatus(session.user.id);
        }
      } catch (error) {
        logger.error("Auth initialization error:", error);
        if (mounted.current) {
          dispatch({ type: "SET_SESSION", session: null });
        }
      }
    };

    initAuth();

    return () => {
      mounted.current = false;
    };
  }, []);

  // ============================================================================
  // LISTEN: Auth state changes from Supabase
  // ============================================================================
  useEffect(() => {
    logger.info("🔐 AuthProvider: Setting up auth listener");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted.current) return;

      logger.info("🔐 AuthProvider: Auth state changed", {
        event,
        authenticated: !!session,
        userId: session?.user?.id,
      });

      switch (event) {
        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
        case "USER_UPDATED":
          dispatch({ type: "SET_SESSION", session });
          // Check onboarding for new sessions
          if (session?.user && event === "SIGNED_IN") {
            await checkOnboardingStatus(session.user.id);
          }
          break;

        case "SIGNED_OUT":
          dispatch({ type: "SIGN_OUT" });
          break;

        case "PASSWORD_RECOVERY":
          // Password recovery is handled by reset-password screen
          dispatch({ type: "SET_SESSION", session });
          break;

        default:
          logger.info(`🔐 Unhandled auth event: ${event}`);
      }
    });

    return () => {
      logger.info("🔐 AuthProvider: Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================================
  // CHECK ONBOARDING STATUS
  // ============================================================================
  const checkOnboardingStatus = async (userId: string) => {
    try {
      logger.info(`🔐 Checking onboarding status for user: ${userId}`);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("user_id", userId)
        .single();

      if (!mounted.current) return;

      if (error) {
        logger.error("Failed to check onboarding status:", error);
        // Default to needing onboarding if we can't check
        dispatch({ type: "SET_ONBOARDING_STATUS", needsOnboarding: true });
        return;
      }

      const needsOnboarding = !profile?.onboarding_complete;
      dispatch({ type: "SET_ONBOARDING_STATUS", needsOnboarding });

      logger.info("🔐 Onboarding status:", {
        userId,
        needsOnboarding,
        onboardingComplete: profile?.onboarding_complete,
      });
    } catch (error) {
      logger.error("Error checking onboarding status:", error);
      if (mounted.current) {
        dispatch({ type: "SET_ONBOARDING_STATUS", needsOnboarding: true });
      }
    }
  };

  // ============================================================================
  // CONTEXT METHODS
  // ============================================================================

  const signOut = async () => {
    logger.info("🔐 Signing out...");
    await supabase.auth.signOut();
    // State will be updated by onAuthStateChange listener
  };

  const setPendingDeepLink = (url: string | null) => {
    logger.info(`🔐 Setting pending deep link: ${url}`);
    dispatch({ type: "SET_PENDING_LINK", url });
  };

  const clearPendingDeepLink = () => {
    dispatch({ type: "SET_PENDING_LINK", url: null });
  };

  const setOnboardingStatus = (needsOnboarding: boolean) => {
    dispatch({ type: "SET_ONBOARDING_STATUS", needsOnboarding });
  };

  const refreshOnboardingStatus = async () => {
    if (state.user?.id) {
      await checkOnboardingStatus(state.user.id);
    }
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: AuthContextType = {
    ...state,
    signOut,
    setPendingDeepLink,
    clearPendingDeepLink,
    setOnboardingStatus,
    refreshOnboardingStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
