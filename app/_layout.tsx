import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from 'src/store';
import { supabase } from 'src/services/supabase';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { setSession, checkSession } from 'src/store/authSlice';
import { View, ActivityIndicator } from 'react-native';

// Main layout component
function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Check for existing session
    dispatch(checkSession());

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setSession(session));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!loading) {
      // Redirect to login if not authenticated
      if (!user && !inAuthGroup) {
        router.replace('/login');
      }
      // Redirect to main app if authenticated and in auth group
      else if (user && inAuthGroup) {
        router.replace('/');
      }
    }
  }, [user, segments, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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