import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, AppState, AppStateStatus } from "react-native";
import { router } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hidePremiumPrompt } from "@/store/premiumPromptSlice";
import {
  useFeatureAccess,
  useSubscriptionTier,
} from "@/hooks/useFeatureAccess";
import { showRewardedAd } from "@/services/adMobService";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/providers";
import { fetchUserProfile } from "@/store/userSlice";
import { premiumStyles } from "@/styles/premiumStyles";
import { PremiumPromptContent } from "./PremiumPromptContent";
import { RewardSuccessContent } from "./RewardSuccessContent";
import { APP_CONFIG } from "@/config/appConfig";
import { scheduleTrialReminders } from "@/services/trialNotificationService";
import { FEATURES, FeatureName } from "@/config/features";
import { TrialExpiryReminderContent } from "./TrialExpiryReminderContent";

export function GlobalPremiumPromptModal() {
  const dispatch = useAppDispatch();
  const { visible, feature, description } = useAppSelector(
    (state) => state.premiumPrompt,
  );
  const profile = useAppSelector((state) => state.user.profile);
  const { featureLabel, requiredTier } = useFeatureAccess(
    feature || "saveLocations",
  );
  const userTier = useSubscriptionTier();
  const { user } = useAuth();
  const [rewardGranted, setRewardGranted] = useState<{
    expiresAt: string;
    featureLabel: string;
  } | null>(null);

  const [expiryReminder, setExpiryReminder] = useState<{
    expiresAt: string;
    featureLabel: string;
  } | null>(null);

  useEffect(() => {
    const checkExpiringTrials = () => {
      const trialRecord = profile?.trial_expires_at as Record<
        string,
        string
      > | null;
      if (!trialRecord || typeof trialRecord !== "object") return;

      const maxHours = Math.max(
        ...APP_CONFIG.PREMIUM.TRIAL_REMINDER_HOURS_BEFORE_EXPIRY,
      );
      const now = Date.now();

      // Find all trials within the reminder window, not yet expired
      const expiring = Object.entries(trialRecord)
        .filter(([_feature, expiresAt]) => {
          const expiryMs = new Date(expiresAt).getTime();
          const hoursUntilExpiry = (expiryMs - now) / (1000 * 60 * 60);
          return hoursUntilExpiry > 0 && hoursUntilExpiry <= maxHours;
        })
        .sort(([, a], [, b]) => new Date(a).getTime() - new Date(b).getTime());

      if (expiring.length === 0) return;

      const [soonestFeature, soonestExpiresAt] = expiring[0];
      const featureConfig = FEATURES[soonestFeature as FeatureName];
      if (!featureConfig) return;

      setExpiryReminder({
        expiresAt: soonestExpiresAt,
        featureLabel: featureConfig.label,
      });
    };

    checkExpiringTrials();

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          checkExpiringTrials();
        }
      },
    );

    return () => subscription.remove();
  }, [profile?.trial_expires_at]);
  const handleClose = () => dispatch(hidePremiumPrompt());

  const handleUpgrade = () => {
    dispatch(hidePremiumPrompt());
    setTimeout(() => router.push("/subscription"), 150);
  };

  const handleWatchAd = () => {
    const grantedFeatureLabel = featureLabel;

    dispatch(hidePremiumPrompt());
    setTimeout(() => {
      showRewardedAd(async () => {
        const expiresAt = new Date(
          Date.now() +
            APP_CONFIG.PREMIUM.AD_REWARD_DURATION_HOURS * 60 * 60 * 1000,
        ).toISOString();
        const currentTrial =
          (profile?.trial_expires_at as Record<string, string> | null) ?? {};
        await supabase
          .from("user_profiles")
          .update({
            trial_expires_at: { ...currentTrial, [feature!]: expiresAt },
          })
          .eq("id", user!.id);
        dispatch(fetchUserProfile(user!.id));
        await scheduleTrialReminders(feature!, expiresAt);

        setRewardGranted({ expiresAt, featureLabel: grantedFeatureLabel });
      });
    }, 150);
  };

  if (!visible && !rewardGranted && !expiryReminder) return null;

  const showWatchAd = feature === "advancedFilters" && userTier === "free";

  return (
    <View style={premiumStyles.absoluteOverlay} pointerEvents="box-none">
      <TouchableOpacity
        style={premiumStyles.overlay}
        activeOpacity={1}
        onPress={rewardGranted || expiryReminder ? undefined : handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={premiumStyles.specContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {expiryReminder ? (
            <TrialExpiryReminderContent
              expiresAt={expiryReminder.expiresAt}
              featureLabel={expiryReminder.featureLabel}
              onClose={() => setExpiryReminder(null)}
              onUpgrade={() => {
                setExpiryReminder(null);
                setTimeout(() => router.push("/subscription"), 150);
              }}
            />
          ) : rewardGranted ? (
            <RewardSuccessContent
              expiresAt={rewardGranted.expiresAt}
              featureLabel={rewardGranted.featureLabel}
              onClose={() => setRewardGranted(null)}
            />
          ) : (
            <PremiumPromptContent
              featureLabel={featureLabel}
              requiredTier={requiredTier}
              description={description}
              showWatchAd={showWatchAd}
              onClose={handleClose}
              onUpgrade={handleUpgrade}
              onWatchAd={handleWatchAd}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}
