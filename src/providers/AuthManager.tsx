import React, { createContext, useContext, useEffect, useReducer } from "react";
import { Session, User } from "@supabase/supabase-js";
import { router } from "expo-router";
import { supabase } from "@/services/supabase";
import { logger } from "@/utils/logger";

// Auth state types
type AuthState = {
  // Core auth state
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: User | null;

  // Onboarding state
  needsOnboarding: boolean;

  // Deep link state
  pendingDeepLink: string | null;
};

type AuthAction =
  | { type: "LOADING"; loading: boolean }
  | { type: "SESSION_RESTORED"; session: Session | null }
  | { type: "SESSION_UPDATED"; session: Session }
  | { type: "SIGNED_OUT" }
  | { type: "ONBOARDING_STATUS"; needsOnboarding: boolean }
  | { type: "SET_PENDING_LINK"; url: string | null };

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOADING":
      return { ...state, isLoading: action.loading };

    case "SESSION_RESTORED":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: !!action.session,
        session: action.session,
        user: action.session?.user || null,
      };

    case "SESSION_UPDATED":
      return {
        ...state,
        isAuthenticated: true,
        session: action.session,
        user: action.session.user,
      };

    case "SIGNED_OUT":
      return {
        ...state,
        isAuthenticated: false,
        session: null,
        user: null,
        needsOnboarding: false,
        pendingDeepLink: null,
      };

    case "ONBOARDING_STATUS":
      return { ...state, needsOnboarding: action.needsOnboarding };

    case "SET_PENDING_LINK":
      return { ...state, pendingDeepLink: action.url };

    default:
      return state;
  }
}

// Context
type AuthContextType = AuthState & {
  signOut: () => Promise<void>;
  setPendingDeepLink: (url: string | null) => void;
  processPendingDeepLink: () => void;
  completeOnboarding: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthManager({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    isLoading: true,
    isAuthenticated: false,
    session: null,
    user: null,
    needsOnboarding: false,
    pendingDeepLink: null,
  });

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          // Check onboarding status
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_complete")
            .eq("user_id", session.user.id)
            .single();

          if (!mounted) return;

          dispatch({ type: "SESSION_RESTORED", session });
          dispatch({
            type: "ONBOARDING_STATUS",
            needsOnboarding: !profile?.onboarding_complete,
          });
        } else {
          dispatch({ type: "SESSION_RESTORED", session: null });
        }
      } catch (error) {
        logger.error("Auth initialization error:", error);
        if (mounted) {
          dispatch({ type: "SESSION_RESTORED", session: null });
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Auth state listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info("Auth event:", { event });

      if (event === "SIGNED_OUT") {
        dispatch({ type: "SIGNED_OUT" });
      } else if (
        session &&
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
      ) {
        dispatch({ type: "SESSION_UPDATED", session });

        // Check onboarding for new sessions
        if (event === "SIGNED_IN") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_complete")
            .eq("user_id", session.user.id)
            .single();

          dispatch({
            type: "ONBOARDING_STATUS",
            needsOnboarding: !profile?.onboarding_complete,
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Context methods
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const setPendingDeepLink = (url: string | null) => {
    dispatch({ type: "SET_PENDING_LINK", url });
  };

  const processPendingDeepLink = () => {
    if (
      state.pendingDeepLink &&
      state.isAuthenticated &&
      !state.needsOnboarding
    ) {
      const url = state.pendingDeepLink;
      dispatch({ type: "SET_PENDING_LINK", url: null });

      // Navigate to the deep link
      if (url.includes("/location/") || url.includes("/review/")) {
        router.push(url as any);
      }
    }
  };

  const completeOnboarding = () => {
    dispatch({ type: "ONBOARDING_STATUS", needsOnboarding: false });
  };

  const contextValue: AuthContextType = {
    ...state,
    signOut,
    setPendingDeepLink,
    processPendingDeepLink,
    completeOnboarding,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthManager");
  }
  return context;
}
