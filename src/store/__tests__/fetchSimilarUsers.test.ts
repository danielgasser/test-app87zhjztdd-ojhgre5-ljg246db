import { fetchSimilarUsers } from '../locationsSlice';
import { loadDismissals } from '../profileBannerSlice';
import {
    setupMocks,
    makeStore,
    getLocations,
    mockFetch,
    SIMILAR_USERS_RESPONSE,
    MOCK_SESSION,
    buildUserProfile,
} from './helpers/testUtils';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    setupMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = MOCK_SESSION.user.id;

function mockFetchSuccess(body = SIMILAR_USERS_RESPONSE) {
    mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(''),
    });
}

function mockFetchFailure(status = 500) {
    mockFetch.mockResolvedValue({
        ok: false,
        status,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('Server error'),
    });
}

/** Store with profileBanner.isLoaded = true (required for banner to fire) */
function makeLoadedStore(profileOverrides = {}) {
    const store = makeStore({ user: { profile: buildUserProfile(profileOverrides) } });
    store.dispatch(loadDismissals({}));
    return store;
}

// ─── HTTP request ─────────────────────────────────────────────────────────────

describe('HTTP request', () => {
    it('calls the similarity-calculator edge function URL', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        expect(mockFetch).toHaveBeenCalledWith(
            'https://mock.supabase.co/functions/v1/similarity-calculator',
            expect.any(Object)
        );
    });

    it('sends Authorization header with Bearer token', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers['Authorization']).toMatch(/^Bearer /);
    });

    it('sends user_id in the request body', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.user_id).toBe(USER_ID);
    });
});

// ─── State updates ────────────────────────────────────────────────────────────

describe('state updates', () => {
    it('stores similar_users in state on success', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        expect(getLocations(store).similarUsers).toEqual(SIMILAR_USERS_RESPONSE.similar_users);
    });

    it('sets similarUsersLoading to false after success', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        expect(getLocations(store).similarUsersLoading).toBe(false);
    });

    it('sets similarUsersLoading to false after non-ok response', async () => {
        mockFetchFailure();
        const store = makeStore();
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        expect(getLocations(store).similarUsersLoading).toBe(false);
    });
});

// ─── Graceful degradation ─────────────────────────────────────────────────────

describe('graceful degradation', () => {
    it('returns empty array when response.ok is false', async () => {
        mockFetchFailure();
        const store = makeStore();
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        expect(getLocations(store).similarUsers).toEqual([]);
    });

    it('returns empty array when similar_users key is missing', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
        });
        const store = makeStore();
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        expect(getLocations(store).similarUsers).toEqual([]);
    });

    it('returns empty array on network error', async () => {
        mockFetch.mockRejectedValue(new Error('Network request failed'));
        const store = makeStore();
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        expect(getLocations(store).similarUsers).toEqual([]);
    });

    it('sets similarUsersLoading to false after network error', async () => {
        mockFetch.mockRejectedValue(new Error('Network request failed'));
        const store = makeStore();
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        expect(getLocations(store).similarUsersLoading).toBe(false);
    });
});

// ─── Banner dispatch ──────────────────────────────────────────────────────────

describe('banner dispatch', () => {
    it('does not dispatch incrementShowCount when profile is complete', async () => {
        mockFetchSuccess();
        // BASE_USER_PROFILE has race_ethnicity + gender — SIMILARITY requirements met
        const store = makeLoadedStore();
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        const bannerState = (store.getState() as any).profileBanner;
        expect(bannerState.dismissedBanners['SIMILARITY_FAILED']).toBeUndefined();
    });

    it('dispatches incrementShowCount when race_ethnicity is missing and banner is loaded', async () => {
        mockFetchSuccess();
        const store = makeLoadedStore({ race_ethnicity: [] });
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        const bannerState = (store.getState() as any).profileBanner;
        expect(bannerState.dismissedBanners['SIMILARITY_FAILED']?.showCount).toBe(1);
    });

    it('dispatches incrementShowCount when gender is missing and banner is loaded', async () => {
        mockFetchSuccess();
        const store = makeLoadedStore({ gender: '' });
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        const bannerState = (store.getState() as any).profileBanner;
        expect(bannerState.dismissedBanners['SIMILARITY_FAILED']?.showCount).toBe(1);
    });

    it('does NOT dispatch incrementShowCount when profileBanner is not loaded', async () => {
        mockFetchSuccess();
        // makeStore without loadDismissals → isLoaded: false → shouldShowBanner returns false
        const store = makeStore({ user: { profile: buildUserProfile({ race_ethnicity: [] }) } });
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        const bannerState = (store.getState() as any).profileBanner;
        expect(bannerState.dismissedBanners['SIMILARITY_FAILED']).toBeUndefined();
    });

    it('still makes API call even when profile is incomplete', async () => {
        mockFetchSuccess();
        const store = makeLoadedStore({ race_ethnicity: [] });
        await store.dispatch(fetchSimilarUsers(USER_ID) as any);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });
});