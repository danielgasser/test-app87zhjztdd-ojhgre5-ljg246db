// src/providers/AuthProvider.tsx - INDUSTRY STANDARD VERSION
import React, { createContext, useContext, useEffect, useReducer } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import * as SecureStore from "expo-secure-store";
import { logger } from "@/utils/logger";

type AuthAction =
  | { type: "RESTORE_TOKEN"; token: Session | null }
  | { type: "SIGN_IN"; session: Session }
  | { type: "SIGN_OUT" };

interface AuthState {
  userToken: string | null;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isSignout: boolean;
  needsOnboarding: boolean;
}

const authReducer = (prevState: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "RESTORE_TOKEN":
      return {
        ...prevState,
        userToken: action.token?.access_token || null,
        session: action.token,
        user: action.token?.user || null,
        isLoading: false,
      };
    case "SIGN_IN":
      return {
        ...prevState,
        isSignout: false,
        userToken: action.session.access_token,
        session: action.session,
        user: action.session.user,
      };
    case "SIGN_OUT":
      return {
        ...prevState,
        isSignout: true,
        userToken: null,
        session: null,
        user: null,
        needsOnboarding: false,
      };
  }
};

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    isLoading: true,
    isSignout: false,
    userToken: null,
    session: null,
    user: null,
    needsOnboarding: false,
  });

  // Simple initialization - NO complex dependencies
  useEffect(() => {
    const bootstrapAsync = async () => {
      let userSession: Session | null = null;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        userSession = session;
      } catch (e) {
        logger.error("Failed to restore session:", e);
      }

      dispatch({ type: "RESTORE_TOKEN", token: userSession });
    };

    bootstrapAsync();
  }, []);

  // Simple auth state listener - NO complex dependencies
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info(`Auth event: ${event}`);

      if (event === "SIGNED_OUT") {
        dispatch({ type: "SIGN_OUT" });
      } else if (
        session &&
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
      ) {
        dispatch({ type: "SIGN_IN", session });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    dispatch({ type: "SIGN_OUT" });
  };

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// Helper hooks for conditional rendering
export const useIsSignedIn = () => {
  const { userToken } = useAuth();
  return userToken != null;
};

export const useIsSignedOut = () => {
  return !useIsSignedIn();
};
