import locationsReducer, { fetchMLPredictions } from '../locationsSlice';
import {
    setupMocks,
    makeStore,
    getLocations,
    mockFetch,
    mockAuthGetSession,
    ML_PREDICTION_RESPONSE,
    BASE_USER_PROFILE,
    MOCK_SESSION,
} from './helpers/testUtils';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    setupMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetchSuccess(body = ML_PREDICTION_RESPONSE) {
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
    it('calls the safety-predictor edge function URL', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchMLPredictions('loc-1') as any);
        expect(mockFetch).toHaveBeenCalledWith(
            'https://mock.supabase.co/functions/v1/safety-predictor',
            expect.any(Object)
        );
    });

    it('sends Authorization header with Bearer token', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchMLPredictions('loc-1') as any);
        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers['Authorization']).toBe(`Bearer ${MOCK_SESSION.access_token}`);
    });

    it('sends location_id in body when payload is a string', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchMLPredictions('loc-abc') as any);
        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.location_id).toBe('loc-abc');
        expect(body.latitude).toBeUndefined();
        expect(body.longitude).toBeUndefined();
    });

    it('sends latitude/longitude/google_place_id when payload includes coords', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchMLPredictions({
            locationId: 'place-xyz',
            latitude: 40.758,
            longitude: -73.985,
        }) as any);
        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.latitude).toBe(40.758);
        expect(body.longitude).toBe(-73.985);
        expect(body.google_place_id).toBe('place-xyz');
        expect(body.place_type).toBe('temporary_location');
        expect(body.location_id).toBeUndefined();
    });

    it('sends user demographics from profile state', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchMLPredictions('loc-1') as any);
        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.user_demographics).toEqual({
            race_ethnicity: BASE_USER_PROFILE.race_ethnicity,
            gender: BASE_USER_PROFILE.gender,
            lgbtq_status: BASE_USER_PROFILE.lgbtq_status,
            disability_status: BASE_USER_PROFILE.disability_status,
            religion: BASE_USER_PROFILE.religion,
            age_range: BASE_USER_PROFILE.age_range,
        });
    });

    it('sends user_id from session', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchMLPredictions('loc-1') as any);
        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.user_id).toBe(MOCK_SESSION.user.id);
    });
});

// ─── State updates ────────────────────────────────────────────────────────────

describe('state updates', () => {
    it('stores prediction in mlPredictions keyed by locationId on success', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchMLPredictions('loc-1') as any);
        expect(getLocations(store).mlPredictions['loc-1']).toEqual(ML_PREDICTION_RESPONSE);
    });

    it('sets mlPredictionsLoading to false after success', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchMLPredictions('loc-1') as any);
        expect(getLocations(store).mlPredictionsLoading['loc-1']).toBe(false);
    });

    it('sets mlPredictionsLoading to false after failure', async () => {
        mockFetchFailure();
        const store = makeStore();
        await store.dispatch(fetchMLPredictions('loc-1') as any);
        expect(getLocations(store).mlPredictionsLoading['loc-1']).toBe(false);
    });

    it('uses locationId as key when payload is a coord object', async () => {
        mockFetchSuccess();
        const store = makeStore();
        await store.dispatch(fetchMLPredictions({
            locationId: 'place-xyz',
            latitude: 40.758,
            longitude: -73.985,
        }) as any);
        expect(getLocations(store).mlPredictions['place-xyz']).toEqual(ML_PREDICTION_RESPONSE);
    });
});

// ─── Auth failures ────────────────────────────────────────────────────────────

describe('auth failures', () => {
    it('rejects when session has no user', async () => {
        mockAuthGetSession.mockResolvedValue({
            data: { session: { access_token: 'tok', user: null } },
            error: null,
        });
        const store = makeStore();
        const result = await store.dispatch(fetchMLPredictions('loc-1') as any);
        expect(result.meta.requestStatus).toBe('rejected');
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('rejects when session is null', async () => {
        mockAuthGetSession.mockResolvedValue({
            data: { session: null },
            error: null,
        });
        const store = makeStore();
        const result = await store.dispatch(fetchMLPredictions('loc-1') as any);
        expect(result.meta.requestStatus).toBe('rejected');
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('rejects when user profile is null', async () => {
        const store = makeStore({ user: { profile: null } });
        const result = await store.dispatch(fetchMLPredictions('loc-1') as any);
        expect(result.meta.requestStatus).toBe('rejected');
        expect(mockFetch).not.toHaveBeenCalled();
    });
});

// ─── HTTP error handling ──────────────────────────────────────────────────────

describe('HTTP error handling', () => {
    it('rejects when response.ok is false', async () => {
        mockFetchFailure(500, 'Server error');
        const store = makeStore();
        const result = await store.dispatch(fetchMLPredictions('loc-1') as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });

    it('does not store prediction when response fails', async () => {
        mockFetchFailure();
        const store = makeStore();
        await store.dispatch(fetchMLPredictions('loc-1') as any);
        expect(getLocations(store).mlPredictions['loc-1']).toBeUndefined();
    });
});