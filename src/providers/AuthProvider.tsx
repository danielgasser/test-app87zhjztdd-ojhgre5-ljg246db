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
import { router } from "expo-router";

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
  | { type: "SET_RECOVERY_SESSION"; session: Session | null }
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
    case "SET_RECOVERY_SESSION":
      return {
        ...state,
        session: action.session,
        user: action.session?.user || null,
        isAuthenticated: false,
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted.current) return;

      switch (event) {
        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
        case "USER_UPDATED":
          dispatch({ type: "SET_SESSION", session });
          break;

        case "SIGNED_OUT":
          dispatch({ type: "SIGN_OUT" });
          break;

        case "PASSWORD_RECOVERY":
          // Password recovery is handled by reset-password screen
          dispatch({ type: "SET_RECOVERY_SESSION", session });
          break;

        default:
        //logger.info(`🔐 Unhandled auth event: ${event}`);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!state.session?.user || state.onboardingChecked) {
      return;
    }
    const userWithAmr = state.session.user as any;
    const isPasswordRecovery = userWithAmr.amr?.some(
      (item: any) => item.method === "recovery"
    );

    if (!isPasswordRecovery && state.isAuthenticated) {
      checkOnboardingStatus(state.session.user.id);
    }
  }, [state.session?.user?.id, state.onboardingChecked, state.isAuthenticated]);

  // ============================================================================
  // CHECK ONBOARDING STATUS
  // ============================================================================
  const checkOnboardingStatus = async (userId: string) => {
    try {
      const testResult = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("user_id", userId)
        .maybeSingle();
    } catch (err) {
      logger.error(`🔐 Direct query error:`, err);
    }
    try {
      // Add 5 second timeout
      const timeoutPromise = new Promise<{ data: null; error: any }>(
        (resolve) =>
          setTimeout(
            () => resolve({ data: null, error: { message: "Query timeout" } }),
            3000
          )
      );
      const queryPromise = supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: profile, error } = (await Promise.race([
        queryPromise,
        timeoutPromise,
      ])) as any;

      if (!mounted.current) {
        logger.warn(`🔐 Component unmounted, exiting`);
        return;
      }

      if (error) {
        logger.error("🔐 Query error:", error);
        dispatch({ type: "SET_ONBOARDING_STATUS", needsOnboarding: true });
        return;
      }

      const needsOnboarding = !profile?.onboarding_complete;
      dispatch({ type: "SET_ONBOARDING_STATUS", needsOnboarding });
    } catch (error) {
      logger.error("🔐 CATCH block error:", error);
      if (mounted.current) {
        dispatch({ type: "SET_ONBOARDING_STATUS", needsOnboarding: true });
      }
    }
  };

  // ============================================================================
  // CONTEXT METHODS
  // ============================================================================

  const signOut = async () => {
    await supabase.auth.signOut();

    // State will be updated by onAuthStateChange listener
  };

  const setPendingDeepLink = (url: string | null) => {
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
