import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Paywall } from "@/components/subscription/Paywall";
import { useAuth } from "@/providers/AuthProvider";
import { useAppDispatch } from "@/store/hooks";
import { updateUserProfile } from "@/store/userSlice";
import { commonStyles } from "@/styles/common";
import { cancelAllTrialReminders } from "@/services/trialNotificationService";

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  const handlePurchaseComplete = async () => {
    // Cancel any pending trial expiry notifications
    await cancelAllTrialReminders();
    if (user?.id) {
      // Update subscription tier in Supabase and Redux
      await dispatch(
        updateUserProfile({
          userId: user.id,
          profileData: { subscription_tier: "premium" },
        }),
      );
    }
    router.back();
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <Paywall
        onPurchaseComplete={handlePurchaseComplete}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
}
