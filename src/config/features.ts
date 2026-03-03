export const SUBSCRIPTION_TIERS = {
    free: 0,
    premium: 1,
    enterprise: 2,
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export const FEATURES = {
    // Navigation
    routePlanning: { minTier: 'premium', label: 'Route Planning' },
    routeHistory: { minTier: 'premium', label: 'Route History' },
    unlimitedSearches: { minTier: 'premium', label: 'Unlimited Searches' },
    saveLocations: { minTier: 'premium', label: 'Save Locations' },
    searchHistory: { minTier: 'premium', label: 'Search History' },
    recentlyViewed: { minTier: 'premium', label: 'Recently Viewed' },
    offlineRoutes: { minTier: 'premium', label: 'Offline Routes' },

    // Safety Insights
    statisticalInsights: { minTier: 'premium', label: 'Safety Insights' },
    routeSafetyBreakdown: { minTier: 'premium', label: 'Route Safety Breakdown' },
    neighborhoodStats: { minTier: 'premium', label: 'Neighborhood Statistics' },
    proactiveWarnings: { minTier: 'premium', label: 'Detailed Route Warnings' },
    locationTriggers: { minTier: 'premium', label: 'Proactive Safety Alerts' },

    // Filters
    advancedFilters: { minTier: 'premium', label: 'Advanced Filters' },
    demographicFilter: { minTier: 'premium', label: 'Filter by Demographic' },
    timeFilter: { minTier: 'premium', label: 'Time-based Filtering' },

    // Experience
    adFree: { minTier: 'premium', label: 'Ad-Free Experience' },

    // Enterprise
    exportData: { minTier: 'enterprise', label: 'Data Export' },
    apiAccess: { minTier: 'enterprise', label: 'API Access' },
    teamManagement: { minTier: 'enterprise', label: 'Team Management' },
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

/**
 * Maps each FeatureName to the route opened when the user taps
 * a trial expiry notification for that feature.
 *
 * - route: Expo Router path
 * - section: optional query param — profile.tsx reads this to auto-expand
 *            and scroll to the relevant CollapsibleSection
 *
 * Omitted features (adFree, enterprise) are not triallable.
 */
export const FEATURE_DEEP_LINK_MAP: Partial<Record<FeatureName, {
    route: string;
    section?: string;
}>> = {
    // Community tab — filter modal lives here
    advancedFilters: { route: '/(tabs)/community' },
    demographicFilter: { route: '/(tabs)/community' },
    timeFilter: { route: '/(tabs)/community' },

    // Map tab
    routePlanning: { route: '/(tabs)' },
    unlimitedSearches: { route: '/(tabs)' },
    offlineRoutes: { route: '/(tabs)' },
    proactiveWarnings: { route: '/(tabs)' },
    locationTriggers: { route: '/(tabs)' },

    // Profile tab — section matches CollapsibleSection keys in profile.tsx
    routeHistory: { route: '/(tabs)/profile', section: 'routeHistory' },
    saveLocations: { route: '/(tabs)/profile', section: 'savedLocations' },
    searchHistory: { route: '/(tabs)/profile', section: 'settings' },
    recentlyViewed: { route: '/(tabs)/profile', section: 'recentlyViewed' },
    statisticalInsights: { route: '/(tabs)/profile', section: 'activity' },
    routeSafetyBreakdown: { route: '/(tabs)/profile', section: 'routeHistory' },
    neighborhoodStats: { route: '/(tabs)/profile', section: 'activity' },
};