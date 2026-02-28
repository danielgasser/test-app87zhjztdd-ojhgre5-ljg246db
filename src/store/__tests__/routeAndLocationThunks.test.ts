import {
    fetchUserRouteHistory,
    deleteRouteFromHistory,
    fetchNeighborhoodStats,
    fetchSavedLocations,
    saveLocation,
    unsaveLocation,
} from '../locationsSlice';
import { makeStore, setupMocks, getLocations } from './helpers/testUtils';
import { supabase } from '../../services/supabase';

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const DB_ROUTE_ROW = {
    id: 'route-1',
    user_id: 'user-123',
    origin_name: 'Home',
    destination_name: 'Work',
    distance_km: 5.2,
    duration_minutes: 12,
    safety_score: 4.1,
    navigation_started_at: null,
    navigation_ended_at: null,
    navigation_session_id: 'session-abc',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    route_coordinates: [{ latitude: 27.9506, longitude: -82.4572 }],
    steps: null,
    safety_alerts_handled: null,
};

const NEIGHBORHOOD_STATS_RAW = {
    block_group_fips: '120570001001',
    name: 'Census Block 001',
    city: 'Tampa',
    county_name: 'Hillsborough County',
    state_code: 'FL',
    population: 4200,
    diversity_index: 0.65,
    pct_minority: 0.42,
    crime_rate_per_1000: 18.5,
    violent_crime_rate: 4.2,
    property_crime_rate: 14.3,
    hate_crime_incidents: 2,
    walkability_score: 72,
    data_source: 'Census 2020',
    data_year: 2020,
};

const SAVED_LOCATION = {
    id: 'saved-1',
    user_id: 'user-123',
    location_id: 'loc-1',
    google_place_id: null,
    name: 'Favorite Coffee Shop',
    address: '123 Main St',
    latitude: 27.9506,
    longitude: -82.4572,
    nickname: null,
    created_at: new Date().toISOString(),
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    setupMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchUserRouteHistory
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchUserRouteHistory', () => {

    function mockHistorySuccess(data: any[]) {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        range: jest.fn().mockResolvedValue({ data, error: null }),
                    }),
                }),
            }),
        });
    }

    function mockHistoryError(message = 'DB error') {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        range: jest.fn().mockResolvedValue({ data: null, error: { message } }),
                    }),
                }),
            }),
        });
    }

    it('queries the routes table', async () => {
        mockHistorySuccess([DB_ROUTE_ROW]);
        const store = makeStore();
        await store.dispatch(fetchUserRouteHistory({ userId: 'user-123' }) as any);
        expect(mockFrom).toHaveBeenCalledWith('routes');
    });

    it('stores routes in routeHistory state on page 0', async () => {
        mockHistorySuccess([DB_ROUTE_ROW]);
        const store = makeStore();
        await store.dispatch(fetchUserRouteHistory({ userId: 'user-123', page: 0 }) as any);
        expect(getLocations(store).routeHistory).toHaveLength(1);
    });

    it('replaces routeHistory on page 0', async () => {
        mockHistorySuccess([DB_ROUTE_ROW]);
        const store = makeStore();
        // First load
        await store.dispatch(fetchUserRouteHistory({ userId: 'user-123', page: 0 }) as any);
        // Second load of page 0 should replace
        await store.dispatch(fetchUserRouteHistory({ userId: 'user-123', page: 0 }) as any);
        expect(getLocations(store).routeHistory).toHaveLength(1);
    });

    it('appends to routeHistory on page > 0', async () => {
        mockHistorySuccess([DB_ROUTE_ROW]);
        const store = makeStore();
        await store.dispatch(fetchUserRouteHistory({ userId: 'user-123', page: 0 }) as any);
        const secondRoute = { ...DB_ROUTE_ROW, id: 'route-2' };
        mockHistorySuccess([secondRoute]);
        await store.dispatch(fetchUserRouteHistory({ userId: 'user-123', page: 1 }) as any);
        expect(getLocations(store).routeHistory).toHaveLength(2);
    });

    it('sets hasMore true when result count equals pageSize', async () => {
        const fiveRoutes = Array(5).fill(DB_ROUTE_ROW).map((r, i) => ({ ...r, id: `route-${i}` }));
        mockHistorySuccess(fiveRoutes);
        const store = makeStore();
        await store.dispatch(fetchUserRouteHistory({ userId: 'user-123', pageSize: 5 }) as any);
        expect(getLocations(store).routeHistoryHasMore).toBe(true);
    });

    it('sets hasMore false when result count is less than pageSize', async () => {
        mockHistorySuccess([DB_ROUTE_ROW]); // 1 result, pageSize defaults to 5
        const store = makeStore();
        await store.dispatch(fetchUserRouteHistory({ userId: 'user-123' }) as any);
        expect(getLocations(store).routeHistoryHasMore).toBe(false);
    });

    it('maps DB rows through dbRowToRouteHistoryItem', async () => {
        mockHistorySuccess([DB_ROUTE_ROW]);
        const store = makeStore();
        await store.dispatch(fetchUserRouteHistory({ userId: 'user-123' }) as any);
        const route = getLocations(store).routeHistory[0];
        expect(route.origin_name).toBe('Home');
        expect(route.destination_name).toBe('Work');
    });

    it('rejects when DB returns an error', async () => {
        mockHistoryError();
        const store = makeStore();
        const result = await store.dispatch(fetchUserRouteHistory({ userId: 'user-123' }) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });

    it('returns empty routes array when data is null', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        range: jest.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                }),
            }),
        });
        const store = makeStore();
        await store.dispatch(fetchUserRouteHistory({ userId: 'user-123' }) as any);
        expect(getLocations(store).routeHistory).toEqual([]);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// deleteRouteFromHistory
