import { useAppSelector } from '@/store/hooks';
import {
    FEATURES,
    FeatureName,
    hasFeatureAccess,
    SubscriptionTier,
} from '@/config/features';
import { Json } from '@/types/database.types';
import { APP_CONFIG } from '@/config/appConfig';

interface FeatureAccessResult {
    hasAccess: boolean;
    userTier: SubscriptionTier;
    requiredTier: SubscriptionTier;
    featureLabel: string;
    isInLockPeriod: boolean;
    lockExpiresAt: string | null;
}

export function useFeatureAccess(feature: FeatureName): FeatureAccessResult {
    const userTier = useAppSelector(
        (state) => (state.user.profile?.subscription_tier || 'free') as SubscriptionTier
    );

    const profileTrialRecord = useAppSelector(
        (state) => state.user.profile?.trial_expires_at as Json | null
    );

    const trialRecord = profileTrialRecord as Record<string, { expiresAt: string; grantedAt: string }> | null;
    const trialFeatureEntry = trialRecord?.[feature] ?? null;

    const now = new Date();
    const expiresAt = trialFeatureEntry ? new Date(trialFeatureEntry.expiresAt) : null;
    const lockUntil = expiresAt
        ? new Date(expiresAt.getTime() + APP_CONFIG.PREMIUM.AD_REWARD_LOCK_HOURS * 60 * 60 * 1000)
        : null;

    const hasTrialAccess = !!expiresAt && expiresAt > now;
    const isInLockPeriod = !!expiresAt && expiresAt <= now && lockUntil! > now;
    const lockExpiresAt = lockUntil ? lockUntil.toISOString() : null;

    return {
        hasAccess: hasFeatureAccess(userTier, feature) || hasTrialAccess,
        userTier,
        requiredTier: FEATURES[feature].minTier as SubscriptionTier,
        featureLabel: FEATURES[feature].label,
        isInLockPeriod,
        lockExpiresAt,
    };
}

export function useSubscriptionTier(): SubscriptionTier {
    return useAppSelector(
        (state) => (state.user.profile?.subscription_tier || 'free') as SubscriptionTier
    );
}