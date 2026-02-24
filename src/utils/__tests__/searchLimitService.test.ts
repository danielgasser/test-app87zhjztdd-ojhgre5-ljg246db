import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    getSearchCount,
    getRemainingSearches,
    canSearch,
    incrementSearchCount,
    cleanupOldSearchCounts,
    DAILY_LIMIT,
} from '../searchLimitService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockedStorage = jest.mocked(AsyncStorage);

// Freeze time to a fixed date so key generation is deterministic
const FIXED_DATE = '2026-02-23';
const FIXED_NOW = new Date(`${FIXED_DATE}T14:00:00.000Z`);
const TODAY_KEY = `search_count_${FIXED_DATE}`;

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
    jest.resetAllMocks();
});

afterEach(() => {
    jest.useRealTimers();
});

// ─── DAILY_LIMIT export ───────────────────────────────────────────────────────

describe('DAILY_LIMIT', () => {
    it('is a positive number', () => {
        expect(DAILY_LIMIT).toBeGreaterThan(0);
    });

    it('is a reasonable limit (between 1 and 1000)', () => {
        expect(DAILY_LIMIT).toBeGreaterThanOrEqual(1);
        expect(DAILY_LIMIT).toBeLessThanOrEqual(1000);
    });
});

// ─── getSearchCount ───────────────────────────────────────────────────────────

describe('getSearchCount', () => {
    it('returns 0 when no count stored', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(null);
        const count = await getSearchCount();
        expect(count).toBe(0);
    });

    it('returns stored count', async () => {
        mockedStorage.getItem.mockResolvedValueOnce('5');
        const count = await getSearchCount();
        expect(count).toBe(5);
    });

    it('reads from today\'s date-specific key', async () => {
        mockedStorage.getItem.mockResolvedValueOnce('3');
        await getSearchCount();
        expect(mockedStorage.getItem).toHaveBeenCalledWith(TODAY_KEY);
    });

    it('parses count as integer', async () => {
        mockedStorage.getItem.mockResolvedValueOnce('7');
        const count = await getSearchCount();
        expect(Number.isInteger(count)).toBe(true);
    });
});

// ─── getRemainingSearches ─────────────────────────────────────────────────────

describe('getRemainingSearches', () => {
    it('returns full limit when no searches used', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(null);
        const remaining = await getRemainingSearches();
        expect(remaining).toBe(DAILY_LIMIT);
    });

    it('returns correct remaining after some searches', async () => {
        mockedStorage.getItem.mockResolvedValueOnce('3');
        const remaining = await getRemainingSearches();
        expect(remaining).toBe(DAILY_LIMIT - 3);
    });

    it('returns 0 when limit reached — never negative', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(String(DAILY_LIMIT));
        const remaining = await getRemainingSearches();
        expect(remaining).toBe(0);
    });

    it('returns 0 even if count somehow exceeds limit', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(String(DAILY_LIMIT + 5));
        const remaining = await getRemainingSearches();
        expect(remaining).toBe(0);
    });
});

// ─── canSearch ────────────────────────────────────────────────────────────────

describe('canSearch — free tier', () => {
    it('returns true when count is 0', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(null);
        expect(await canSearch('free')).toBe(true);
    });

    it('returns true when under the limit', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(String(DAILY_LIMIT - 1));
        expect(await canSearch('free')).toBe(true);
    });

    it('returns false when at the limit', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(String(DAILY_LIMIT));
        expect(await canSearch('free')).toBe(false);
    });

    it('returns false when over the limit', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(String(DAILY_LIMIT + 1));
        expect(await canSearch('free')).toBe(false);
    });
});

describe('canSearch — premium tier', () => {
    it('returns true regardless of count', async () => {
        // Should NOT even read from storage for premium users
        expect(await canSearch('premium')).toBe(true);
    });

    it('returns true even when free limit would be exceeded', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(String(DAILY_LIMIT + 99));
        expect(await canSearch('premium')).toBe(true);
    });

    it('does not read AsyncStorage for premium users', async () => {
        await canSearch('premium');
        expect(mockedStorage.getItem).not.toHaveBeenCalled();
    });
});

describe('canSearch — enterprise tier', () => {
    it('returns true regardless of count', async () => {
        expect(await canSearch('enterprise')).toBe(true);
    });

    it('does not read AsyncStorage for enterprise users', async () => {
        await canSearch('enterprise');
        expect(mockedStorage.getItem).not.toHaveBeenCalled();
    });
});

// ─── incrementSearchCount ─────────────────────────────────────────────────────

