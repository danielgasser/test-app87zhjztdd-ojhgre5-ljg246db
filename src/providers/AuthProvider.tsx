import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import { useAppDispatch } from "@/store/hooks";
import { setSession } from "@/store/authSlice";
import { notificationService } from "@/services/notificationService";
import { logger } from "@/utils/logger";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  needsOnboarding: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    needsOnboarding: false,
    isAuthenticated: false,
  });

  const dispatch = useAppDispatch();

  const checkOnboardingStatus = useCallback(
    async (user: User): Promise<boolean> => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("user_id", user.id)
          .single();

        return !profile || !profile.onboarding_complete;
      } catch (error) {
        logger.error("Failed to check onboarding status:", error);
        return true; // Default to needs onboarding on error
      }
    },
    []
  );

  const registerPushNotifications = useCallback(async (userId: string) => {
    try {
      const pushToken =
        await notificationService.registerForPushNotifications();
      if (pushToken) {
        await notificationService.savePushToken(userId, pushToken);
      }
    } catch (error) {
      logger.error("Failed to register push notifications:", error);
    }
  }, []);

  const updateAuthState = useCallback(
    async (session: Session | null) => {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      if (!session) {
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          needsOnboarding: false,
          isAuthenticated: false,
        });
        dispatch(setSession(null));
        return;
      }

      const needsOnboarding = await checkOnboardingStatus(session.user);

      setAuthState({
        user: session.user,
        session,
        isLoading: false,
        needsOnboarding,
        isAuthenticated: true,
      });

      dispatch(setSession(session));

      // Register push notifications (non-blocking)
      registerPushNotifications(session.user.id);
    },
    [checkOnboardingStatus, dispatch, registerPushNotifications]
  );

  const signOut = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    await supabase.auth.signOut();
  }, []);

  const refreshAuthState = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await updateAuthState(session);
  }, [updateAuthState]);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await updateAuthState(session);
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info(`Auth event: ${event}`);

      if (event === "SIGNED_OUT") {
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          needsOnboarding: false,
          isAuthenticated: false,
        });
        dispatch(setSession(null));
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await updateAuthState(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [updateAuthState, dispatch]);

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    refreshAuthState,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
