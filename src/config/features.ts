export const SUBSCRIPTION_TIERS = {
    free: 0,
    premium: 1,
    enterprise: 2,
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export const FEATURES = {
    routeHistory: { minTier: 'premium', label: 'Route History' },
    offlineRoutes: { minTier: 'premium', label: 'Offline Routes' },
    advancedFilters: { minTier: 'premium', label: 'Advanced Filters' },
    unlimitedRoutes: { minTier: 'premium', label: 'Unlimited Routes' },
    adFree: { minTier: 'premium', label: 'Ad-Free Experience' },
    exportData: { minTier: 'enterprise', label: 'Data Export' },
    apiAccess: { minTier: 'enterprise', label: 'API Access' },
} as const;

export type FeatureName = keyof typeof FEATURES;

export function hasFeatureAccess(
    userTier: SubscriptionTier,
    feature: FeatureName
): boolean {
    const requiredTier = FEATURES[feature].minTier;
    return SUBSCRIPTION_TIERS[userTier] >= SUBSCRIPTION_TIERS[requiredTier as SubscriptionTier];
}

export function getAvailableFeatures(userTier: SubscriptionTier): FeatureName[] {
    return (Object.keys(FEATURES) as FeatureName[]).filter(
        (feature) => hasFeatureAccess(userTier, feature)
    );
}

export function getLockedFeatures(userTier: SubscriptionTier): FeatureName[] {
    return (Object.keys(FEATURES) as FeatureName[]).filter(
        (feature) => !hasFeatureAccess(userTier, feature)
    );
}