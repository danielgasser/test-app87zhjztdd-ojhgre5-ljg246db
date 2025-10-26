/**
 * Location Cache Service
 * 
 * Caches geocoding and place details to reduce API costs
 * - Reverse geocoding: 30 day TTL
 * - Place details: 7 day TTL
 * - Auto-cleanup of expired entries
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';
import { GeocodingResult, PlaceDetails } from './googlePlaces';

// Cache keys
const CACHE_PREFIX = '@safepath_cache:';
const GEOCODE_KEY = `${CACHE_PREFIX}geocode:`;
const PLACE_DETAILS_KEY = `${CACHE_PREFIX}place_details:`;
const CACHE_STATS_KEY = `${CACHE_PREFIX}stats`;

// TTL configurations (in milliseconds)
const TTL = {
    GEOCODING: 30 * 24 * 60 * 60 * 1000, // 30 days
    PLACE_DETAILS: 7 * 24 * 60 * 60 * 1000, // 7 days
};

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

interface CacheStats {
    hits: number;
    misses: number;
    cost_saved: number; // Estimated cost saved in USD
}

// ================================
// CACHE UTILITIES
// ================================

/**
 * Generate cache key for geocoding (coordinates -> address)
 */
function getGeocodeKey(lat: number, lng: number): string {
    // Round to 4 decimal places (~11m precision) to increase cache hits
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    return `${GEOCODE_KEY}${roundedLat},${roundedLng}`;
}

/**
 * Generate cache key for place details
 */
function getPlaceDetailsKey(placeId: string): string {
    return `${PLACE_DETAILS_KEY}${placeId}`;
}

/**
 * Check if cache entry is expired
 */
function isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
}

/**
 * Set item in cache with TTL
 */
async function setCacheItem<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
        };
        await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
        logger.error('Cache set error:', error);
    }
}

/**
 * Get item from cache if not expired
 */
async function getCacheItem<T>(key: string): Promise<T | null> {
    try {
        const item = await AsyncStorage.getItem(key);
        if (!item) return null;

        const entry: CacheEntry<T> = JSON.parse(item);

        if (isExpired(entry)) {
            // Remove expired entry
            await AsyncStorage.removeItem(key);
            return null;
        }

        return entry.data;
    } catch (error) {
        logger.error('Cache get error:', error);
        return null;
    }
}

// ================================
// CACHE STATISTICS
// ================================

async function getCacheStats(): Promise<CacheStats> {
    try {
        const stats = await AsyncStorage.getItem(CACHE_STATS_KEY);
        if (!stats) {
            return { hits: 0, misses: 0, cost_saved: 0 };
        }
        return JSON.parse(stats);
    } catch (error) {
        logger.error('Error getting cache stats:', error);
        return { hits: 0, misses: 0, cost_saved: 0 };
    }
}

async function updateCacheStats(hit: boolean, apiCost: number): Promise<void> {
    try {
        const stats = await getCacheStats();

        if (hit) {
            stats.hits += 1;
            stats.cost_saved += apiCost;
        } else {
            stats.misses += 1;
        }

        await AsyncStorage.setItem(CACHE_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
        logger.error('Error updating cache stats:', error);
    }
}

// ================================
// GEOCODING CACHE
// ================================

/**
 * Get cached geocoding result
 */
export async function getCachedGeocode(
    lat: number,
    lng: number
): Promise<GeocodingResult[] | null> {
    const key = getGeocodeKey(lat, lng);
    const cached = await getCacheItem<GeocodingResult[]>(key);

    const hit = cached !== null;
    await updateCacheStats(hit, 0.005); // $5 per 1000 = $0.005 per call

    if (hit) {
        logger.info(`📦 Cache HIT: Geocoding (${lat}, ${lng})`);
    }

    return cached;
}

/**
 * Cache geocoding result
 */
export async function cacheGeocode(
    lat: number,
    lng: number,
    results: GeocodingResult[]
): Promise<void> {
    const key = getGeocodeKey(lat, lng);
    await setCacheItem(key, results, TTL.GEOCODING);
    logger.info(`💾 Cached: Geocoding (${lat}, ${lng})`);
}

// ================================
// PLACE DETAILS CACHE
// ================================

/**
 * Get cached place details
 */
export async function getCachedPlaceDetails(
    placeId: string
): Promise<PlaceDetails | null> {
    const key = getPlaceDetailsKey(placeId);
    const cached = await getCacheItem<PlaceDetails>(key);

    const hit = cached !== null;
    await updateCacheStats(hit, 0.005); // $5 per 1000 = $0.005 per call

    if (hit) {
        logger.info(`📦 Cache HIT: Place Details (${placeId})`);
    }

    return cached;
}

/**
 * Cache place details
 */
export async function cachePlaceDetails(
    placeId: string,
    details: PlaceDetails
): Promise<void> {
    const key = getPlaceDetailsKey(placeId);
    await setCacheItem(key, details, TTL.PLACE_DETAILS);
    logger.info(`💾 Cached: Place Details (${placeId})`);
}

// ================================
// CACHE MANAGEMENT
// ================================

/**
 * Clear all location cache
 */
export async function clearLocationCache(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
        await AsyncStorage.multiRemove(cacheKeys);
        logger.info(`🗑️  Cleared ${cacheKeys.length} cache entries`);
    } catch (error) {
        logger.error('Error clearing cache:', error);
    }
}

/**
 * Get cache statistics
 */
export async function getLocationCacheStats(): Promise<{
    stats: CacheStats;
    hitRate: number;
    monthlySavings: number;
}> {
    const stats = await getCacheStats();
    const total = stats.hits + stats.misses;
    const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;

    // Estimate monthly savings based on current rate
    // Assuming similar usage continues
    const monthlySavings = stats.cost_saved * (30 / Math.max(1, total / 100));

    return {
        stats,
        hitRate: Math.round(hitRate * 10) / 10,
        monthlySavings: Math.round(monthlySavings * 100) / 100,
    };
}

/**
 * Clean expired cache entries
 * Should be called periodically (e.g., on app start)
 */
export async function cleanExpiredCache(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key =>
            key.startsWith(GEOCODE_KEY) ||
            key.startsWith(PLACE_DETAILS_KEY)
        );

        let removedCount = 0;

        for (const key of cacheKeys) {
            const item = await AsyncStorage.getItem(key);
            if (item) {
                const entry: CacheEntry<any> = JSON.parse(item);
                if (isExpired(entry)) {
                    await AsyncStorage.removeItem(key);
                    removedCount++;
                }
            }
        }

        if (removedCount > 0) {
            logger.info(`🗑️  Cleaned ${removedCount} expired cache entries`);
        }
    } catch (error) {
        logger.error('Error cleaning expired cache:', error);
    }
}

// ================================
// EXPORTS
// ================================

export const locationCache = {
    // Geocoding
    getCachedGeocode,
    cacheGeocode,

    // Place Details
    getCachedPlaceDetails,
    cachePlaceDetails,

    // Management
    clearCache: clearLocationCache,
    getStats: getLocationCacheStats,
    cleanExpired: cleanExpiredCache,
};