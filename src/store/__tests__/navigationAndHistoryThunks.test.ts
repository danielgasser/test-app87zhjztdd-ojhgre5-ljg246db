import {
    startNavigationSession,
    endNavigationSession,
    saveFinalRoute,
    checkForActiveNavigation,
    fetchDemographicScores,
    fetchRecentlyViewed,
    addToRecentlyViewed,
    fetchSearchHistory,
    addToSearchHistory,
} from '../locationsSlice';
import { makeStore, setupMocks, getLocations } from './helpers/testUtils';
import { supabase } from '../../services/supabase';

const mockFrom = supabase.from as jest.Mock;
const mockGetUser = supabase.auth.getUser as jest.Mock;

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const DB_ROUTE = {
    id: 'route-1',
    user_id: 'user-123',
    origin_name: 'Home',
    destination_name: 'Work',
    navigation_started_at: new Date().toISOString(),
    navigation_ended_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

const RECENTLY_VIEWED = {
    id: 'rv-1',
    user_id: 'user-123',
    location_id: 'loc-1',
    google_place_id: null,
    name: 'Tampa Museum',
    address: '100 Art Dr',
    latitude: 27.9506,
    longitude: -82.4572,
    viewed_at: new Date().toISOString(),
};

const SEARCH_HISTORY_ITEM = {
    id: 'sh-1',
    user_id: 'user-123',
    query: 'coffee shops',
    selected_place_id: null,
    selected_location_id: 'loc-1',
    selected_name: 'Ella Coffee',
    selected_latitude: 27.9506,
    selected_longitude: -82.4572,
    search_context: 'map',
    searched_at: new Date().toISOString(),
};

const DEMOGRAPHIC_SCORE = {
    id: 'score-1',
    location_id: 'loc-1',
    demographic_type: 'race_ethnicity',
    demographic_value: 'Black',
    avg_safety_score: 3.8,
    review_count: 12,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockUpdateSuccess(data = DB_ROUTE) {
    mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data, error: null }),
                }),
            }),
        }),
    });
}

function mockUpdateError(message = 'Update failed') {
    mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { message } }),
                }),
            }),
        }),
    });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    setupMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
});

// ══════════════════════════════════════════════════════════════════════════════
// startNavigationSession
// ══════════════════════════════════════════════════════════════════════════════