// ══════════════════════════════════════════════════════════════════════════════

describe('deleteRouteFromHistory', () => {

    function mockDeleteSuccess() {
        mockFrom.mockReturnValue({
            delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            }),
        });
    }

    function mockDeleteError(message = 'Delete failed') {
        mockFrom.mockReturnValue({
            delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: { message } }),
            }),
        });
    }

    it('deletes from the routes table', async () => {
        mockDeleteSuccess();
        const store = makeStore();
        await store.dispatch(deleteRouteFromHistory('route-1') as any);
        expect(mockFrom).toHaveBeenCalledWith('routes');
    });

    it('fulfills with the deleted route id', async () => {
        mockDeleteSuccess();
        const store = makeStore();
        const result = await store.dispatch(deleteRouteFromHistory('route-1') as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toBe('route-1');
    });

    it('removes the route from routeHistory state', async () => {
        // First load a route into state
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        range: jest.fn().mockResolvedValue({ data: [DB_ROUTE_ROW], error: null }),
                    }),
                }),
            }),
        });
        const store = makeStore();
        await store.dispatch(fetchUserRouteHistory({ userId: 'user-123' }) as any);
        expect(getLocations(store).routeHistory).toHaveLength(1);

        // Now delete it
        mockDeleteSuccess();
        await store.dispatch(deleteRouteFromHistory('route-1') as any);
        expect(getLocations(store).routeHistory).toHaveLength(0);
    });

    it('rejects when DB returns an error', async () => {
        mockDeleteError();
        const store = makeStore();
        const result = await store.dispatch(deleteRouteFromHistory('route-1') as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchNeighborhoodStats
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchNeighborhoodStats', () => {

    const BASE_PARAMS = { latitude: 27.9506, longitude: -82.4572 };

    it('calls get_neighborhood_stats RPC', async () => {
        mockRpc.mockResolvedValue({ data: NEIGHBORHOOD_STATS_RAW, error: null });
        const store = makeStore();
        await store.dispatch(fetchNeighborhoodStats(BASE_PARAMS) as any);
        expect(mockRpc).toHaveBeenCalledWith('get_neighborhood_stats', expect.any(Object));
    });

    it('passes correct params to RPC', async () => {
        mockRpc.mockResolvedValue({ data: NEIGHBORHOOD_STATS_RAW, error: null });
        const store = makeStore();
        await store.dispatch(fetchNeighborhoodStats({ ...BASE_PARAMS, radiusMeters: 1000 }) as any);
        expect(mockRpc).toHaveBeenCalledWith('get_neighborhood_stats', {
            p_latitude: BASE_PARAMS.latitude,
            p_longitude: BASE_PARAMS.longitude,
            p_radius_meters: 1000,
        });
    });

    it('uses default radiusMeters of 500 when not provided', async () => {
        mockRpc.mockResolvedValue({ data: NEIGHBORHOOD_STATS_RAW, error: null });
        const store = makeStore();
        await store.dispatch(fetchNeighborhoodStats(BASE_PARAMS) as any);
        expect(mockRpc).toHaveBeenCalledWith('get_neighborhood_stats', expect.objectContaining({
            p_radius_meters: 500,
        }));
    });

    it('stores parsed stats in neighborhoodStats state', async () => {
        mockRpc.mockResolvedValue({ data: NEIGHBORHOOD_STATS_RAW, error: null });
        const store = makeStore();
        await store.dispatch(fetchNeighborhoodStats(BASE_PARAMS) as any);
        const stats = getLocations(store).neighborhoodStats;
        expect(stats).not.toBeNull();
        expect(stats?.city).toBe('Tampa');
        expect(stats?.state_code).toBe('FL');
    });

    it('handles string JSON response from RPC', async () => {
        mockRpc.mockResolvedValue({ data: JSON.stringify(NEIGHBORHOOD_STATS_RAW), error: null });
        const store = makeStore();
        await store.dispatch(fetchNeighborhoodStats(BASE_PARAMS) as any);
        expect(getLocations(store).neighborhoodStats?.city).toBe('Tampa');
    });

    it('returns null when data is null', async () => {
        mockRpc.mockResolvedValue({ data: null, error: null });
        const store = makeStore();
        await store.dispatch(fetchNeighborhoodStats(BASE_PARAMS) as any);
        expect(getLocations(store).neighborhoodStats).toBeNull();
    });

    it('rejects when RPC returns an error', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });
        const store = makeStore();
        const result = await store.dispatch(fetchNeighborhoodStats(BASE_PARAMS) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });

    it('sets neighborhoodStats to null on rejection', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });
        const store = makeStore();
        await store.dispatch(fetchNeighborhoodStats(BASE_PARAMS) as any);
        expect(getLocations(store).neighborhoodStats).toBeNull();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchSavedLocations
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchSavedLocations', () => {

    function mockFetchSuccess(data = [SAVED_LOCATION]) {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data, error: null }),
                }),
            }),
        });
    }

    function mockFetchError(message = 'DB error') {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: null, error: { message } }),
                }),
            }),
        });
    }

    it('queries the saved_locations table', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchSavedLocations('user-123') as any);
        expect(mockFrom).toHaveBeenCalledWith('saved_locations');
    });

    it('stores locations in savedLocations state', async () => {
        mockFetchSuccess([SAVED_LOCATION]);
        const store = makeStore();
        await store.dispatch(fetchSavedLocations('user-123') as any);
        expect(getLocations(store).savedLocations).toHaveLength(1);
    });

    it('fulfills with the saved locations array', async () => {
        mockFetchSuccess([SAVED_LOCATION]);
        const store = makeStore();
        const result = await store.dispatch(fetchSavedLocations('user-123') as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toHaveLength(1);
    });

    it('rejects when DB returns an error', async () => {
        mockFetchError();
        const store = makeStore();
        const result = await store.dispatch(fetchSavedLocations('user-123') as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// saveLocation
// ══════════════════════════════════════════════════════════════════════════════

describe('saveLocation', () => {

    const SAVE_PARAMS = {
        userId: 'user-123',
        locationId: 'loc-1',
        name: 'Favorite Coffee Shop',
        address: '123 Main St',
        latitude: 27.9506,
        longitude: -82.4572,
    };

    function mockSaveSuccess(data = SAVED_LOCATION) {
        mockFrom.mockReturnValue({
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data, error: null }),
                }),
            }),
        });
    }

    function mockSaveError(message = 'Insert failed') {
        mockFrom.mockReturnValue({
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { message } }),
                }),
            }),
        });
    }

    it('inserts into the saved_locations table', async () => {
        mockSaveSuccess();
        const store = makeStore();
        await store.dispatch(saveLocation(SAVE_PARAMS) as any);
        expect(mockFrom).toHaveBeenCalledWith('saved_locations');
    });

    it('includes user_id in the insert payload', async () => {
        const insertMock = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: SAVED_LOCATION, error: null }),
            }),
        });
        mockFrom.mockReturnValue({ insert: insertMock });
        const store = makeStore();
        await store.dispatch(saveLocation(SAVE_PARAMS) as any);
        expect(insertMock).toHaveBeenCalledWith(
            expect.objectContaining({ user_id: 'user-123' })
        );
    });

    it('adds the location to savedLocations state', async () => {
        mockSaveSuccess();
        const store = makeStore();
        await store.dispatch(saveLocation(SAVE_PARAMS) as any);
        expect(getLocations(store).savedLocations).toHaveLength(1);
    });

    it('fulfills with the saved location data', async () => {
        mockSaveSuccess(SAVED_LOCATION);
        const store = makeStore();
        const result = await store.dispatch(saveLocation(SAVE_PARAMS) as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload.name).toBe('Favorite Coffee Shop');
    });

    it('rejects when DB insert fails', async () => {
        mockSaveError();
        const store = makeStore();
        const result = await store.dispatch(saveLocation(SAVE_PARAMS) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// unsaveLocation
// ══════════════════════════════════════════════════════════════════════════════

describe('unsaveLocation', () => {

    function mockUnsaveSuccess() {
        mockFrom.mockReturnValue({
            delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            }),
        });
    }

    function mockUnsaveError(message = 'Delete failed') {
        mockFrom.mockReturnValue({
            delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: { message } }),
            }),
        });
    }

    it('deletes from the saved_locations table', async () => {
        mockUnsaveSuccess();
        const store = makeStore();
        await store.dispatch(unsaveLocation({ savedLocationId: 'saved-1' }) as any);
        expect(mockFrom).toHaveBeenCalledWith('saved_locations');
    });

    it('fulfills with the deleted id', async () => {
        mockUnsaveSuccess();
        const store = makeStore();
        const result = await store.dispatch(unsaveLocation({ savedLocationId: 'saved-1' }) as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toBe('saved-1');
    });

    it('removes the location from savedLocations state', async () => {
        // First add a location to state
        mockFrom.mockReturnValue({
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: SAVED_LOCATION, error: null }),
                }),
            }),
        });
        const store = makeStore();
        await store.dispatch(saveLocation({
            userId: 'user-123',
            locationId: 'loc-1',
            name: 'Coffee Shop',
            latitude: 27.9506,
            longitude: -82.4572,
        }) as any);
        expect(getLocations(store).savedLocations).toHaveLength(1);

        // Now unsave it
        mockUnsaveSuccess();
        await store.dispatch(unsaveLocation({ savedLocationId: 'saved-1' }) as any);
        expect(getLocations(store).savedLocations).toHaveLength(0);
    });

    it('rejects when DB delete fails', async () => {
        mockUnsaveError();
        const store = makeStore();
        const result = await store.dispatch(unsaveLocation({ savedLocationId: 'saved-1' }) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});