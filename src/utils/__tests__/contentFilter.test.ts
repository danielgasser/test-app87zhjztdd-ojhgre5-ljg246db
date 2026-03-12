jest.unmock('@2toad/profanity');
import { supabase } from '@/services/supabase';
import { notify } from '../../__mocks__/utils/notificationService';
import { isProfane, assertClean, loadBlockedWords, resetBlockedWordsCache } from '../contentFilter';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Add these mocks at the top (after existing jest.unmock)

jest.mock('@/services/supabase', () => ({
    supabase: { from: jest.fn() },
}));
const mockNotifyError = notify.error as jest.Mock;
const mockedStorage = jest.mocked(AsyncStorage);
const mockFrom = supabase.from as jest.Mock;
// ─── Storage keys (mirrored from source) ─────────────────────────────────────
const BLOCKED_WORDS_LIST_KEY = '@safepath_cache:blocked_words:list';
const BLOCKED_WORDS_MODIFIED_KEY = '@safepath_cache:blocked_words:last_modified';

describe('isProfane', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetBlockedWordsCache();
    });
    it('returns false for clean text', () => {
        expect(isProfane('This place was great!')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isProfane('')).toBe(false);
    });

    it('returns false for null', () => {
        expect(isProfane(null as any)).toBe(false);
    });

    it('returns false for undefined', () => {
        expect(isProfane(undefined as any)).toBe(false);
    });

    it('returns true for a profane word', () => {
        expect(isProfane('This is bullshit')).toBe(true);
    });

    it('is case-insensitive', () => {
        expect(isProfane('BULLSHIT')).toBe(true);
    });
});

describe('assertClean', () => {
    it('does not throw for clean text', () => {
        expect(() => assertClean('Nice location')).not.toThrow();
    });

    it('throws for profane text', () => {
        expect(() => assertClean('This is bullshit')).toThrow();
    });

    it('thrown error message contains a user-friendly message', () => {
        expect(() => assertClean('This is bullshit')).toThrow(
            'Your text contains inappropriate language. Please revise before submitting.'
        );
    });

    it('does not throw for empty string', () => {
        expect(() => assertClean('')).not.toThrow();
    });
});

describe("contentFilter integration — filtering logic", () => {
    it("clean text is not profane", () => {
        expect(isProfane("Nice place")).toBe(false);
    });

    it("profane text is detected", () => {
        expect(isProfane("This is bullshit")).toBe(true);
    });

    it("notify.error is a jest mock (auto-mock wired correctly)", () => {
        notify.error("test");
        expect(mockNotifyError).toHaveBeenCalledWith("test");
    });
});

describe('loadBlockedWords', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('loads words from AsyncStorage when DB has not changed', async () => {
        const storedWords = ['badword', 'slur'];
        const lastModified = '2026-01-01T00:00:00Z';

        mockedStorage.getItem
            .mockResolvedValueOnce(lastModified)                        // last_modified
            .mockResolvedValueOnce(JSON.stringify(storedWords));        // list

        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: { created_at: lastModified }, error: null,
                        }),
                    }),
                }),
            }),
        });
        await loadBlockedWords();

        expect(isProfane('badword')).toBe(true);
        expect(isProfane('hello')).toBe(false);
    });

    it('fetches from DB and updates cache when DB has changed', async () => {
        const oldModified = '2026-01-01T00:00:00Z';
        const newModified = '2026-02-01T00:00:00Z';

        mockedStorage.getItem
            .mockResolvedValueOnce(oldModified)                         // last_modified
            .mockResolvedValueOnce(JSON.stringify(['oldword']));        // list (ignored)

        mockFrom
            .mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: { created_at: newModified }, error: null,
                            }),
                        }),
                    }),
                }),
            })
            .mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                        data: [{ word: 'newword' }], error: null,
                    }),
                }),
            });
        await loadBlockedWords();

        expect(isProfane('newword')).toBe(true);
        expect(mockedStorage.setItem).toHaveBeenCalledWith(
            BLOCKED_WORDS_LIST_KEY,
            JSON.stringify(['newword'])
        );
        expect(mockedStorage.setItem).toHaveBeenCalledWith(
            BLOCKED_WORDS_MODIFIED_KEY,
            newModified
        );
    });

    it('fetches from DB when no cache exists', async () => {
        mockedStorage.getItem.mockResolvedValue(null);

        mockFrom
            .mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: { created_at: '2026-01-01T00:00:00Z' }, error: null,
                            }),
                        }),
                    }),
                }),
            })
            .mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                        data: [{ word: 'freshword' }], error: null,
                    }),
                }),
            });
        await loadBlockedWords();

        expect(isProfane('freshword')).toBe(true);
    });

    it('falls back to cached words when DB check fails', async () => {
        mockedStorage.getItem
            .mockResolvedValueOnce('2026-01-01T00:00:00Z')
            .mockResolvedValueOnce(JSON.stringify(['fallbackword']));

        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: null, error: { message: 'DB error' },
                        }),
                    }),
                }),
            }),
        });
        await loadBlockedWords();

        expect(isProfane('fallbackword')).toBe(true);
    });

    it('does not throw when both DB and cache are unavailable', async () => {
        mockedStorage.getItem.mockResolvedValue(null);
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: null, error: { message: 'DB error' },
                        }),
                    }),
                }),
            }),
        });
        await expect(loadBlockedWords()).resolves.toBeUndefined();
    });
});