import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { Provider } from "react-redux";
import { store } from "../src/store";
import { supabase } from "../src/services/supabase";
import { useAppDispatch, useAppSelector } from "../src/store/hooks";
import { setSession, checkSession } from "../src/store/authSlice";
import { View, ActivityIndicator } from "react-native";
import { fetchUserProfile } from "../src/store/userSlice";

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.auth);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    dispatch(checkSession()).finally(() => {
      setIsReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setSession(session));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";

    if (isReady && !loading) {
      if (!user && !inAuthGroup) {
        router.replace("/login");
      } else if (user && inAuthGroup) {
        router.replace("/");
      }
    }
  }, [user, segments, loading, isReady]);

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";

    if (isReady && !loading) {
      if (!user && !inAuthGroup) {
        router.replace("/login");
      } else if (user && inAuthGroup) {
        router.replace("/");
      } else if (user) {
        // Fetch user profile when user is authenticated
        dispatch(fetchUserProfile(user.id));
      }
    }
  }, [user, segments, loading, isReady, dispatch]);

  if (!isReady || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}
