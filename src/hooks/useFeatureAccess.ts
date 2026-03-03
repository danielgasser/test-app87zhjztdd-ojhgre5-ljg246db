import { useAppSelector } from '@/store/hooks';
import {
    FEATURES,
    FeatureName,
    hasFeatureAccess,
    SubscriptionTier,
} from '@/config/features';
import React from 'react';
import { Json } from '@/types/database.types';

interface FeatureAccessResult {
    hasAccess: boolean;
    userTier: SubscriptionTier;
    requiredTier: SubscriptionTier;
    featureLabel: string;
}

export function useFeatureAccess(feature: FeatureName): FeatureAccessResult {
    const userTier = useAppSelector(
        (state) => (state.user.profile?.subscription_tier || 'free') as SubscriptionTier
    );

    const trialExpiresAt = useAppSelector(
        (state) => state.user.profile?.trial_expires_at as Json | null
    );

    const trialRecord = trialExpiresAt as Record<string, string> | null;
    const hasTrialAccess =
        !!trialRecord &&
        typeof trialRecord === 'object' &&
        !!trialRecord[feature] &&
        new Date(trialRecord[feature]) > new Date();

    return {
        hasAccess: hasFeatureAccess(userTier, feature) || hasTrialAccess,
        userTier,
        requiredTier: FEATURES[feature].minTier as SubscriptionTier,
        featureLabel: FEATURES[feature].label,
    };
}

export function useSubscriptionTier(): SubscriptionTier {
    return useAppSelector(
        (state) => (state.user.profile?.subscription_tier || 'free') as SubscriptionTier
    );
}