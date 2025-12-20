import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Paywall } from "@/components/subscription/Paywall";
import { theme } from "@/styles/theme";
import { useAuth } from "@/providers/AuthProvider";
import { useAppDispatch } from "@/store/hooks";
import { updateUserProfile } from "@/store/userSlice";

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  const handlePurchaseComplete = async () => {
    if (user?.id) {
      // Update subscription tier in Supabase and Redux
      await dispatch(
        updateUserProfile({
          userId: user.id,
          profileData: { subscription_tier: "premium" },
        })
      );
    }
    router.back();
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Paywall
        onPurchaseComplete={handlePurchaseComplete}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
