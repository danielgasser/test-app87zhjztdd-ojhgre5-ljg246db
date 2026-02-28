import reducer, {
    dismissBanner,
    incrementShowCount,
    resetBanner,
    loadDismissals,
    resetAll,
    shouldShowBanner,
} from '../profileBannerSlice';
import { APP_CONFIG } from '@/config/appConfig';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SHOWS = APP_CONFIG.PROFILE_COMPLETION.BANNERS.MAX_SHOWS_PER_FEATURE;
const COOLDOWN_HOURS = APP_CONFIG.PROFILE_COMPLETION.BANNERS.COOLDOWN_HOURS;
const BANNER = 'ROUTING_INCOMPLETE' as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const loadedEmpty = () =>
    reducer(undefined, loadDismissals({}));

const hoursAgo = (hours: number): string =>
    new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const hoursFromNow = (hours: number): string =>
    new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

// ══════════════════════════════════════════════════════════════════════════════
// Initial state
// ══════════════════════════════════════════════════════════════════════════════

describe('initial state', () => {
    it('starts with empty dismissedBanners', () => {
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.dismissedBanners).toEqual({});
    });

    it('starts with isLoaded: false', () => {
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.isLoaded).toBe(false);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// dismissBanner
// ══════════════════════════════════════════════════════════════════════════════

describe('dismissBanner', () => {
    it('records a dismissal with permanentlyDismissed: false by default', () => {
        const state = reducer(loadedEmpty(), dismissBanner({ bannerType: BANNER }));
        expect(state.dismissedBanners[BANNER]?.permanentlyDismissed).toBe(false);
    });

    it('records a permanent dismissal when permanent: true', () => {
        const state = reducer(loadedEmpty(), dismissBanner({ bannerType: BANNER, permanent: true }));
        expect(state.dismissedBanners[BANNER]?.permanentlyDismissed).toBe(true);
    });

    it('sets dismissedAt to a recent ISO timestamp', () => {
        const before = Date.now();
        const state = reducer(loadedEmpty(), dismissBanner({ bannerType: BANNER }));
        const dismissedAt = new Date(state.dismissedBanners[BANNER]!.dismissedAt).getTime();
        expect(dismissedAt).toBeGreaterThanOrEqual(before);
        expect(dismissedAt).toBeLessThanOrEqual(Date.now());
    });

    it('preserves existing showCount when dismissing', () => {
        let state = reducer(loadedEmpty(), incrementShowCount(BANNER));
        state = reducer(state, incrementShowCount(BANNER));
        state = reducer(state, dismissBanner({ bannerType: BANNER }));
        expect(state.dismissedBanners[BANNER]?.showCount).toBe(2);
    });

    it('initialises showCount to 0 for a banner not yet tracked', () => {
        const state = reducer(loadedEmpty(), dismissBanner({ bannerType: BANNER }));
        expect(state.dismissedBanners[BANNER]?.showCount).toBe(0);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// incrementShowCount
// ══════════════════════════════════════════════════════════════════════════════

describe('incrementShowCount', () => {
    it('starts at 1 after first increment', () => {
        const state = reducer(loadedEmpty(), incrementShowCount(BANNER));
        expect(state.dismissedBanners[BANNER]?.showCount).toBe(1);
    });

    it('increments correctly on repeated calls', () => {
        let state = loadedEmpty();
        state = reducer(state, incrementShowCount(BANNER));
        state = reducer(state, incrementShowCount(BANNER));
        state = reducer(state, incrementShowCount(BANNER));
        expect(state.dismissedBanners[BANNER]?.showCount).toBe(3);
    });

    it('preserves permanentlyDismissed when incrementing', () => {
        let state = reducer(loadedEmpty(), dismissBanner({ bannerType: BANNER, permanent: true }));
        state = reducer(state, incrementShowCount(BANNER));
        expect(state.dismissedBanners[BANNER]?.permanentlyDismissed).toBe(true);
    });

    it('sets dismissedAt when banner has no prior entry', () => {
        const state = reducer(loadedEmpty(), incrementShowCount(BANNER));
        expect(state.dismissedBanners[BANNER]?.dismissedAt).toBeTruthy();
    });

    it('preserves existing dismissedAt when entry already exists', () => {
        let state = reducer(loadedEmpty(), dismissBanner({ bannerType: BANNER }));
        const originalDismissedAt = state.dismissedBanners[BANNER]!.dismissedAt;
        state = reducer(state, incrementShowCount(BANNER));
        expect(state.dismissedBanners[BANNER]?.dismissedAt).toBe(originalDismissedAt);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// resetBanner
// ══════════════════════════════════════════════════════════════════════════════

describe('resetBanner', () => {
    it('removes the banner entry entirely', () => {
        let state = reducer(loadedEmpty(), dismissBanner({ bannerType: BANNER }));
        state = reducer(state, resetBanner(BANNER));
        expect(state.dismissedBanners[BANNER]).toBeUndefined();
    });

    it('does nothing when banner was not previously tracked', () => {
        const state = reducer(loadedEmpty(), resetBanner(BANNER));
        expect(state.dismissedBanners[BANNER]).toBeUndefined();
    });

    it('only removes the targeted banner, leaving others intact', () => {
        const OTHER = 'SIMILARITY_FAILED' as const;
        let state = reducer(loadedEmpty(), dismissBanner({ bannerType: BANNER }));
        state = reducer(state, dismissBanner({ bannerType: OTHER }));
        state = reducer(state, resetBanner(BANNER));
        expect(state.dismissedBanners[BANNER]).toBeUndefined();
        expect(state.dismissedBanners[OTHER]).toBeDefined();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// loadDismissals
// ══════════════════════════════════════════════════════════════════════════════

describe('loadDismissals', () => {
    it('sets isLoaded to true', () => {
        const state = reducer(undefined, loadDismissals({}));
        expect(state.isLoaded).toBe(true);
    });

    it('replaces dismissedBanners with the provided payload', () => {
        const payload = {
            [BANNER]: {
                dismissedAt: '2025-01-01T00:00:00.000Z',
                showCount: 2,
                permanentlyDismissed: false,
            },
        };
        const state = reducer(undefined, loadDismissals(payload));
        expect(state.dismissedBanners[BANNER]?.showCount).toBe(2);
    });

    it('sets isLoaded even when payload is empty', () => {
        const state = reducer(undefined, loadDismissals({}));
        expect(state.isLoaded).toBe(true);
        expect(state.dismissedBanners).toEqual({});
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// resetAll
// ══════════════════════════════════════════════════════════════════════════════

describe('resetAll', () => {
    it('clears all dismissedBanners', () => {
        let state = reducer(loadedEmpty(), dismissBanner({ bannerType: BANNER }));
        state = reducer(state, dismissBanner({ bannerType: 'SIMILARITY_FAILED' }));
        state = reducer(state, resetAll());
        expect(state.dismissedBanners).toEqual({});
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// shouldShowBanner
// ══════════════════════════════════════════════════════════════════════════════

describe('shouldShowBanner', () => {

    // ── isLoaded guard ────────────────────────────────────────────────────────

    describe('isLoaded: false', () => {
        it('returns false before dismissals are loaded', () => {
            const state = reducer(undefined, { type: '@@INIT' });
            expect(shouldShowBanner(state, BANNER)).toBe(false);
        });
    });

    // ── Fresh banner (never seen) ─────────────────────────────────────────────

    describe('fresh banner — never shown', () => {
        it('returns true when isLoaded and banner has no dismissal record', () => {
            expect(shouldShowBanner(loadedEmpty(), BANNER)).toBe(true);
        });
    });

    // ── Permanent dismissal ───────────────────────────────────────────────────

    describe('permanently dismissed', () => {
        it('returns false', () => {
            let state = loadedEmpty();
            state = reducer(state, dismissBanner({ bannerType: BANNER, permanent: true }));
            expect(shouldShowBanner(state, BANNER)).toBe(false);
        });
    });

    // ── Max show count ────────────────────────────────────────────────────────

    describe('max show count reached', () => {
        it(`returns false when showCount equals MAX_SHOWS (${MAX_SHOWS})`, () => {
            let state = loadedEmpty();
            for (let i = 0; i < MAX_SHOWS; i++) {
                state = reducer(state, incrementShowCount(BANNER));
            }
            expect(shouldShowBanner(state, BANNER)).toBe(false);
        });

        it('returns true when showCount is one below MAX_SHOWS', () => {
            const state = reducer(undefined, loadDismissals({
                [BANNER]: {
                    dismissedAt: hoursAgo(COOLDOWN_HOURS + 1),
                    showCount: MAX_SHOWS - 1,
                    permanentlyDismissed: false,
                },
            }));
            expect(shouldShowBanner(state, BANNER)).toBe(true);
        });
    });

    // ── Cooldown ──────────────────────────────────────────────────────────────

    describe('cooldown period', () => {
        it(`returns false when dismissed less than ${COOLDOWN_HOURS}h ago`, () => {
            let state = loadedEmpty();
            state = reducer(state, dismissBanner({ bannerType: BANNER }));
            // dismissedAt defaults to now — well within cooldown
            expect(shouldShowBanner(state, BANNER)).toBe(false);
        });

        it(`returns true when dismissed more than ${COOLDOWN_HOURS}h ago`, () => {
            const state = reducer(undefined, loadDismissals({
                [BANNER]: {
                    dismissedAt: hoursAgo(COOLDOWN_HOURS + 1),
                    showCount: 1,
                    permanentlyDismissed: false,
                },
            }));
            expect(shouldShowBanner(state, BANNER)).toBe(true);
        });

        it('returns false when dismissed exactly at the cooldown boundary', () => {
            const state = reducer(undefined, loadDismissals({
                [BANNER]: {
                    dismissedAt: hoursAgo(COOLDOWN_HOURS - 0.01),
                    showCount: 1,
                    permanentlyDismissed: false,
                },
            }));
            expect(shouldShowBanner(state, BANNER)).toBe(false);
        });
    });

    // ── Combined conditions ───────────────────────────────────────────────────

    describe('combined conditions', () => {
        it('returns false when permanently dismissed even if cooldown has passed', () => {
            const state = reducer(undefined, loadDismissals({
                [BANNER]: {
                    dismissedAt: hoursAgo(COOLDOWN_HOURS + 100),
                    showCount: 0,
                    permanentlyDismissed: true,
                },
            }));
            expect(shouldShowBanner(state, BANNER)).toBe(false);
        });

        it('returns false when max shows reached even if cooldown has passed', () => {
            const state = reducer(undefined, loadDismissals({
                [BANNER]: {
                    dismissedAt: hoursAgo(COOLDOWN_HOURS + 100),
                    showCount: MAX_SHOWS,
                    permanentlyDismissed: false,
                },
            }));
            expect(shouldShowBanner(state, BANNER)).toBe(false);
        });

        it('returns true after cooldown with showCount below max and not permanent', () => {
            const state = reducer(undefined, loadDismissals({
                [BANNER]: {
                    dismissedAt: hoursAgo(COOLDOWN_HOURS + 1),
                    showCount: 1,
                    permanentlyDismissed: false,
                },
            }));
            expect(shouldShowBanner(state, BANNER)).toBe(true);
        });
    });

    // ── Different banner types ────────────────────────────────────────────────

    describe('banner type isolation', () => {
        it('evaluates each banner type independently', () => {
            const OTHER = 'SIMILARITY_FAILED' as const;
            let state = loadedEmpty();
            state = reducer(state, dismissBanner({ bannerType: BANNER, permanent: true }));
            // BANNER is permanently dismissed, OTHER is fresh
            expect(shouldShowBanner(state, BANNER)).toBe(false);
            expect(shouldShowBanner(state, OTHER)).toBe(true);
        });
    });
});