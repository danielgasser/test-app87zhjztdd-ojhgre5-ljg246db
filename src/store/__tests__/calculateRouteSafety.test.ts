import { calculateRouteSafety } from '../locationsSlice';
import {
    setupMocks,
    makeStore,
    getLocations,
    mockFetch,
    mockFunctionsInvoke,
    ROUTE_SAFETY_RESPONSE,
    ML_PREDICTION_RESPONSE,
} from './helpers/testUtils';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    setupMocks();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_PAYLOAD = {
    route_coordinates: [
        { latitude: 40.758, longitude: -73.985 },
        { latitude: 40.750, longitude: -73.980 },
        { latitude: 40.748, longitude: -73.975 },
    ],
    user_demographics: { race_ethnicity: 'Black', gender: 'female' },
};

// ─── Primary path (functions.invoke succeeds) ─────────────────────────────────

describe('primary path — invoke succeeds', () => {
    it('calls functions.invoke with "route-safety-scorer"', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: ROUTE_SAFETY_RESPONSE, error: null });
        const store = makeStore();
        await store.dispatch(calculateRouteSafety(BASE_PAYLOAD) as any);
        expect(mockFunctionsInvoke).toHaveBeenCalledWith(
            'route-safety-scorer',
            expect.any(Object)
        );
    });

    it('sends full payload as body', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: ROUTE_SAFETY_RESPONSE, error: null });
        const store = makeStore();
        await store.dispatch(calculateRouteSafety(BASE_PAYLOAD) as any);
        expect(mockFunctionsInvoke).toHaveBeenCalledWith(
            'route-safety-scorer',
            { body: BASE_PAYLOAD }
        );
    });

    it('stores result in routeSafetyAnalysis', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: ROUTE_SAFETY_RESPONSE, error: null });
        const store = makeStore();
        await store.dispatch(calculateRouteSafety(BASE_PAYLOAD) as any);
        expect(getLocations(store).routeSafetyAnalysis).toEqual(ROUTE_SAFETY_RESPONSE);
    });

    it('sets routeLoading to false after success', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: ROUTE_SAFETY_RESPONSE, error: null });
        const store = makeStore();
        await store.dispatch(calculateRouteSafety(BASE_PAYLOAD) as any);
        expect(getLocations(store).routeLoading).toBe(false);
    });

    it('clears routeError on success', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: ROUTE_SAFETY_RESPONSE, error: null });
        const store = makeStore();
        await store.dispatch(calculateRouteSafety(BASE_PAYLOAD) as any);
        expect(getLocations(store).routeError).toBeNull();
    });

    it('does not call global.fetch on success', async () => {
        mockFunctionsInvoke.mockResolvedValue({ data: ROUTE_SAFETY_RESPONSE, error: null });
        const store = makeStore();
        await store.dispatch(calculateRouteSafety(BASE_PAYLOAD) as any);
        expect(mockFetch).not.toHaveBeenCalled();
    });
});

// ─── Fallback path (functions.invoke fails) ───────────────────────────────────

describe('fallback path — invoke fails', () => {
    beforeEach(() => {
        mockFunctionsInvoke.mockResolvedValue({
            data: null,
            error: { message: 'Edge function error' },
        });
        // Fallback calls safety-predictor per sample point
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ predicted_safety: ML_PREDICTION_RESPONSE.predicted_safety }),
            text: () => Promise.resolve(''),
        });
    });

    it('falls back to fetch(safety-predictor) when invoke fails', async () => {
        const store = makeStore();
        await store.dispatch(calculateRouteSafety(BASE_PAYLOAD) as any);
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/functions/v1/safety-predictor'),
            expect.any(Object)
        );
    });

    it('fallback result has overall_route_score', async () => {
        const store = makeStore();
        await store.dispatch(calculateRouteSafety(BASE_PAYLOAD) as any);
        const analysis = getLocations(store).routeSafetyAnalysis;
        expect(analysis).not.toBeNull();
        expect(typeof analysis?.overall_route_score).toBe('number');
    });

    it('fallback result has safety_notes array', async () => {
        const store = makeStore();
        await store.dispatch(calculateRouteSafety(BASE_PAYLOAD) as any);
        const analysis = getLocations(store).routeSafetyAnalysis;
        expect(Array.isArray(analysis?.safety_notes)).toBe(true);
    });

    it('sets routeLoading to false after fallback', async () => {
        const store = makeStore();
        await store.dispatch(calculateRouteSafety(BASE_PAYLOAD) as any);
        expect(getLocations(store).routeLoading).toBe(false);
    });

    it('thunk fulfills (not rejected) even when invoke fails', async () => {
        const store = makeStore();
        const result = await store.dispatch(calculateRouteSafety(BASE_PAYLOAD) as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
    });
});