describe('startNavigationSession', () => {

    it('updates the routes table', async () => {
        mockUpdateSuccess();
        const store = makeStore();
        await store.dispatch(startNavigationSession('route-1') as any);
        expect(mockFrom).toHaveBeenCalledWith('routes');
    });

    it('sets navigation_started_at in the update payload', async () => {
        const updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: DB_ROUTE, error: null }),
                }),
            }),
        });
        mockFrom.mockReturnValue({ update: updateMock });
        const store = makeStore();
        await store.dispatch(startNavigationSession('route-1') as any);
        expect(updateMock).toHaveBeenCalledWith(
            expect.objectContaining({ navigation_started_at: expect.any(String) })
        );
    });

    it('fulfills with the updated route data', async () => {
        mockUpdateSuccess(DB_ROUTE);
        const store = makeStore();
        const result = await store.dispatch(startNavigationSession('route-1') as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload.id).toBe('route-1');
    });

    it('rejects when DB update fails', async () => {
        mockUpdateError();
        const store = makeStore();
        const result = await store.dispatch(startNavigationSession('route-1') as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });

    it('rejects when data is null', async () => {
        mockFrom.mockReturnValue({
            update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                }),
            }),
        });
        const store = makeStore();
        const result = await store.dispatch(startNavigationSession('route-1') as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// endNavigationSession
// ══════════════════════════════════════════════════════════════════════════════

describe('endNavigationSession', () => {

    it('updates the routes table', async () => {
        mockUpdateSuccess();
        const store = makeStore();
        await store.dispatch(endNavigationSession('route-1') as any);
        expect(mockFrom).toHaveBeenCalledWith('routes');
    });

    it('sets navigation_ended_at in the update payload', async () => {
        const updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: DB_ROUTE, error: null }),
                }),
            }),
        });
        mockFrom.mockReturnValue({ update: updateMock });
        const store = makeStore();
        await store.dispatch(endNavigationSession('route-1') as any);
        expect(updateMock).toHaveBeenCalledWith(
            expect.objectContaining({ navigation_ended_at: expect.any(String) })
        );
    });

    it('fulfills with the updated route data', async () => {
        mockUpdateSuccess(DB_ROUTE);
        const store = makeStore();
        const result = await store.dispatch(endNavigationSession('route-1') as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
    });

    it('rejects when DB update fails', async () => {
        mockUpdateError();
        const store = makeStore();
        const result = await store.dispatch(endNavigationSession('route-1') as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// saveFinalRoute
// ══════════════════════════════════════════════════════════════════════════════

describe('saveFinalRoute', () => {

    const ACTUAL_PATH = [
        { latitude: 27.9506, longitude: -82.4572 },
        { latitude: 27.9550, longitude: -82.4600 },
    ];

    it('updates the routes table', async () => {
        mockUpdateSuccess();
        const store = makeStore();
        await store.dispatch(saveFinalRoute({ routeId: 'route-1', actualPath: ACTUAL_PATH }) as any);
        expect(mockFrom).toHaveBeenCalledWith('routes');
    });

    it('includes actual_path_traveled and navigation_ended_at in update', async () => {
        const updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: DB_ROUTE, error: null }),
                }),
            }),
        });
        mockFrom.mockReturnValue({ update: updateMock });
        const store = makeStore();
        await store.dispatch(saveFinalRoute({ routeId: 'route-1', actualPath: ACTUAL_PATH }) as any);
        expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
            actual_path_traveled: ACTUAL_PATH,
            navigation_ended_at: expect.any(String),
        }));
    });

    it('fulfills with the updated route', async () => {
        mockUpdateSuccess(DB_ROUTE);
        const store = makeStore();
        const result = await store.dispatch(saveFinalRoute({ routeId: 'route-1', actualPath: ACTUAL_PATH }) as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
    });

    it('rejects when DB update fails', async () => {
        mockUpdateError();
        const store = makeStore();
        const result = await store.dispatch(saveFinalRoute({ routeId: 'route-1', actualPath: ACTUAL_PATH }) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// checkForActiveNavigation
// ══════════════════════════════════════════════════════════════════════════════

describe('checkForActiveNavigation', () => {

    function mockActiveRouteFound(data = DB_ROUTE) {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    not: jest.fn().mockReturnValue({
                        is: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({ data, error: null }),
                                }),
                            }),
                        }),
                    }),
                }),
            }),
        });
    }

    function mockNoActiveRoute() {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    not: jest.fn().mockReturnValue({
                        is: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: null,
                                        error: { code: 'PGRST116' }, // no rows
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            }),
        });
    }

    it('returns null when user is not authenticated', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });
        const store = makeStore();
        const result = await store.dispatch(checkForActiveNavigation() as any);
        expect(result.payload).toBeNull();
    });

    it('returns active route when found', async () => {
        mockActiveRouteFound(DB_ROUTE);
        const store = makeStore();
        const result = await store.dispatch(checkForActiveNavigation() as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload?.id).toBe('route-1');
    });

    it('returns null when no active route (PGRST116)', async () => {
        mockNoActiveRoute();
        const store = makeStore();
        const result = await store.dispatch(checkForActiveNavigation() as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toBeNull();
    });

    it('rejects on non-PGRST116 DB errors', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    not: jest.fn().mockReturnValue({
                        is: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: null,
                                        error: { code: '42501', message: 'Permission denied' },
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            }),
        });
        const store = makeStore();
        const result = await store.dispatch(checkForActiveNavigation() as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchDemographicScores
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchDemographicScores', () => {

    function mockScoresSuccess(data = [DEMOGRAPHIC_SCORE]) {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data, error: null }),
                }),
            }),
        });
    }

    it('queries the safety_scores table', async () => {
        mockScoresSuccess();
        const store = makeStore();
        await store.dispatch(fetchDemographicScores('loc-1') as any);
        expect(mockFrom).toHaveBeenCalledWith('safety_scores');
    });

    it('fulfills with locationId and scores', async () => {
        mockScoresSuccess([DEMOGRAPHIC_SCORE]);
        const store = makeStore();
        const result = await store.dispatch(fetchDemographicScores('loc-1') as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual({ locationId: 'loc-1', scores: [DEMOGRAPHIC_SCORE] });
    });

    it('stores scores in demographicScores state keyed by locationId', async () => {
        mockScoresSuccess([DEMOGRAPHIC_SCORE]);
        const store = makeStore();
        await store.dispatch(fetchDemographicScores('loc-1') as any);
        expect(getLocations(store).demographicScores['loc-1']).toHaveLength(1);
    });

    it('returns empty scores array when data is null', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
            }),
        });
        const store = makeStore();
        const result = await store.dispatch(fetchDemographicScores('loc-1') as any);
        expect(result.payload.scores).toEqual([]);
    });

    it('rejects when DB returns an error', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
                }),
            }),
        });
        const store = makeStore();
        const result = await store.dispatch(fetchDemographicScores('loc-1') as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchRecentlyViewed
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchRecentlyViewed', () => {

    function mockFetchSuccess(data = [RECENTLY_VIEWED]) {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue({ data, error: null }),
                    }),
                }),
            }),
        });
    }

    it('queries recently_viewed_locations table', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchRecentlyViewed({ userId: 'user-123' }) as any);
        expect(mockFrom).toHaveBeenCalledWith('recently_viewed_locations');
    });

    it('stores results in recentlyViewed state', async () => {
        mockFetchSuccess([RECENTLY_VIEWED]);
        const store = makeStore();
        await store.dispatch(fetchRecentlyViewed({ userId: 'user-123' }) as any);
        expect(getLocations(store).recentlyViewed).toHaveLength(1);
    });

    it('rejects when DB returns an error', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
                    }),
                }),
            }),
        });
        const store = makeStore();
        const result = await store.dispatch(fetchRecentlyViewed({ userId: 'user-123' }) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// addToRecentlyViewed
// ══════════════════════════════════════════════════════════════════════════════

describe('addToRecentlyViewed', () => {

    const ADD_PARAMS = {
        userId: 'user-123',
        locationId: 'loc-1',
        name: 'Tampa Museum',
        address: '100 Art Dr',
        latitude: 27.9506,
        longitude: -82.4572,
    };

    function mockUpsertSuccess(data = RECENTLY_VIEWED) {
        mockFrom.mockReturnValue({
            upsert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data, error: null }),
                }),
            }),
        });
    }

    it('upserts into recently_viewed_locations table', async () => {
        mockUpsertSuccess();
        const store = makeStore();
        await store.dispatch(addToRecentlyViewed(ADD_PARAMS) as any);
        expect(mockFrom).toHaveBeenCalledWith('recently_viewed_locations');
    });

    it('prepends result to recentlyViewed state', async () => {
        mockUpsertSuccess(RECENTLY_VIEWED);
        const store = makeStore();
        await store.dispatch(addToRecentlyViewed(ADD_PARAMS) as any);
        expect(getLocations(store).recentlyViewed[0].name).toBe('Tampa Museum');
    });

    it('deduplicates entries by id', async () => {
        mockUpsertSuccess(RECENTLY_VIEWED);
        const store = makeStore();
        await store.dispatch(addToRecentlyViewed(ADD_PARAMS) as any);
        await store.dispatch(addToRecentlyViewed(ADD_PARAMS) as any);
        expect(getLocations(store).recentlyViewed).toHaveLength(1);
    });

    it('rejects when DB upsert fails', async () => {
        mockFrom.mockReturnValue({
            upsert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Conflict' } }),
                }),
            }),
        });
        const store = makeStore();
        const result = await store.dispatch(addToRecentlyViewed(ADD_PARAMS) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchSearchHistory
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchSearchHistory', () => {

    function mockFetchSuccess(data = [SEARCH_HISTORY_ITEM]) {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue({ data, error: null }),
                    }),
                }),
            }),
        });
    }

    it('queries the search_history table', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchSearchHistory({ userId: 'user-123' }) as any);
        expect(mockFrom).toHaveBeenCalledWith('search_history');
    });

    it('stores results in searchHistory state', async () => {
        mockFetchSuccess([SEARCH_HISTORY_ITEM]);
        const store = makeStore();
        await store.dispatch(fetchSearchHistory({ userId: 'user-123' }) as any);
        expect(getLocations(store).searchHistory).toHaveLength(1);
    });

    it('rejects when DB returns an error', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
                    }),
                }),
            }),
        });
        const store = makeStore();
        const result = await store.dispatch(fetchSearchHistory({ userId: 'user-123' }) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// addToSearchHistory
// ══════════════════════════════════════════════════════════════════════════════

describe('addToSearchHistory', () => {

    const ADD_PARAMS = {
        userId: 'user-123',
        query: 'coffee shops',
        selectedLocationId: 'loc-1',
        selectedName: 'Ella Coffee',
    };

    function mockUpsertSuccess(data = SEARCH_HISTORY_ITEM) {
        mockFrom.mockReturnValue({
            upsert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data, error: null }),
                }),
            }),
        });
    }

    it('upserts into search_history table', async () => {
        mockUpsertSuccess();
        const store = makeStore();
        await store.dispatch(addToSearchHistory(ADD_PARAMS) as any);
        expect(mockFrom).toHaveBeenCalledWith('search_history');
    });

    it('prepends result to searchHistory state', async () => {
        mockUpsertSuccess(SEARCH_HISTORY_ITEM);
        const store = makeStore();
        await store.dispatch(addToSearchHistory(ADD_PARAMS) as any);
        expect(getLocations(store).searchHistory[0].query).toBe('coffee shops');
    });

    it('deduplicates by query — same query appears only once', async () => {
        mockUpsertSuccess(SEARCH_HISTORY_ITEM);
        const store = makeStore();
        await store.dispatch(addToSearchHistory(ADD_PARAMS) as any);
        await store.dispatch(addToSearchHistory(ADD_PARAMS) as any);
        expect(getLocations(store).searchHistory).toHaveLength(1);
    });

    it('fulfills with the upserted item', async () => {
        mockUpsertSuccess(SEARCH_HISTORY_ITEM);
        const store = makeStore();
        const result = await store.dispatch(addToSearchHistory(ADD_PARAMS) as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload.query).toBe('coffee shops');
    });

    it('rejects when DB upsert fails', async () => {
        mockFrom.mockReturnValue({
            upsert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Conflict' } }),
                }),
            }),
        });
        const store = makeStore();
        const result = await store.dispatch(addToSearchHistory(ADD_PARAMS) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});