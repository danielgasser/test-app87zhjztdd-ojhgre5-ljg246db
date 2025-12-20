import { Platform } from 'react-native';
import mobileAds, {
    BannerAd,
    BannerAdSize,
    TestIds,
    InterstitialAd,
    RewardedAd,
    AdEventType,
    RewardedAdEventType,
} from 'react-native-google-mobile-ads';

// ============================================================================
// AD UNIT CONFIGURATION
// ============================================================================

const AD_UNIT_IDS = {
    banner: {
        ios: 'ca-app-pub-xxxxxxxx/yyyyyyyyyy',      // Replace with your iOS banner ID
        android: 'ca-app-pub-xxxxxxxx/yyyyyyyyyy',  // Replace with your Android banner ID
    },
    interstitial: {
        ios: 'ca-app-pub-xxxxxxxx/yyyyyyyyyy',
        android: 'ca-app-pub-xxxxxxxx/yyyyyyyyyy',
    },
    rewarded: {
        ios: 'ca-app-pub-xxxxxxxx/yyyyyyyyyy',
        android: 'ca-app-pub-xxxxxxxx/yyyyyyyyyy',
    },
};

// Use test IDs in development, real IDs in production
export const getAdUnitId = (type: 'banner' | 'interstitial' | 'rewarded'): string => {
    if (__DEV__) {
        switch (type) {
            case 'banner': return TestIds.BANNER;
            case 'interstitial': return TestIds.INTERSTITIAL;
            case 'rewarded': return TestIds.REWARDED;
        }
    }
    return Platform.select({
        ios: AD_UNIT_IDS[type].ios,
        android: AD_UNIT_IDS[type].android,
    }) || TestIds.BANNER;
};

// ============================================================================
// INITIALIZATION
// ============================================================================

export const initializeAdMob = async (): Promise<void> => {
    try {
        await mobileAds().initialize();
        console.log('✅ AdMob initialized successfully');
    } catch (error) {
        console.error('❌ AdMob initialization failed:', error);
    }
};

// ============================================================================
// INTERSTITIAL ADS
// ============================================================================

let interstitialAd: InterstitialAd | null = null;
let isInterstitialLoaded = false;

export const loadInterstitialAd = (): void => {
    const adUnitId = getAdUnitId('interstitial');
    interstitialAd = InterstitialAd.createForAdRequest(adUnitId);

    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        isInterstitialLoaded = true;
        console.log('✅ Interstitial ad loaded');
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        isInterstitialLoaded = false;
        loadInterstitialAd();
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('❌ Interstitial ad error:', error);
        isInterstitialLoaded = false;
    });

    interstitialAd.load();
};

export const showInterstitialAd = (): boolean => {
    if (isInterstitialLoaded && interstitialAd) {
        interstitialAd.show();
        return true;
    }
    return false;
};

// ============================================================================
// REWARDED ADS
// ============================================================================

let rewardedAd: RewardedAd | null = null;
let isRewardedLoaded = false;

export const loadRewardedAd = (): void => {
    const adUnitId = getAdUnitId('rewarded');
    rewardedAd = RewardedAd.createForAdRequest(adUnitId);

    rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        isRewardedLoaded = true;
        console.log('✅ Rewarded ad loaded');
    });

    rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
        console.log('🎁 User earned reward:', reward);
    });

    rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        isRewardedLoaded = false;
        loadRewardedAd();
    });

    rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('❌ Rewarded ad error:', error);
        isRewardedLoaded = false;
    });

    rewardedAd.load();
};

export const showRewardedAd = (onRewarded?: () => void): boolean => {
    if (isRewardedLoaded && rewardedAd) {
        if (onRewarded) {
            rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, onRewarded);
        }
        rewardedAd.show();
        return true;
    }
    return false;
};

// ============================================================================
// FREQUENCY CAPPING
// ============================================================================

const INTERSTITIAL_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
let lastInterstitialTime = 0;

export const showInterstitialWithCooldown = (): boolean => {
    const now = Date.now();
    if (now - lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) {
        console.log('⏳ Interstitial on cooldown');
        return false;
    }

    const shown = showInterstitialAd();
    if (shown) {
        lastInterstitialTime = now;
    }
    return shown;
};

// ============================================================================
// EXPORTS FOR BANNER COMPONENT
// ============================================================================

export { BannerAd, BannerAdSize };