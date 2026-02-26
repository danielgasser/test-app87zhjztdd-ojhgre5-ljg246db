import { fetchDangerZones } from '../locationsSlice';
import {
    setupMocks,
    makeStore,
    getLocations,
    mockFetch,
    mockAuthGetSession,
    DANGER_ZONES_RESPONSE,
    MOCK_SESSION,
    BASE_POSITION,
} from './helpers/testUtils';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    setupMocks();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_PARAMS = {
    userId: MOCK_SESSION.user.id,
    latitude: BASE_POSITION.latitude,
    longitude: BASE_POSITION.longitude,
    radius: 10000,
    userDemographics: { race_ethnicity: 'Black', gender: 'female' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetchSuccess(body = DANGER_ZONES_RESPONSE) {
    mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(''),
    });
}

function mockFetchFailure(status = 500, text = 'Internal Server Error') {
    mockFetch.mockResolvedValue({
        ok: false,
        status,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(text),
    });
}

// ─── HTTP request ─────────────────────────────────────────────────────────────

describe('HTTP request', () => {
    it('calls the danger-zones edge function URL', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchDangerZones(BASE_PARAMS) as any);
        expect(mockFetch).toHaveBeenCalledWith(
            'https://mock.supabase.co/functions/v1/danger-zones',
            expect.any(Object)
        );
    });

    it('sends Authorization header with Bearer token', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchDangerZones(BASE_PARAMS) as any);
        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers['Authorization']).toBe(`Bearer ${MOCK_SESSION.access_token}`);
    });

    it('sends correct body fields', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchDangerZones(BASE_PARAMS) as any);
        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.user_id).toBe(BASE_PARAMS.userId);
        expect(body.latitude).toBe(BASE_PARAMS.latitude);
        expect(body.longitude).toBe(BASE_PARAMS.longitude);
        expect(body.user_demographics).toEqual(BASE_PARAMS.userDemographics);
    });

    it('converts radius from meters to miles', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchDangerZones({ ...BASE_PARAMS, radius: 1609.34 }) as any);
        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.radius_miles).toBeCloseTo(1, 5);
    });

    it('passes an AbortSignal to fetch', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchDangerZones(BASE_PARAMS) as any);
        const [, options] = mockFetch.mock.calls[0];
        expect(options.signal).toBeInstanceOf(AbortSignal);
    });
});

// ─── State updates ────────────────────────────────────────────────────────────

describe('state updates', () => {
    it('stores danger_zones array in state on success', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchDangerZones(BASE_PARAMS) as any);
        expect(getLocations(store).dangerZones).toEqual(DANGER_ZONES_RESPONSE.danger_zones);
    });

    it('sets dangerZonesLoading to false after success', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchDangerZones(BASE_PARAMS) as any);
        expect(getLocations(store).dangerZonesLoading).toBe(false);
    });

    it('returns empty array when response has no danger_zones key', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(''),
        });
        const store = makeStore();
        await store.dispatch(fetchDangerZones(BASE_PARAMS) as any);
        expect(getLocations(store).dangerZones).toEqual([]);
    });
});

// ─── Graceful degradation ─────────────────────────────────────────────────────

describe('graceful degradation', () => {
    it('returns empty array when response.ok is false', async () => {
        mockFetchFailure(500, 'Server error');
        const store = makeStore();
        await store.dispatch(fetchDangerZones(BASE_PARAMS) as any);
        expect(getLocations(store).dangerZones).toEqual([]);
    });

    it('sets dangerZonesLoading to false after non-ok response', async () => {
        mockFetchFailure();
        const store = makeStore();
        await store.dispatch(fetchDangerZones(BASE_PARAMS) as any);
        expect(getLocations(store).dangerZonesLoading).toBe(false);
    });

    it('returns empty array on AbortError (timeout)', async () => {
        mockFetch.mockRejectedValue(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        const store = makeStore();
        await store.dispatch(fetchDangerZones(BASE_PARAMS) as any);
        expect(getLocations(store).dangerZones).toEqual([]);
    });

    it('sets dangerZonesLoading to false after AbortError', async () => {
        mockFetch.mockRejectedValue(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        const store = makeStore();
        await store.dispatch(fetchDangerZones(BASE_PARAMS) as any);
        expect(getLocations(store).dangerZonesLoading).toBe(false);
    });

    it('dispatches abort after 10s timeout', async () => {
        jest.useFakeTimers();

        let capturedSignal: AbortSignal | undefined;
        mockFetch.mockImplementation((_url: string, options: RequestInit) => {
            capturedSignal = options.signal as AbortSignal;
            return new Promise(() => { });
        });

        const store = makeStore();
        store.dispatch(fetchDangerZones(BASE_PARAMS) as any);

        // Flush microtasks (Promise resolutions) without advancing timers
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(capturedSignal).toBeInstanceOf(AbortSignal);
        expect(capturedSignal?.aborted).toBe(false);

        jest.advanceTimersByTime(10001);

        expect(capturedSignal?.aborted).toBe(true);

        jest.useRealTimers();
    });
});