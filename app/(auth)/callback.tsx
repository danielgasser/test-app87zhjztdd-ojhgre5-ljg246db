import { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/services/supabase";
import { theme } from "src/styles/theme";
import { Database } from "@/types/database.types";
import { useAppDispatch } from "@/store/hooks";
import { setSession } from "@/store/authSlice";

type UserProfile = Database["public"]["Tables"]["profiles"]["Row"];

export default function AuthCallback() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        dispatch(setSession(session));
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("id", session.user.id)
          .single();

        const userProfile = profile as UserProfile | null;

        if (!userProfile || !userProfile.onboarding_complete) {
          router.replace("/onboarding");
        } else {
          router.replace("/(tabs)");
        }
      } else {
        router.replace("/login");
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: theme.colors.text,
  },
});
