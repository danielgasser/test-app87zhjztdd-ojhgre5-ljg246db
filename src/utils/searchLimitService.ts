import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasFeatureAccess } from '@/config/features';
import { APP_CONFIG } from '../config/appConfig';

const SEARCH_COUNT_KEY_PREFIX = 'search_count_';

function getTodayKey(): string {
    const today = new Date().toISOString().split('T')[0];
    return `${SEARCH_COUNT_KEY_PREFIX}${today}`;
}

export async function getSearchCount(): Promise<number> {
    const key = getTodayKey();
    const count = await AsyncStorage.getItem(key);
    return parseInt(count || '0', 10);
}

export async function getRemainingSearches(): Promise<number> {
    const count = await getSearchCount();
    return Math.max(0, APP_CONFIG.ROUTE_PLANNING.DAILY_SEARCH_LIMIT - count);
}

export async function canSearch(userTier: 'free' | 'premium' | 'enterprise'): Promise<boolean> {
    // Premium users have unlimited searches
    if (hasFeatureAccess(userTier, 'unlimitedSearches')) {
        return true;
    }

    const count = await getSearchCount();
    return count < APP_CONFIG.ROUTE_PLANNING.DAILY_SEARCH_LIMIT;
}

export async function incrementSearchCount(): Promise<number> {
    const key = getTodayKey();
    const count = await getSearchCount();
    const newCount = count + 1;
    await AsyncStorage.setItem(key, newCount.toString());
    return newCount;
}

export async function cleanupOldSearchCounts(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const today = new Date().toISOString().split('T')[0];
    const todayKey = `${SEARCH_COUNT_KEY_PREFIX}${today}`;

    const oldKeys = keys.filter(
        key => key.startsWith(SEARCH_COUNT_KEY_PREFIX) && key !== todayKey
    );

    if (oldKeys.length > 0) {
        await AsyncStorage.multiRemove(oldKeys);
    }
}

export const DAILY_LIMIT = APP_CONFIG.ROUTE_PLANNING.DAILY_SEARCH_LIMIT;