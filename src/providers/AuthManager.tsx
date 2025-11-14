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
    console.log("🔧 Supabase config:", {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
      key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "🔥 Auth event:",
        event,
        "Has session:",
        !!session,
        "User ID:",
        session?.user?.id
      );
      const timeoutId = setTimeout(() => {
        console.log("⏰ Auth handler timeout - forcing loading to stop");
        dispatch({ type: "LOADING", loading: false });
      }, 5000);

      try {
        switch (event) {
          case "SIGNED_OUT":
            dispatch({ type: "SIGNED_OUT" });
            break;

          case "SIGNED_IN":
            if (session?.user) {
              console.log("✅ About to dispatch SESSION_UPDATED");
              dispatch({ type: "SESSION_UPDATED", session });

              console.log(
                "🔍 About to query profiles table for user:",
                session.user.id
              );
              // Check onboarding with proper error handling
              try {
                console.log(
                  "🔍 About to query profiles table for user:",
                  session.user.id
                );

                // Test simple query first
                console.log("🧪 Testing simple query...");
                const { data: testData, error: testError } = await supabase
                  .from("profiles")
                  .select("id")
                  .limit(1);
                console.log("🧪 Simple query result:", { testData, testError });

                // Test specific user query without .single()
                console.log("🧪 Testing user query without .single()...");
                const { data: userProfiles, error: userError } = await supabase
                  .from("profiles")
                  .select("onboarding_complete")
                  .eq("user_id", session.user.id);
                console.log("🧪 User query result:", {
                  userProfiles,
                  userError,
                  count: userProfiles?.length,
                });

                const { data: profile, error } = await supabase
                  .from("profiles")
                  .select("onboarding_complete")
                  .eq("user_id", session.user.id)
                  .single();
                console.log("📊 Profiles query result:", { profile, error });

                if (error) {
                  console.log("❌ Profiles query error:", error);
                  logger.error("Database error checking profile:", error);
                  dispatch({
                    type: "ONBOARDING_STATUS",
                    needsOnboarding: true,
                  });
                } else {
                  console.log(
                    "✅ Profiles query success, onboarding_complete:",
                    profile?.onboarding_complete
                  );
                  dispatch({
                    type: "ONBOARDING_STATUS",
                    needsOnboarding: !profile?.onboarding_complete,
                  });
                }
              } catch (error) {
                logger.error("Profile check failed:", error);
                dispatch({
                  type: "ONBOARDING_STATUS",
                  needsOnboarding: true,
                });
              }
            } else {
              dispatch({ type: "SIGNED_OUT" });
            }
            break;

          case "TOKEN_REFRESHED":
            if (session?.user) {
              dispatch({ type: "SESSION_UPDATED", session });
            } else {
              dispatch({ type: "SIGNED_OUT" });
            }
            break;

          case "INITIAL_SESSION":
            // Handle initial session restoration
            if (session?.user) {
              dispatch({ type: "SESSION_RESTORED", session });

              // Check onboarding for initial session
              try {
                const { data: profile, error } = await supabase
                  .from("profiles")
                  .select("onboarding_complete")
                  .eq("user_id", session.user.id)
                  .single();

                if (error) {
                  if (error.code === "PGRST116") {
                    // No profile found - create one
                    logger.info(
                      "No profile found during init, creating new profile"
                    );

                    const { error: insertError } = await supabase
                      .from("profiles")
                      .insert({
                        user_id: session.user.id,
                        onboarding_complete: false,
                      });

                    if (insertError) {
                      logger.error(
                        "Failed to create profile during init:",
                        insertError
                      );
                    }

                    dispatch({
                      type: "ONBOARDING_STATUS",
                      needsOnboarding: true,
                    });
                  } else {
                    logger.error("Database error during init:", error);
                    dispatch({
                      type: "ONBOARDING_STATUS",
                      needsOnboarding: true,
                    });
                  }
                } else {
                  dispatch({
                    type: "ONBOARDING_STATUS",
                    needsOnboarding: !profile?.onboarding_complete,
                  });
                }
              } catch (error) {
                logger.error("Initial session profile check failed:", error);
                dispatch({
                  type: "ONBOARDING_STATUS",
                  needsOnboarding: true,
                });
              }
            } else {
              dispatch({ type: "SESSION_RESTORED", session: null });
            }
            break;

          default:
            // For any unhandled events
            logger.info("Unhandled auth event, checking current session:", {
              event,
            });

            try {
              const { data: currentSession } = await supabase.auth.getSession();
              dispatch({
                type: "SESSION_RESTORED",
                session: currentSession.session,
              });
            } catch (error) {
              logger.error("Failed to get current session:", error);
              dispatch({ type: "SESSION_RESTORED", session: null });
            }
            break;
        }
      } catch (error) {
        logger.error("Auth state change handler error:", error);
        // On any error, ensure we're not stuck in loading
        dispatch({ type: "SESSION_RESTORED", session: null });
      } finally {
        // Always clear timeout and stop loading
        clearTimeout(timeoutId);
        dispatch({ type: "LOADING", loading: false });
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
