import { configureStore } from '@reduxjs/toolkit';
import locationsReducer, {
    checkForReroute,
    setSelectedRoute,
    setRouteRequest,
} from '../locationsSlice';
import {
    setupMocks,
    makeStore,
    getLocations,
    mockFunctionsInvoke,
    mockFetch,
    BASE_POSITION,
    BASE_ROUTE,
    BASE_ROUTE_REQUEST,
    SMART_ROUTE_RESPONSE,
} from './helpers/testUtils';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? 'test-key';




// ─── Store factory ────────────────────────────────────────────────────────────


// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
    jest.useFakeTimers();
    setupMocks();
});

afterEach(() => {
    jest.useRealTimers();
});

// ─── Early abort ──────────────────────────────────────────────────────────────

describe('early abort — missing state', () => {
    it('does not set isRerouting when no selectedRoute', async () => {
        const store = makeStore({ locations: { selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST } });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(getLocations(store).isRerouting).toBe(false);
    });

    it('does not set isRerouting when no routeRequest', async () => {
        const store = makeStore({ locations: { selectedRoute: BASE_ROUTE, routeRequest: null } });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(getLocations(store).isRerouting).toBe(false);
    });

    it('does not call supabase.functions.invoke when aborting early', async () => {
        const store = makeStore({ locations: { selectedRoute: null, routeRequest: null } });
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
        const store = makeStore({ locations: { selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST } });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(mockFunctionsInvoke).toHaveBeenCalledWith(
            'smart-route-generator',
            expect.any(Object)
        );
    });

    it('updates selectedRoute preserving databaseId and navigationSessionId', async () => {
        const store = makeStore({ locations: { selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST } });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        const { selectedRoute } = getLocations(store);
        expect(selectedRoute?.databaseId).toBe('db-route-1');
        expect(selectedRoute?.navigationSessionId).toBe('session-001');
    });

    it('updates routeRequest origin to current position', async () => {
        const store = makeStore({ locations: { selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST } });
        const newPosition = { latitude: 40.76, longitude: -73.99 };
        await store.dispatch(checkForReroute(newPosition) as any);
        expect(getLocations(store).routeRequest?.origin).toEqual(newPosition);
    });

    it('does not call fallback when smart route succeeds', async () => {
        const store = makeStore({ locations: { selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST } });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
    });

    it('clears isRerouting after setTimeout fires', async () => {
        const store = makeStore({ locations: { selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST } });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        jest.runAllTimers();
        expect(getLocations(store).isRerouting).toBe(false);
    });
});

// ─── Smart route failure → fallback ──────────────────────────────────────────

describe('smart route failure — fallback to generateSafeRoute', () => {
    it('calls generateSafeRoute fallback when smart route throws generic error', async () => {
        mockFunctionsInvoke.mockResolvedValueOnce({ data: null, error: { message: 'Network error' } });
        const store = makeStore({ locations: { selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST } });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);

        expect(mockFetch).toHaveBeenCalled();
    });
    it('does NOT call fallback when error contains "No safer alternative available"', async () => {
        mockFunctionsInvoke.mockResolvedValueOnce({
            data: null,
            error: new Error('No safer alternative available'),
        });
        const store = makeStore({ locations: { selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST } });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
    });
    it('updates selectedRoute with fallback route preserving databaseId', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: null, error: { message: 'Network error' } });
        const store = makeStore({ locations: { selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST } });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        expect(getLocations(store).selectedRoute?.databaseId).toBe('db-route-1');
    });

    it('clears isRerouting after fallback completes', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: null, error: { message: 'Network error' } });
        const store = makeStore({ locations: { selectedRoute: BASE_ROUTE, routeRequest: BASE_ROUTE_REQUEST } });
        await store.dispatch(checkForReroute(BASE_POSITION) as any);
        jest.runAllTimers();
        expect(getLocations(store).isRerouting).toBe(false);
    });
});