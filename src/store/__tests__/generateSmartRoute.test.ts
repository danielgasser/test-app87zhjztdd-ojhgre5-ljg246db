import { generateSmartRoute } from '../locationsSlice';
import {
    setupMocks,
    makeStore,
    getLocations,
    mockFunctionsInvoke,
    SMART_ROUTE_RESPONSE,
    BASE_ROUTE_REQUEST,
} from './helpers/testUtils';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    setupMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockSuccess(data = SMART_ROUTE_RESPONSE) {
    mockFunctionsInvoke.mockResolvedValue({ data, error: null });
}

function mockInvokeError(message = 'Edge function error') {
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: { message } });
}

// ─── Request ──────────────────────────────────────────────────────────────────

describe('request', () => {
    it('calls functions.invoke with "smart-route-generator"', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(mockFunctionsInvoke).toHaveBeenCalledWith(
            'smart-route-generator',
            expect.any(Object)
        );
    });

    it('sends origin, destination, heading, user_demographics, route_preferences in body', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(mockFunctionsInvoke).toHaveBeenCalledWith(
            'smart-route-generator',
            {
                body: {
                    origin: BASE_ROUTE_REQUEST.origin,
                    destination: BASE_ROUTE_REQUEST.destination,
                    heading: BASE_ROUTE_REQUEST.heading,
                    user_demographics: BASE_ROUTE_REQUEST.user_demographics,
                    route_preferences: BASE_ROUTE_REQUEST.route_preferences,
                }
            }
        );
    });
});

// ─── Coordinate transformation ────────────────────────────────────────────────

describe('coordinate transformation', () => {
    it('flips [lng, lat] geometry to {latitude, longitude} for optimized route', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        const { selectedRoute } = getLocations(store);
        // SMART_ROUTE_RESPONSE optimized_route.geometry.coordinates[0] = [-73.9855, 40.7580]
        expect(selectedRoute?.coordinates[0]).toEqual({ latitude: 40.7580, longitude: -73.9855 });
    });

    it('flips [lng, lat] geometry to {latitude, longitude} for original route', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        const comparison = getLocations(store).smartRouteComparison;
        expect(comparison?.original_route.coordinates[0]).toEqual({ latitude: 40.7580, longitude: -73.9855 });
    });

    it('calculates estimated_duration_minutes from seconds', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        // SMART_ROUTE_RESPONSE.optimized_route.duration = 900 → 15 minutes
        expect(getLocations(store).selectedRoute?.estimated_duration_minutes).toBe(15);
    });

    it('calculates distance_kilometers from meters', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        // SMART_ROUTE_RESPONSE.optimized_route.distance = 5200 → 5.2 km
        expect(getLocations(store).selectedRoute?.distance_kilometers).toBe(5.2);
    });
});

// ─── Route properties ─────────────────────────────────────────────────────────

describe('route properties', () => {
    it('sets optimized route name to "Smart Safe Route"', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).selectedRoute?.name).toBe('Smart Safe Route');
    });

    it('sets optimized route_type to "safest"', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).selectedRoute?.route_type).toBe('safest');
    });

    it('sets original route name to "Fastest Route"', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).smartRouteComparison?.original_route.name).toBe('Fastest Route');
    });

    it('sets original route_type to "fastest"', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).smartRouteComparison?.original_route.route_type).toBe('fastest');
    });
});

// ─── State updates — success ──────────────────────────────────────────────────

describe('state updates — success', () => {
    it('stores smartRouteComparison with both routes', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        const comparison = getLocations(store).smartRouteComparison;
        expect(comparison?.optimized_route).toBeDefined();
        expect(comparison?.original_route).toBeDefined();
        expect(comparison?.improvement_summary).toEqual(SMART_ROUTE_RESPONSE.improvement_summary);
    });

    it('sets showSmartRouteComparison to true', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).showSmartRouteComparison).toBe(true);
    });

    it('sets selectedRoute to optimized route when not navigating', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).selectedRoute?.name).toBe('Smart Safe Route');
    });

    it('does NOT override selectedRoute when navigationActive is true', async () => {
        mockSuccess();
        const store = makeStore({ locations: { navigationActive: true } });
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        // selectedRoute should remain null (not overridden during navigation)
        expect(getLocations(store).selectedRoute).toBeNull();
    });

    it('sets routeLoading to false after success', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).routeLoading).toBe(false);
    });

    it('clears routeError on success', async () => {
        mockSuccess();
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).routeError).toBeNull();
    });
});

// ─── data.success = false passthrough ────────────────────────────────────────

describe('data.success = false passthrough', () => {
    const NO_IMPROVEMENT_RESPONSE = {
        success: false,
        original_route: {
            geometry: { coordinates: [[-73.9855, 40.7580]] },
            steps: [],
            duration: 1000,
            distance: 5500,
        },
        optimized_route: null,
        improvement_summary: {
            original_safety_score: 4.2,
            optimized_safety_score: 4.2,
            safety_improvement: 0,
            time_added_minutes: 0,
            distance_added_km: 0,
            danger_zones_avoided: 0,
        },
    };

    it('thunk fulfills (does not reject) when success is false', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: NO_IMPROVEMENT_RESPONSE, error: null });
        const store = makeStore();
        const result = await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
    });

    it('sets showSmartRouteComparison to false when no optimized_route', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: NO_IMPROVEMENT_RESPONSE, error: null });
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).showSmartRouteComparison).toBe(false);
    });

    it('sets smartRouteComparison to null when no optimized_route', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: NO_IMPROVEMENT_RESPONSE, error: null });
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).smartRouteComparison).toBeNull();
    });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('error handling', () => {
    it('rejects when invoke returns an error', async () => {
        mockInvokeError('Network error');
        const store = makeStore();
        const result = await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });

    it('sets routeError when invoke fails', async () => {
        mockInvokeError('Network error');
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).routeError).toBeTruthy();
    });

    it('sets routeLoading to false after rejection', async () => {
        mockInvokeError('Network error');
        const store = makeStore();
        await store.dispatch(generateSmartRoute(BASE_ROUTE_REQUEST) as any);
        expect(getLocations(store).routeLoading).toBe(false);
    });
});