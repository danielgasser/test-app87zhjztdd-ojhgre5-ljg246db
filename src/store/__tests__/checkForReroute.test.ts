import { configureStore } from '@reduxjs/toolkit';
import locationsReducer, {
    checkForReroute,
    setSelectedRoute,
    setRouteRequest,
} from '../locationsSlice';
import userReducer from '../userSlice';
import { supabase } from '../../services/supabase';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? 'test-key';

const mockFunctionsInvoke = supabase.functions.invoke as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_POSITION = { latitude: 40.7580, longitude: -73.9855 };

const BASE_ROUTE_REQUEST = {
    origin: { latitude: 40.7580, longitude: -73.9855 },
    destination: { latitude: 40.7484, longitude: -73.9857 },
    user_demographics: { race_ethnicity: 'black', gender: 'female' },
    route_preferences: { prioritize_safety: true },
};

const BASE_ROUTE = {
    id: 'route-1',
    name: 'Safe Route',
    route_type: 'safest',
    coordinates: [BASE_POSITION],
    estimated_duration_minutes: 15,
    distance_kilometers: 5.2,
    safety_analysis: { overall_route_score: 4.0, safety_notes: [] },
    created_at: new Date().toISOString(),
    navigationSessionId: 'session-001',
    databaseId: 'db-route-1',
};

const SMART_ROUTE_RESPONSE = {
    success: true,
    optimized_route: {
        geometry: { coordinates: [[-73.9855, 40.7580], [-73.9857, 40.7484]] },
        steps: [],
        duration: 900,
        distance: 5200,
    },
    original_route: {
        geometry: { coordinates: [[-73.9855, 40.7580]] },
        duration: 1000,
        distance: 5500,
    },
    improvement_summary: {
        original_safety_score: 2.8,
        optimized_safety_score: 4.2,
        safety_improvement: 1.4,
        time_added_minutes: 5,
        distance_added_km: 1.2,
        danger_zones_avoided: 2,
    },
    optimized_safety: { overall_confidence: 0.9, overall_route_score: 4.2 },
    original_safety: { overall_route_score: 2.8 },
};

const SAFE_ROUTE_RESPONSE = {
    route: {
        ...BASE_ROUTE,
        id: 'fallback-route',
        steps: [],
        coordinates: [BASE_POSITION],
        distance_kilometers: 5.5,
    },
};

// ─── Store factory ────────────────────────────────────────────────────────────

function makeStore(preloadedLocations: Partial<any> = {}) {
    const store = configureStore({
        reducer: {
            locations: locationsReducer as any,
            user: userReducer,
        },
    });

    if (preloadedLocations.selectedRoute !== undefined) {
        store.dispatch(setSelectedRoute(preloadedLocations.selectedRoute));
    }
    if (preloadedLocations.routeRequest !== undefined) {
        store.dispatch(setRouteRequest(preloadedLocations.routeRequest));
    }

    return store;
}
type TestStore = ReturnType<typeof makeStore>;

function getLocations(store: TestStore) {
    return (store.getState() as any).locations;
}


// ─── Setup ────────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();

beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = mockFetch;
    jest.resetAllMocks();
    mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
            status: 'OK',
            routes: [{
                legs: [{ duration: { value: 900 }, distance: { value: 5200 }, steps: [] }],
                overview_polyline: { points: '' },
            }],
        }),
    });
    mockFunctionsInvoke.mockResolvedValue({ data: SMART_ROUTE_RESPONSE, error: null });
});

afterEach(() => {
    jest.useRealTimers();
});

// ─── Early abort ──────────────────────────────────────────────────────────────

describe('early abort — missing state', () => {
    it('does not set isRerouting when no selectedRoute', async () => {
        const store = makeStore({ selectedRoute: null, routeRequest: BASE_ROUTE_REQUEST });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(getLocations(store).isRerouting).toBe(false);
    });

    it('does not set isRerouting when no routeRequest', async () => {
        const store = makeStore({ selectedRoute: BASE_ROUTE, routeRequest: null });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(getLocations(store).isRerouting).toBe(false);
    });

    it('does not call supabase.functions.invoke when aborting early', async () => {
        const store = makeStore({ selectedRoute: null, routeRequest: null });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });
});

// ─── Smart route success ──────────────────────────────────────────────────────

describe('smart route success', () => {
    beforeEach(() => {
        mockFunctionsInvoke.mockResolvedValue({ data: SMART_ROUTE_RESPONSE, error: null });
    });

    it('calls smart-route-generator edge function', async () => {
        const store = makeStore({ selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(mockFunctionsInvoke).toHaveBeenCalledWith(
            'smart-route-generator',
            expect.any(Object)
        );
    });

    it('updates selectedRoute preserving databaseId and navigationSessionId', async () => {
        const store = makeStore({ selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        const { selectedRoute } = getLocations(store);
        expect(selectedRoute?.databaseId).toBe('db-route-1');
        expect(selectedRoute?.navigationSessionId).toBe('session-001');
    });

    it('updates routeRequest origin to current position', async () => {
        const store = makeStore({ selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST });
        const newPosition = { latitude: 40.76, longitude: -73.99 };
        await store.dispatch(checkForReroute(newPosition) as any);
        expect(getLocations(store).routeRequest?.origin).toEqual(newPosition);
    });

    it('does not call fallback when smart route succeeds', async () => {
        const store = makeStore({ selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
    });

    it('clears isRerouting after setTimeout fires', async () => {
        const store = makeStore({ selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        jest.runAllTimers();
        expect(getLocations(store).isRerouting).toBe(false);
    });
});

// ─── Smart route failure → fallback ──────────────────────────────────────────

describe('smart route failure — fallback to generateSafeRoute', () => {
    it('calls generateSafeRoute fallback when smart route throws generic error', async () => {
        mockFunctionsInvoke.mockResolvedValueOnce({ data: null, error: { message: 'Network error' } });
        const store = makeStore({ selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);

        expect(mockFetch).toHaveBeenCalled();
    });
    it('does NOT call fallback when error contains "No safer alternative available"', async () => {
        mockFunctionsInvoke.mockResolvedValueOnce({
            data: null,
            error: new Error('No safer alternative available'),
        });
        const store = makeStore({ selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
    });
    it('updates selectedRoute with fallback route preserving databaseId', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: null, error: { message: 'Network error' } });
        const store = makeStore({ selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(getLocations(store).selectedRoute?.databaseId).toBe('db-route-1');
    });

    it('clears isRerouting after fallback completes', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: null, error: { message: 'Network error' } });
        const store = makeStore({ selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        jest.runAllTimers();
        expect(getLocations(store).isRerouting).toBe(false);
    });
});