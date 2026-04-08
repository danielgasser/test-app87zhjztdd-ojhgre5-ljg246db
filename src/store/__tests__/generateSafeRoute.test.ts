import { generateSafeRoute } from '../locationsSlice';
import {
    setupMocks,
    makeStore,
    mockFetch,
    mockFunctionsInvoke,
    ROUTE_SAFETY_RESPONSE,
    BASE_ROUTE_REQUEST,
} from './helpers/testUtils';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    setupMocks();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GET_ROUTE_RESPONSE = {
    routes: [{
        duration: 900,
        distance: 5200,
        geometry: { coordinates: [[-73.9855, 40.7580], [-73.9857, 40.7484]], type: 'LineString' },
        steps: [],
    }],
};

const GOOGLE_DIRECTIONS_RESPONSE = {
    status: 'OK',
    routes: [{
        legs: [{
            duration: { value: 900 },
            distance: { value: 5200 },
            steps: [],
        }],
        overview_polyline: { points: '' },
    }],
};

function mockDirectFetchSuccess() {
    mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(GOOGLE_DIRECTIONS_RESPONSE),
        text: () => Promise.resolve(''),
    });
}

// ─── getRouteViaEdge — primary routing path ───────────────────────────────────

describe('getRouteViaEdge — primary routing path', () => {
    beforeEach(() => {
        mockFunctionsInvoke
            .mockResolvedValueOnce({ data: GET_ROUTE_RESPONSE, error: null })       // get-route-fallback
            .mockResolvedValueOnce({ data: ROUTE_SAFETY_RESPONSE, error: null });   // route-safety-scorer
    });

    it('calls get-route-fallback edge function', async () => {
        const store = makeStore();
        await store.dispatch(generateSafeRoute(BASE_ROUTE_REQUEST) as any);
        expect(mockFunctionsInvoke).toHaveBeenCalledWith(
            'get-route-fallback',
            expect.any(Object)
        );
    });

    it('does not call fetch when edge route succeeds', async () => {
        const store = makeStore();
        await store.dispatch(generateSafeRoute(BASE_ROUTE_REQUEST) as any);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns a route with correct duration', async () => {
        const store = makeStore();
        const result = await store.dispatch(generateSafeRoute(BASE_ROUTE_REQUEST) as any);
        expect(result.payload.route.estimated_duration_minutes).toBe(15);
    });

    it('returns a route with correct distance', async () => {
        const store = makeStore();
        const result = await store.dispatch(generateSafeRoute(BASE_ROUTE_REQUEST) as any);
        expect(result.payload.route.distance_kilometers).toBe(5.2);
    });

    it('flips coordinates from [lng, lat] to {latitude, longitude}', async () => {
        const store = makeStore();
        const result = await store.dispatch(generateSafeRoute(BASE_ROUTE_REQUEST) as any);
        expect(result.payload.route.coordinates[0]).toEqual({ latitude: 40.7580, longitude: -73.9855 });
    });
});

// ─── getGoogleRoute — client-side fallback ────────────────────────────────────

describe('getGoogleRoute — client-side fallback when edge route fails', () => {
    beforeEach(() => {
        mockFunctionsInvoke
            .mockResolvedValueOnce({ data: null, error: { message: 'Edge unavailable' } })  // get-route-fallback fails
            .mockResolvedValueOnce({ data: ROUTE_SAFETY_RESPONSE, error: null });            // route-safety-scorer
        mockDirectFetchSuccess();
    });

    it('falls back to fetch when get-route-fallback fails', async () => {
        const store = makeStore();
        await store.dispatch(generateSafeRoute(BASE_ROUTE_REQUEST) as any);
        expect(mockFetch).toHaveBeenCalled();
    });

    it('still returns a valid route on fallback', async () => {
        const store = makeStore();
        const result = await store.dispatch(generateSafeRoute(BASE_ROUTE_REQUEST) as any);
        expect(result.payload.route).toBeDefined();
    });
});

// ─── calculateRouteSafety — best-effort ───────────────────────────────────────

describe('calculateRouteSafety — best-effort, never blocks routing', () => {
    beforeEach(() => {
        mockFunctionsInvoke
            .mockResolvedValueOnce({ data: GET_ROUTE_RESPONSE, error: null })
            .mockResolvedValueOnce({ data: null, error: { message: 'Scorer down' } });
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve('Internal Server Error'),
        });
    });

    it('still returns a route when safety analysis fails', async () => {
        const store = makeStore();
        const result = await store.dispatch(generateSafeRoute(BASE_ROUTE_REQUEST) as any);
        expect(result.payload.route).toBeDefined();
    });

    it('thunk fulfills even when all safety scoring fails', async () => {
        const store = makeStore();
        const result = await store.dispatch(generateSafeRoute(BASE_ROUTE_REQUEST) as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
    });
});