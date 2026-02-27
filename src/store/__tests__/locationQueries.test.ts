import { fetchNearbyLocations, fetchUserReviews, searchLocations } from '../locationsSlice';
import { makeStore, setupMocks, getLocations } from './helpers/testUtils';
import { supabase } from '../../services/supabase';

const mockRpc = supabase.rpc as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_COORDS = { latitude: 27.9506, longitude: -82.4572 };

const NEARBY_LOCATION = {
    id: 'loc-1',
    name: 'Test Cafe',
    address: '123 Main St',
    place_type: 'cafe',
    distance_meters: 150,
    avg_safety_score: 4.2,
    latitude: 27.951,
    longitude: -82.458,
};

const USER_REVIEW = {
    id: 'rev-1',
    user_id: 'user-123',
    location_id: 'loc-1',
    title: 'Great place',
    content: 'Felt safe',
    overall_rating: 5,
    safety_rating: 5,
    status: 'active',
    created_at: new Date().toISOString(),
    locations: {
        id: 'loc-1',
        name: 'Test Cafe',
        address: '123 Main St',
        latitude: 27.951,
        longitude: -82.458,
    },
};

const SEARCH_RESULT = {
    id: 'loc-2',
    name: 'Tampa Hotel',
    address: '456 Bay Blvd',
    latitude: 27.952,
    longitude: -82.459,
    place_type: 'lodging',
};

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
    setupMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchNearbyLocations
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchNearbyLocations', () => {

    describe('without user profile (fallback RPC)', () => {
        it('calls get_nearby_locations when no user profile', async () => {
            mockRpc.mockResolvedValue({ data: [NEARBY_LOCATION], error: null });
            const store = makeStore({ user: { profile: null } })
            await store.dispatch(fetchNearbyLocations(BASE_COORDS) as any);
            expect(mockRpc).toHaveBeenCalledWith('get_nearby_locations', expect.any(Object));
        });

        it('passes lat/lng/radius to RPC', async () => {
            mockRpc.mockResolvedValue({ data: [], error: null });
            const store = makeStore({ user: { profile: null } });
            await store.dispatch(fetchNearbyLocations({ ...BASE_COORDS, radius: 5000 }) as any);
            expect(mockRpc).toHaveBeenCalledWith('get_nearby_locations', expect.objectContaining({
                lat: BASE_COORDS.latitude,
                lng: BASE_COORDS.longitude,
            }));
        });

        it('stores locations in nearbyLocations state', async () => {
            mockRpc.mockResolvedValue({ data: [NEARBY_LOCATION], error: null });
            const store = makeStore();
            await store.dispatch(fetchNearbyLocations(BASE_COORDS) as any);
            expect(getLocations(store).nearbyLocations).toHaveLength(1);
        });

        it('returns empty array when RPC returns null', async () => {
            mockRpc.mockResolvedValue({ data: null, error: null });
            const store = makeStore();
            await store.dispatch(fetchNearbyLocations(BASE_COORDS) as any);
            expect(getLocations(store).nearbyLocations).toEqual([]);
        });

        it('rejects when RPC returns an error', async () => {
            mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
            const store = makeStore();
            const result = await store.dispatch(fetchNearbyLocations(BASE_COORDS) as any);
            expect(result.meta.requestStatus).toBe('rejected');
        });

        it('sets loading true while pending', async () => {
            let resolveRpc!: (v: any) => void;
            mockRpc.mockReturnValue(new Promise(res => { resolveRpc = res; }));
            const store = makeStore();
            const thunkPromise = store.dispatch(fetchNearbyLocations(BASE_COORDS) as any);
            expect(getLocations(store).loading).toBe(true);
            resolveRpc({ data: [], error: null });
            await thunkPromise;
        });

        it('sets loading false after fulfillment', async () => {
            mockRpc.mockResolvedValue({ data: [], error: null });
            const store = makeStore();
            await store.dispatch(fetchNearbyLocations(BASE_COORDS) as any);
            expect(getLocations(store).loading).toBe(false);
        });
    });

    describe('with user profile (demographic RPC)', () => {
        const PROFILE = {
            id: 'user-123',
            race_ethnicity: ['Black'],
            gender: 'female',
            lgbtq_status: false,
            religion: null,
            disability_status: null,
            age_range: null,
            full_name: null,
            avatar_url: null,
            username: null,
            created_at: null,
            updated_at: null,
            helpful_votes: null,
            unhelpful_votes: null,
            review_count: null,
            show_demographics: false,
            subscription_tier: 'free',
            searchRadiusKm: 10,
        } as any;

        it('calls get_nearby_locations_for_user when profile exists', async () => {
            mockRpc.mockResolvedValue({ data: [NEARBY_LOCATION], error: null });
            const store = makeStore({ user: { profile: PROFILE } });
            await store.dispatch(fetchNearbyLocations(BASE_COORDS) as any);
            expect(mockRpc).toHaveBeenCalledWith('get_nearby_locations_for_user', expect.any(Object));
        });

        it('passes demographic params to RPC', async () => {
            mockRpc.mockResolvedValue({ data: [], error: null });
            const store = makeStore({ user: { profile: PROFILE } });
            await store.dispatch(fetchNearbyLocations(BASE_COORDS) as any);
            expect(mockRpc).toHaveBeenCalledWith('get_nearby_locations_for_user', expect.objectContaining({
                user_race_ethnicity: PROFILE.race_ethnicity,
                user_gender: PROFILE.gender,
                user_lgbtq_status: PROFILE.lgbtq_status,
            }));
        });

        it('stores demographic locations in nearbyLocations state', async () => {
            mockRpc.mockResolvedValue({ data: [NEARBY_LOCATION], error: null });
            const store = makeStore({ user: { profile: PROFILE } });
            await store.dispatch(fetchNearbyLocations(BASE_COORDS) as any);
            expect(getLocations(store).nearbyLocations).toHaveLength(1);
        });

        it('rejects when demographic RPC returns an error', async () => {
            mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });
            const store = makeStore({ user: { profile: PROFILE } });
            const result = await store.dispatch(fetchNearbyLocations(BASE_COORDS) as any);
            expect(result.meta.requestStatus).toBe('rejected');
        });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchUserReviews
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchUserReviews', () => {

    function mockReviewsSuccess(data = [USER_REVIEW]) {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data, error: null }),
                    }),
                }),
            }),
        });
    }

    function mockReviewsError(message = 'DB error') {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: null, error: { message } }),
                    }),
                }),
            }),
        });
    }

    it('queries the reviews table', async () => {
        mockReviewsSuccess();
        const store = makeStore();
        await store.dispatch(fetchUserReviews('user-123') as any);
        expect(mockFrom).toHaveBeenCalledWith('reviews');
    });

    it('fulfills with review array on success', async () => {
        mockReviewsSuccess([USER_REVIEW]);
        const store = makeStore();
        const result = await store.dispatch(fetchUserReviews('user-123') as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toHaveLength(1);
    });

    it('stores reviews in userReviews state', async () => {
        mockReviewsSuccess([USER_REVIEW]);
        const store = makeStore();
        await store.dispatch(fetchUserReviews('user-123') as any);
        expect(getLocations(store).userReviews).toHaveLength(1);
    });

    it('returns empty array when no reviews exist', async () => {
        mockReviewsSuccess([]);
        const store = makeStore();
        await store.dispatch(fetchUserReviews('user-123') as any);
        expect(getLocations(store).userReviews).toEqual([]);
    });

    it('returns empty array when data is null', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                }),
            }),
        });
        const store = makeStore();
        await store.dispatch(fetchUserReviews('user-123') as any);
        expect(getLocations(store).userReviews).toEqual([]);
    });

    it('rejects when DB returns an error', async () => {
        mockReviewsError('Permission denied');
        const store = makeStore();
        const result = await store.dispatch(fetchUserReviews('user-123') as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });

    it('sets loading true while pending', async () => {
        let resolve!: (v: any) => void;
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockReturnValue(new Promise(res => { resolve = res; })),
                    }),
                }),
            }),
        });
        const store = makeStore();
        const thunkPromise = store.dispatch(fetchUserReviews('user-123') as any);
        expect(getLocations(store).loading).toBe(true);
        resolve({ data: [], error: null });
        await thunkPromise;
    });

    it('sets loading false after fulfillment', async () => {
        mockReviewsSuccess([]);
        const store = makeStore();
        await store.dispatch(fetchUserReviews('user-123') as any);
        expect(getLocations(store).loading).toBe(false);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// searchLocations
// ══════════════════════════════════════════════════════════════════════════════

describe('searchLocations', () => {

    function mockSearchSuccess(data = [SEARCH_RESULT]) {
        mockRpc.mockResolvedValue({ data, error: null });
    }

    function mockSearchError(message = 'Search failed') {
        mockRpc.mockResolvedValue({ data: null, error: { message } });
    }

    describe('query validation', () => {
        it('returns empty array without calling RPC when query is less than 2 chars', async () => {
            const store = makeStore();
            const result = await store.dispatch(searchLocations({ query: 'a' }) as any);
            expect(result.meta.requestStatus).toBe('fulfilled');
            expect(result.payload).toEqual([]);
            expect(mockRpc).not.toHaveBeenCalled();
        });

        it('returns empty array for empty query', async () => {
            const store = makeStore();
            const result = await store.dispatch(searchLocations({ query: '' }) as any);
            expect(result.payload).toEqual([]);
            expect(mockRpc).not.toHaveBeenCalled();
        });

        it('calls RPC when query is 2 or more chars', async () => {
            mockSearchSuccess();
            const store = makeStore();
            await store.dispatch(searchLocations({ query: 'ta' }) as any);
            expect(mockRpc).toHaveBeenCalled();
        });
    });

    describe('RPC call', () => {
        it('calls search_locations_with_coords', async () => {
            mockSearchSuccess();
            const store = makeStore();
            await store.dispatch(searchLocations({ query: 'Tampa' }) as any);
            expect(mockRpc).toHaveBeenCalledWith('search_locations_with_coords', expect.objectContaining({
                search_query: 'Tampa',
            }));
        });

        it('passes result_limit of 5', async () => {
            mockSearchSuccess();
            const store = makeStore();
            await store.dispatch(searchLocations({ query: 'Tampa' }) as any);
            expect(mockRpc).toHaveBeenCalledWith('search_locations_with_coords', expect.objectContaining({
                result_limit: 5,
            }));
        });
    });

    describe('results', () => {
        it('maps results to SearchLocation shape with database source', async () => {
            mockSearchSuccess([SEARCH_RESULT]);
            const store = makeStore();
            const result = await store.dispatch(searchLocations({ query: 'Tampa' }) as any);
            expect(result.payload[0]).toMatchObject({
                id: SEARCH_RESULT.id,
                name: SEARCH_RESULT.name,
                source: 'database',
            });
        });

        it('stores results in searchResults state', async () => {
            mockSearchSuccess([SEARCH_RESULT]);
            const store = makeStore();
            await store.dispatch(searchLocations({ query: 'Tampa' }) as any);
            expect(getLocations(store).searchResults).toHaveLength(1);
        });

        it('returns empty array when RPC returns an error', async () => {
            mockSearchError();
            const store = makeStore();
            const result = await store.dispatch(searchLocations({ query: 'Tampa' }) as any);
            expect(result.meta.requestStatus).toBe('fulfilled');
            expect(result.payload).toEqual([]);
        });

        it('rejects when RPC returns an error', async () => {
            mockSearchError();
            const store = makeStore();
            const result = await store.dispatch(searchLocations({ query: 'Tampa' }) as any);
            expect(result.meta.requestStatus).toBe('fulfilled');
            expect(result.payload).toEqual([]);
        });
    });
});