describe('incrementSearchCount', () => {
    it('increments from 0 to 1', async () => {
        mockedStorage.getItem.mockResolvedValue(null);
        mockedStorage.setItem.mockResolvedValue(undefined);
        const newCount = await incrementSearchCount();
        expect(newCount).toBe(1);
    });

    it('increments from existing count', async () => {
        mockedStorage.getItem.mockResolvedValue('4');
        mockedStorage.setItem.mockResolvedValue(undefined);
        const newCount = await incrementSearchCount();
        expect(newCount).toBe(5);
    });

    it('writes to today\'s date-specific key', async () => {
        mockedStorage.getItem.mockResolvedValue('2');
        mockedStorage.setItem.mockResolvedValue(undefined);
        await incrementSearchCount();
        expect(mockedStorage.setItem).toHaveBeenCalledWith(TODAY_KEY, '3');
    });

    it('stores count as string', async () => {
        mockedStorage.getItem.mockResolvedValue(null);
        mockedStorage.setItem.mockResolvedValue(undefined);
        await incrementSearchCount();
        const [, storedValue] = mockedStorage.setItem.mock.calls[0];
        expect(typeof storedValue).toBe('string');
    });

    it('returns the new count after increment', async () => {
        mockedStorage.getItem.mockResolvedValue('9');
        mockedStorage.setItem.mockResolvedValue(undefined);
        const result = await incrementSearchCount();
        expect(result).toBe(10);
    });
});

// ─── cleanupOldSearchCounts ───────────────────────────────────────────────────

describe('cleanupOldSearchCounts', () => {
    it('removes keys from previous days', async () => {
        const yesterdayKey = 'search_count_2026-02-22';
        const oldKey = 'search_count_2026-01-01';
        mockedStorage.getAllKeys.mockResolvedValueOnce([yesterdayKey, oldKey, TODAY_KEY]);
        mockedStorage.multiRemove.mockResolvedValueOnce(undefined);

        await cleanupOldSearchCounts();

        expect(mockedStorage.multiRemove).toHaveBeenCalledWith(
            expect.arrayContaining([yesterdayKey, oldKey])
        );
    });

    it('does NOT remove today\'s key', async () => {
        mockedStorage.getAllKeys.mockResolvedValueOnce([TODAY_KEY, 'search_count_2026-02-22']);
        mockedStorage.multiRemove.mockResolvedValueOnce(undefined);

        await cleanupOldSearchCounts();

        const removedKeys = mockedStorage.multiRemove.mock.calls[0][0];
        expect(removedKeys).not.toContain(TODAY_KEY);
    });

    it('does NOT remove unrelated AsyncStorage keys', async () => {
        const unrelated = 'supabase.auth.token';
        mockedStorage.getAllKeys.mockResolvedValueOnce([unrelated, TODAY_KEY]);
        mockedStorage.multiRemove.mockResolvedValueOnce(undefined);

        await cleanupOldSearchCounts();

        const removedKeys = mockedStorage.multiRemove.mock.calls[0]?.[0] ?? [];
        expect(removedKeys).not.toContain(unrelated);
    });

    it('skips multiRemove call when nothing to clean up', async () => {
        mockedStorage.getAllKeys.mockResolvedValueOnce([TODAY_KEY]);

        await cleanupOldSearchCounts();

        expect(mockedStorage.multiRemove).not.toHaveBeenCalled();
    });

    it('handles empty storage gracefully', async () => {
        mockedStorage.getAllKeys.mockResolvedValueOnce([]);
        await expect(cleanupOldSearchCounts()).resolves.not.toThrow();
        expect(mockedStorage.multiRemove).not.toHaveBeenCalled();
    });
});

// ─── Midnight reset behaviour ─────────────────────────────────────────────────

describe('midnight reset — date-based key isolation', () => {
    it('count from yesterday does not affect today', async () => {
        mockedStorage.getItem.mockImplementation(async (key: string) => {
            if (key === TODAY_KEY) return null;
            if (key === 'search_count_2026-02-22') return String(DAILY_LIMIT);
            return null;
        });

        const count = await getSearchCount();
        expect(count).toBe(0);
    });

    it('reads only today\'s key, not yesterday\'s', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(null);
        await getSearchCount();
        expect(mockedStorage.getItem).toHaveBeenCalledTimes(1);
        expect(mockedStorage.getItem).toHaveBeenCalledWith(TODAY_KEY);
        expect(mockedStorage.getItem).not.toHaveBeenCalledWith('search_count_2026-02-22');
    });

    it('user who maxed out yesterday can search again today', async () => {
        mockedStorage.getItem.mockResolvedValueOnce(null); // today fresh
        expect(await canSearch('free')).toBe(true);
    });
});