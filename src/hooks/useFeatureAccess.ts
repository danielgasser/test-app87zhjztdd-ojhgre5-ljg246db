import { useAppSelector } from '@/store/hooks';
import {
    FEATURES,
    FeatureName,
    hasFeatureAccess,
    SubscriptionTier,
} from '@/config/features';

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

    return {
        hasAccess: hasFeatureAccess(userTier, feature),
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