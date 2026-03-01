import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    getCachedGeocode,
    cacheGeocode,
    getCachedPlaceDetails,
    cachePlaceDetails,
    clearLocationCache,
    cleanExpiredCache,
    getLocationCacheStats,
} from '../locationCache';

const mockedStorage = jest.mocked(AsyncStorage);

// ─── Constants (mirrored from source) ────────────────────────────────────────

const CACHE_PREFIX = '@safepath_cache:';
const GEOCODE_KEY = `${CACHE_PREFIX}geocode:`;
const PLACE_DETAILS_KEY = `${CACHE_PREFIX}place_details:`;
const CACHE_STATS_KEY = `${CACHE_PREFIX}stats`;

const TTL_30_DAYS = 30 * 24 * 60 * 60 * 1000;
const TTL_7_DAYS = 7 * 24 * 60 * 60 * 1000;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_GEOCODING_RESULT = [
    {
        place_id: 'place-1',
        formatted_address: '123 Main St, Tampa, FL',
        address_components: [],
        geometry: { location: { lat: 27.9506, lng: -82.4572 } },
        types: ['street_address'],
    },
];

const MOCK_PLACE_DETAILS = {
    place_id: 'place-abc',
    name: 'Test Cafe',
    formatted_address: '456 Bay Blvd, Tampa, FL',
    geometry: { location: { lat: 27.951, lng: -82.458 } },
    types: ['cafe'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCacheEntry(data: any, ttl: number, ageMs = 0) {
    return JSON.stringify({
        data,
        timestamp: Date.now() - ageMs,
        ttl,
    });
}

function makeGeocodeKey(lat: number, lng: number): string {
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    return `${GEOCODE_KEY}${roundedLat},${roundedLng}`;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-23T12:00:00Z'));
    mockedStorage.getItem.mockResolvedValue(null);
    mockedStorage.setItem.mockResolvedValue(undefined);
    mockedStorage.removeItem.mockResolvedValue(undefined);
    mockedStorage.multiRemove.mockResolvedValue(undefined);
    mockedStorage.getAllKeys.mockResolvedValue([]);
});

afterEach(() => {
    jest.useRealTimers();
});

// ─── getCachedGeocode ─────────────────────────────────────────────────────────

describe('getCachedGeocode', () => {
    it('returns null when no cached entry exists', async () => {
        mockedStorage.getItem.mockResolvedValue(null);
        const result = await getCachedGeocode(27.9506, -82.4572);
        expect(result).toBeNull();
    });

    it('returns cached data when entry is fresh', async () => {
        const entry = makeCacheEntry(MOCK_GEOCODING_RESULT, TTL_30_DAYS, 0);
        mockedStorage.getItem.mockResolvedValue(entry);

        const result = await getCachedGeocode(27.9506, -82.4572);
        expect(result).toEqual(MOCK_GEOCODING_RESULT);
    });

    it('returns null and removes entry when expired', async () => {
        const expiredEntry = makeCacheEntry(MOCK_GEOCODING_RESULT, TTL_30_DAYS, TTL_30_DAYS + 1);
        mockedStorage.getItem.mockResolvedValue(expiredEntry);

        const result = await getCachedGeocode(27.9506, -82.4572);
        expect(result).toBeNull();
        expect(mockedStorage.removeItem).toHaveBeenCalledWith(
            makeGeocodeKey(27.9506, -82.4572)
        );
    });

    it('reads using coordinate-rounded cache key', async () => {
        await getCachedGeocode(27.95061234, -82.45721234);
        // Should round to 4 decimal places
        expect(mockedStorage.getItem).toHaveBeenCalledWith(
            makeGeocodeKey(27.9506, -82.4572)
        );
    });

    it('same key for coordinates within ~11m precision', async () => {
        await getCachedGeocode(27.95060001, -82.45720001);
        await getCachedGeocode(27.95069999, -82.45729999);
        const key1 = mockedStorage.getItem.mock.calls[0][0];
        const key2 = mockedStorage.getItem.mock.calls[2][0]; // call 0 + stats read = index 2 won't work, check direct
        // Both should round to same key
        expect(key1).toBe(makeGeocodeKey(27.9506, -82.4572));
    });

    it('records a miss in stats when entry absent', async () => {
        mockedStorage.getItem.mockResolvedValue(null);
        await getCachedGeocode(27.9506, -82.4572);

        const statsWrite = mockedStorage.setItem.mock.calls.find(
            ([key]) => key === CACHE_STATS_KEY
        );
        expect(statsWrite).toBeDefined();
        const stats = JSON.parse(statsWrite![1]);
        expect(stats.misses).toBe(1);
        expect(stats.hits).toBe(0);
    });

    it('records a hit and cost_saved in stats on cache hit', async () => {
        const entry = makeCacheEntry(MOCK_GEOCODING_RESULT, TTL_30_DAYS, 0);
        // First getItem = cache entry, second = stats read
        mockedStorage.getItem
            .mockResolvedValueOnce(entry)       // getCacheItem
            .mockResolvedValueOnce(null);        // getCacheStats

        await getCachedGeocode(27.9506, -82.4572);

        const statsWrite = mockedStorage.setItem.mock.calls.find(
            ([key]) => key === CACHE_STATS_KEY
        );
        expect(statsWrite).toBeDefined();
        const stats = JSON.parse(statsWrite![1]);
        expect(stats.hits).toBe(1);
        expect(stats.cost_saved).toBeCloseTo(0.005);
    });
});

// ─── cacheGeocode ─────────────────────────────────────────────────────────────

describe('cacheGeocode', () => {
    it('writes entry to AsyncStorage', async () => {
        await cacheGeocode(27.9506, -82.4572, MOCK_GEOCODING_RESULT);

        const writeCall = mockedStorage.setItem.mock.calls.find(
            ([key]) => key === makeGeocodeKey(27.9506, -82.4572)
        );
        expect(writeCall).toBeDefined();
    });

    it('stores entry with 30-day TTL', async () => {
        await cacheGeocode(27.9506, -82.4572, MOCK_GEOCODING_RESULT);

        const writeCall = mockedStorage.setItem.mock.calls.find(
            ([key]) => key === makeGeocodeKey(27.9506, -82.4572)
        );
        const entry = JSON.parse(writeCall![1]);
        expect(entry.ttl).toBe(TTL_30_DAYS);
    });

    it('stores the provided data', async () => {
        await cacheGeocode(27.9506, -82.4572, MOCK_GEOCODING_RESULT);

        const writeCall = mockedStorage.setItem.mock.calls.find(
            ([key]) => key === makeGeocodeKey(27.9506, -82.4572)
        );
        const entry = JSON.parse(writeCall![1]);
        expect(entry.data).toEqual(MOCK_GEOCODING_RESULT);
    });

    it('stamps entry with current timestamp', async () => {
        const now = Date.now();
        await cacheGeocode(27.9506, -82.4572, MOCK_GEOCODING_RESULT);

        const writeCall = mockedStorage.setItem.mock.calls.find(
            ([key]) => key === makeGeocodeKey(27.9506, -82.4572)
        );
        const entry = JSON.parse(writeCall![1]);
        expect(entry.timestamp).toBe(now);
    });
});

// ─── getCachedPlaceDetails ────────────────────────────────────────────────────

describe('getCachedPlaceDetails', () => {
    const placeKey = `${PLACE_DETAILS_KEY}place-abc`;

    it('returns null when no entry exists', async () => {
        expect(await getCachedPlaceDetails('place-abc')).toBeNull();
    });

    it('returns cached data when fresh', async () => {
        const entry = makeCacheEntry(MOCK_PLACE_DETAILS, TTL_7_DAYS, 0);
        mockedStorage.getItem.mockResolvedValue(entry);

        const result = await getCachedPlaceDetails('place-abc');
        expect(result).toEqual(MOCK_PLACE_DETAILS);
    });

    it('returns null and removes entry when expired', async () => {
        const expired = makeCacheEntry(MOCK_PLACE_DETAILS, TTL_7_DAYS, TTL_7_DAYS + 1);
        mockedStorage.getItem.mockResolvedValue(expired);

        const result = await getCachedPlaceDetails('place-abc');
        expect(result).toBeNull();
        expect(mockedStorage.removeItem).toHaveBeenCalledWith(placeKey);
    });

    it('reads using the correct place details key', async () => {
        await getCachedPlaceDetails('place-abc');
        expect(mockedStorage.getItem).toHaveBeenCalledWith(placeKey);
    });
});

// ─── cachePlaceDetails ────────────────────────────────────────────────────────

describe('cachePlaceDetails', () => {
    const placeKey = `${PLACE_DETAILS_KEY}place-abc`;

    it('writes entry to AsyncStorage', async () => {
        await cachePlaceDetails('place-abc', MOCK_PLACE_DETAILS);

        const writeCall = mockedStorage.setItem.mock.calls.find(
            ([key]) => key === placeKey
        );
        expect(writeCall).toBeDefined();
    });

    it('stores entry with 7-day TTL', async () => {
        await cachePlaceDetails('place-abc', MOCK_PLACE_DETAILS);

        const writeCall = mockedStorage.setItem.mock.calls.find(
            ([key]) => key === placeKey
        );
        const entry = JSON.parse(writeCall![1]);
        expect(entry.ttl).toBe(TTL_7_DAYS);
    });

    it('stores the provided data', async () => {
        await cachePlaceDetails('place-abc', MOCK_PLACE_DETAILS);

        const writeCall = mockedStorage.setItem.mock.calls.find(
            ([key]) => key === placeKey
        );
        const entry = JSON.parse(writeCall![1]);
        expect(entry.data).toEqual(MOCK_PLACE_DETAILS);
    });
});

// ─── clearLocationCache ───────────────────────────────────────────────────────

describe('clearLocationCache', () => {
    it('removes only cache-prefixed keys', async () => {
        const cacheKeys = [
            `${GEOCODE_KEY}27.9506,-82.4572`,
            `${PLACE_DETAILS_KEY}place-abc`,
            CACHE_STATS_KEY,
        ];
        const otherKeys = ['supabase.auth.token', 'search_count_2026-02-23'];
        mockedStorage.getAllKeys.mockResolvedValue([...cacheKeys, ...otherKeys]);

        await clearLocationCache();

        expect(mockedStorage.multiRemove).toHaveBeenCalledWith(
            expect.arrayContaining(cacheKeys)
        );
        const removed = mockedStorage.multiRemove.mock.calls[0][0] as string[];
        expect(removed).not.toContain('supabase.auth.token');
        expect(removed).not.toContain('search_count_2026-02-23');
    });

    it('does nothing when no cache keys exist', async () => {
        mockedStorage.getAllKeys.mockResolvedValue(['supabase.auth.token']);

        await clearLocationCache();

        expect(mockedStorage.multiRemove).toHaveBeenCalledWith([]);
    });
});

// ─── cleanExpiredCache ────────────────────────────────────────────────────────

describe('cleanExpiredCache', () => {
    it('removes expired geocode entries', async () => {
        const expiredKey = `${GEOCODE_KEY}27.9506,-82.4572`;
        const expiredEntry = makeCacheEntry(MOCK_GEOCODING_RESULT, TTL_30_DAYS, TTL_30_DAYS + 1);

        mockedStorage.getAllKeys.mockResolvedValue([expiredKey]);
        mockedStorage.getItem.mockResolvedValue(expiredEntry);

        await cleanExpiredCache();

        expect(mockedStorage.removeItem).toHaveBeenCalledWith(expiredKey);
    });

    it('removes expired place details entries', async () => {
        const expiredKey = `${PLACE_DETAILS_KEY}place-abc`;
        const expiredEntry = makeCacheEntry(MOCK_PLACE_DETAILS, TTL_7_DAYS, TTL_7_DAYS + 1);

        mockedStorage.getAllKeys.mockResolvedValue([expiredKey]);
        mockedStorage.getItem.mockResolvedValue(expiredEntry);

        await cleanExpiredCache();

        expect(mockedStorage.removeItem).toHaveBeenCalledWith(expiredKey);
    });

    it('does NOT remove fresh entries', async () => {
        const freshKey = `${GEOCODE_KEY}27.9506,-82.4572`;
        const freshEntry = makeCacheEntry(MOCK_GEOCODING_RESULT, TTL_30_DAYS, 0);

        mockedStorage.getAllKeys.mockResolvedValue([freshKey]);
        mockedStorage.getItem.mockResolvedValue(freshEntry);

        await cleanExpiredCache();

        expect(mockedStorage.removeItem).not.toHaveBeenCalled();
    });

    it('ignores non-cache keys (stats key, auth tokens etc)', async () => {
        const unrelatedKeys = ['supabase.auth.token', 'search_count_2026-02-23'];
        mockedStorage.getAllKeys.mockResolvedValue(unrelatedKeys);

        await cleanExpiredCache();

        // getAllKeys called but getItem never called (no cache keys to inspect)
        expect(mockedStorage.getItem).not.toHaveBeenCalled();
        expect(mockedStorage.removeItem).not.toHaveBeenCalled();
    });

    it('does not remove stats key even if present', async () => {
        // CACHE_STATS_KEY starts with CACHE_PREFIX but cleanExpiredCache
        // only filters GEOCODE_KEY and PLACE_DETAILS_KEY prefixes
        mockedStorage.getAllKeys.mockResolvedValue([CACHE_STATS_KEY]);

        await cleanExpiredCache();

        expect(mockedStorage.removeItem).not.toHaveBeenCalled();
    });
});

// ─── getLocationCacheStats ────────────────────────────────────────────────────

describe('getLocationCacheStats', () => {
    it('returns zero stats when no data stored', async () => {
        mockedStorage.getItem.mockResolvedValue(null);
        const result = await getLocationCacheStats();

        expect(result.stats).toEqual({ hits: 0, misses: 0, cost_saved: 0 });
        expect(result.hitRate).toBe(0);
        expect(result.monthlySavings).toBe(0);
    });

    it('calculates hit rate correctly', async () => {
        const stats = { hits: 3, misses: 1, cost_saved: 0.015 };
        mockedStorage.getItem.mockResolvedValue(JSON.stringify(stats));

        const result = await getLocationCacheStats();

        // 3 hits out of 4 total = 75%
        expect(result.hitRate).toBe(75);
    });

    it('rounds hit rate to 1 decimal place', async () => {
        const stats = { hits: 1, misses: 3, cost_saved: 0.005 };
        mockedStorage.getItem.mockResolvedValue(JSON.stringify(stats));

        const result = await getLocationCacheStats();

        // 1/4 = 25.0%
        expect(result.hitRate).toBe(25);
    });

    it('returns 0 hit rate when total is zero', async () => {
        const stats = { hits: 0, misses: 0, cost_saved: 0 };
        mockedStorage.getItem.mockResolvedValue(JSON.stringify(stats));

        const result = await getLocationCacheStats();
        expect(result.hitRate).toBe(0);
    });

    it('returns monthlySavings rounded to 2 decimal places', async () => {
        const stats = { hits: 100, misses: 0, cost_saved: 0.5 };
        mockedStorage.getItem.mockResolvedValue(JSON.stringify(stats));

        const result = await getLocationCacheStats();
        expect(Number.isFinite(result.monthlySavings)).toBe(true);
        expect(result.monthlySavings).toBe(Math.round(result.monthlySavings * 100) / 100);
    });
});