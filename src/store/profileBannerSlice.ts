import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '@/config/appConfig';
import { logger } from '@/utils/logger';
const BANNER_STORAGE_KEY = '@safepath_banner_dismissals';

// Import banner types from config instead of defining enum
export type BannerType = keyof typeof APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES;

interface BannerDismissal {
    dismissedAt: string; // ISO timestamp
    showCount: number;
    permanentlyDismissed: boolean;
}

interface ProfileBannerState {
    dismissedBanners: {
        [key in BannerType]?: BannerDismissal;
    };
    isLoaded: boolean;
}

const initialState: ProfileBannerState = {
    dismissedBanners: {},
    isLoaded: false,
};

const profileBannerSlice = createSlice({
    name: 'profileBanner',
    initialState,
    reducers: {
        // Dismiss a banner (temporary or permanent)
        dismissBanner: (
            state,
            action: PayloadAction<{ bannerType: BannerType; permanent?: boolean }>
        ) => {
            const { bannerType, permanent = false } = action.payload;

            state.dismissedBanners[bannerType] = {
                dismissedAt: new Date().toISOString(),
                showCount: state.dismissedBanners[bannerType]?.showCount || 0,
                permanentlyDismissed: permanent,
            };
        },

        // Increment show count for a banner
        incrementShowCount: (state, action: PayloadAction<BannerType>) => {
            const bannerType = action.payload;
            const current = state.dismissedBanners[bannerType];

            state.dismissedBanners[bannerType] = {
                dismissedAt: current?.dismissedAt || new Date().toISOString(),
                showCount: (current?.showCount || 0) + 1,
                permanentlyDismissed: current?.permanentlyDismissed || false,
            };
        },

        // Reset a banner (clear dismissal)
        resetBanner: (state, action: PayloadAction<BannerType>) => {
            delete state.dismissedBanners[action.payload];
        },

        // Load dismissals from AsyncStorage
        loadDismissals: (
            state,
            action: PayloadAction<{ [key in BannerType]?: BannerDismissal }>
        ) => {
            state.dismissedBanners = action.payload;
            state.isLoaded = true;
        },
        // ToDo: remove in production (before Realease)
        resetAll: (state) => {
            state.dismissedBanners = {};
        },
    },
});

// Add this to profileBannerSlice.ts
export const BANNER_KEYS = {
    INCOMPLETE_PROFILE_GENERAL: 'INCOMPLETE_PROFILE_GENERAL' as BannerType,
    RECOMMENDATIONS_INCOMPLETE: 'RECOMMENDATIONS_INCOMPLETE' as BannerType,
    ROUTING_INCOMPLETE: 'ROUTING_INCOMPLETE' as BannerType,
    SIMILARITY_FAILED: 'SIMILARITY_FAILED' as BannerType,
};

// Save dismissals to AsyncStorage
export const saveDismissalsToStorage = async (
    dismissals: { [key in BannerType]?: BannerDismissal }
) => {
    try {
        await AsyncStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(dismissals));
    } catch (error) {
        logger.error('Failed to save banner dismissals:', error);
    }
};

export const { dismissBanner, incrementShowCount, resetBanner, loadDismissals, resetAll } =
    profileBannerSlice.actions;

export default profileBannerSlice.reducer;

// Load dismissals from AsyncStorage
export const loadDismissalsFromStorage = async () => {
    try {
        const stored = await AsyncStorage.getItem(BANNER_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        logger.error('Failed to load banner dismissals:', error);
        return {};
    }
};

// Clear all dismissals (on logout)
export const clearDismissalsFromStorage = async () => {
    try {
        await AsyncStorage.removeItem(BANNER_STORAGE_KEY);
    } catch (error) {
        logger.error('Failed to clear banner dismissals:', error);
    }
};

// Check if a banner should be shown
export const shouldShowBanner = (
    state: ProfileBannerState,
    bannerType: BannerType
): boolean => {
    const dismissal = state.dismissedBanners[bannerType];

    // If not loaded yet, don't show
    if (!state.isLoaded) return false;

    // If permanently dismissed, never show
    if (dismissal?.permanentlyDismissed) return false;

    // If reached max show count, don't show
    const maxShows = APP_CONFIG.PROFILE_COMPLETION.BANNERS.MAX_SHOWS_PER_FEATURE;
    if (dismissal && dismissal.showCount >= maxShows) return false;

    // If dismissed recently, check cooldown
    if (dismissal?.dismissedAt) {
        const cooldownHours = APP_CONFIG.PROFILE_COMPLETION.BANNERS.COOLDOWN_HOURS;
        const dismissedTime = new Date(dismissal.dismissedAt).getTime();
        const now = Date.now();
        const hoursSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60);

        if (hoursSinceDismissed < cooldownHours) return false;
    }

    // All checks passed, can show banner
    return true;
};