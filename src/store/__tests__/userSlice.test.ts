import {
    fetchUserProfile,
    updateUserProfile,
    fetchUserVoteStats,
    fetchPublicUserProfile,
    fetchPublicUserReviews,
    updateSearchRadius,
    setProfile,
    setOnboardingComplete,
    clearError,
} from '../userSlice';
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../userSlice';
import { supabase } from '../../services/supabase';
import { APP_CONFIG } from '@/config/appConfig';

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;

const makeStore = () => configureStore({ reducer: { user: userReducer } });
const getUser = (store: ReturnType<typeof makeStore>) => store.getState().user;

const USER_ID = 'user-123';

const MOCK_PROFILE = {
    id: USER_ID,
    full_name: 'Test User',
    race_ethnicity: ['Black'],
    gender: 'female',
    lgbtq_status: false,
    religion: 'Christian',
    disability_status: ['none'],
    age_range: '25-34',
    subscription_tier: 'free',
    preferences: null,
    notification_preferences: null,
};

const MOCK_PUBLIC_PROFILE = {
    id: USER_ID,
    full_name: 'Test User',
    bio: 'Traveler',
    review_count: 5,
    helpful_votes: 10,
};

const MOCK_PUBLIC_REVIEW = {
    id: 'review-1',
    location_name: 'Test Location',
    safety_rating: 4,
    comment: 'Great place',
    created_at: '2025-01-01T00:00:00Z',
};

const MOCK_VOTE_STATS = {
    helpful_votes_given: 3,
    unhelpful_votes_given: 1,
    total_votes_given: 4,
};

function mockFromSingle(result: { data: any; error: any }) {
    mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue(result),
            }),
        }),
    });
}

beforeEach(() => {
    jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// Synchronous reducers
// ══════════════════════════════════════════════════════════════════════════════

describe('synchronous reducers', () => {
    describe('setProfile', () => {
        it('sets the profile in state', () => {
            const store = makeStore();
            store.dispatch(setProfile(MOCK_PROFILE as any));
            expect(getUser(store).profile).toEqual(MOCK_PROFILE);
        });

        it('clears the profile when null is dispatched', () => {
            const store = makeStore();
            store.dispatch(setProfile(MOCK_PROFILE as any));
            store.dispatch(setProfile(null));
            expect(getUser(store).profile).toBeNull();
        });
    });

    describe('setOnboardingComplete', () => {
        it('sets onboardingComplete to true', () => {
            const store = makeStore();
            store.dispatch(setOnboardingComplete(true));
            expect(getUser(store).onboardingComplete).toBe(true);
        });

        it('sets onboardingComplete to false', () => {
            const store = makeStore();
            store.dispatch(setOnboardingComplete(true));
            store.dispatch(setOnboardingComplete(false));
            expect(getUser(store).onboardingComplete).toBe(false);
        });
    });

    describe('clearError', () => {
        it('clears the error field', () => {
            const store = makeStore();
            store.dispatch({ type: 'user/fetchProfile/rejected', error: { message: 'oops' } });
            expect(getUser(store).error).toBe('oops');
            store.dispatch(clearError());
            expect(getUser(store).error).toBeNull();
        });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchUserProfile
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchUserProfile', () => {
    it('queries user_profiles table', async () => {
        mockFromSingle({ data: MOCK_PROFILE, error: null });
        const store = makeStore();
        await store.dispatch(fetchUserProfile(USER_ID) as any);
        expect(mockFrom).toHaveBeenCalledWith('user_profiles');
    });

    it('stores profile in state on success', async () => {
        mockFromSingle({ data: MOCK_PROFILE, error: null });
        const store = makeStore();
        await store.dispatch(fetchUserProfile(USER_ID) as any);
        expect(getUser(store).profile).toMatchObject({ id: USER_ID });
    });

    it('sets onboardingComplete true when mandatory fields are filled', async () => {
        mockFromSingle({ data: MOCK_PROFILE, error: null });
        const store = makeStore();
        await store.dispatch(fetchUserProfile(USER_ID) as any);
        expect(getUser(store).onboardingComplete).toBe(true);
    });

    it('sets onboardingComplete false when mandatory fields are missing', async () => {
        const incomplete = { ...MOCK_PROFILE, gender: '', race_ethnicity: [] };
        mockFromSingle({ data: incomplete, error: null });
        const store = makeStore();
        await store.dispatch(fetchUserProfile(USER_ID) as any);
        expect(getUser(store).onboardingComplete).toBe(false);
    });

    it('fulfills with null on PGRST116 (no rows found)', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116', message: 'No rows' },
                    }),
                }),
            }),
        });
        const store = makeStore();
        const result = await store.dispatch(fetchUserProfile(USER_ID) as any);
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toBeNull();
        expect(getUser(store).profile).toBeNull();
    });

    it('rejects on non-PGRST116 DB error', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { code: '500', message: 'Server error' },
                    }),
                }),
            }),
        });
        const store = makeStore();
        const result = await store.dispatch(fetchUserProfile(USER_ID) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });

    it('applies searchRadiusKm from preferences when present', async () => {
        const profileWithRadius = { ...MOCK_PROFILE, preferences: { search: { radius_km: 25 } } };
        mockFromSingle({ data: profileWithRadius, error: null });
        const store = makeStore();
        await store.dispatch(fetchUserProfile(USER_ID) as any);
        expect(getUser(store).searchRadiusKm).toBe(25);
    });

    it('uses default searchRadiusKm when preferences absent', async () => {
        mockFromSingle({ data: MOCK_PROFILE, error: null });
        const store = makeStore();
        await store.dispatch(fetchUserProfile(USER_ID) as any);
        const defaultKm = APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS / 1000;
        expect(getUser(store).searchRadiusKm).toBe(defaultKm);
    });

    it('sets loading to false after success', async () => {
        mockFromSingle({ data: MOCK_PROFILE, error: null });
        const store = makeStore();
        await store.dispatch(fetchUserProfile(USER_ID) as any);
        expect(getUser(store).loading).toBe(false);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// updateUserProfile
// ══════════════════════════════════════════════════════════════════════════════

describe('updateUserProfile — update path (profile exists)', () => {
    function mockUpdateSuccess(data = MOCK_PROFILE) {
        mockFrom
            .mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: { id: USER_ID }, error: null }),
                    }),
                }),
            })
            .mockReturnValueOnce({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data, error: null }),
                        }),
                    }),
                }),
            });
    }

    it('calls update when profile exists', async () => {
        const updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
                }),
            }),
        });
        mockFrom
            .mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: { id: USER_ID }, error: null }),
                    }),
                }),
            })
            .mockReturnValueOnce({ update: updateMock });

        const store = makeStore();
        await store.dispatch(updateUserProfile({ userId: USER_ID, profileData: { gender: 'male' } }) as any);
        expect(updateMock).toHaveBeenCalled();
    });

    it('stores updated profile in state', async () => {
        mockUpdateSuccess();
        const store = makeStore();
        await store.dispatch(updateUserProfile({ userId: USER_ID, profileData: {} }) as any);
        expect(getUser(store).profile).toMatchObject({ id: USER_ID });
    });

    it('sets loading to false after success', async () => {
        mockUpdateSuccess();
        const store = makeStore();
        await store.dispatch(updateUserProfile({ userId: USER_ID, profileData: {} }) as any);
        expect(getUser(store).loading).toBe(false);
    });
});

describe('updateUserProfile — create path (profile does not exist)', () => {
    it('calls insert when profile does not exist', async () => {
        const insertMock = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
            }),
        });
        mockFrom
            .mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                }),
            })
            .mockReturnValueOnce({ insert: insertMock });

        const store = makeStore();
        await store.dispatch(updateUserProfile({ userId: USER_ID, profileData: { gender: 'male' } }) as any);
        expect(insertMock).toHaveBeenCalled();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchUserVoteStats
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchUserVoteStats', () => {
    it('calls rpc get_user_vote_stats with user id', async () => {
        mockRpc.mockResolvedValue({ data: [MOCK_VOTE_STATS], error: null });
        const store = makeStore();
        await store.dispatch(fetchUserVoteStats(USER_ID) as any);
        expect(mockRpc).toHaveBeenCalledWith('get_user_vote_stats', { p_user_id: USER_ID });
    });

    it('stores vote stats on success', async () => {
        mockRpc.mockResolvedValue({ data: [MOCK_VOTE_STATS], error: null });
        const store = makeStore();
        await store.dispatch(fetchUserVoteStats(USER_ID) as any);
        expect(getUser(store).voteStats).toEqual(MOCK_VOTE_STATS);
    });

    it('returns zero stats when rpc returns empty array', async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });
        const store = makeStore();
        const result = await store.dispatch(fetchUserVoteStats(USER_ID) as any);
        expect(result.payload).toEqual({
            helpful_votes_given: 0,
            unhelpful_votes_given: 0,
            total_votes_given: 0,
        });
    });

    it('returns zero stats when data is null', async () => {
        mockRpc.mockResolvedValue({ data: null, error: null });
        const store = makeStore();
        const result = await store.dispatch(fetchUserVoteStats(USER_ID) as any);
        expect(result.payload).toEqual({
            helpful_votes_given: 0,
            unhelpful_votes_given: 0,
            total_votes_given: 0,
        });
    });

    it('sets voteStatsLoading to false after success', async () => {
        mockRpc.mockResolvedValue({ data: [MOCK_VOTE_STATS], error: null });
        const store = makeStore();
        await store.dispatch(fetchUserVoteStats(USER_ID) as any);
        expect(getUser(store).voteStatsLoading).toBe(false);
    });

    it('sets voteStatsLoading to false on error', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
        const store = makeStore();
        await store.dispatch(fetchUserVoteStats(USER_ID) as any);
        expect(getUser(store).voteStatsLoading).toBe(false);
    });

    it('rejects on DB error', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
        const store = makeStore();
        const result = await store.dispatch(fetchUserVoteStats(USER_ID) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchPublicUserProfile
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchPublicUserProfile', () => {
    it('calls rpc get_user_public_profile with user id', async () => {
        mockRpc.mockResolvedValue({ data: [MOCK_PUBLIC_PROFILE], error: null });
        const store = makeStore();
        await store.dispatch(fetchPublicUserProfile(USER_ID) as any);
        expect(mockRpc).toHaveBeenCalledWith('get_user_public_profile', { profile_user_id: USER_ID });
    });

    it('stores public profile on success', async () => {
        mockRpc.mockResolvedValue({ data: [MOCK_PUBLIC_PROFILE], error: null });
        const store = makeStore();
        await store.dispatch(fetchPublicUserProfile(USER_ID) as any);
        expect(getUser(store).publicProfile).toEqual(MOCK_PUBLIC_PROFILE);
    });

    it('sets publicProfileLoading to false after success', async () => {
        mockRpc.mockResolvedValue({ data: [MOCK_PUBLIC_PROFILE], error: null });
        const store = makeStore();
        await store.dispatch(fetchPublicUserProfile(USER_ID) as any);
        expect(getUser(store).publicProfileLoading).toBe(false);
    });

    it('rejects when rpc returns empty array', async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });
        const store = makeStore();
        const result = await store.dispatch(fetchPublicUserProfile(USER_ID) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });

    it('rejects on DB error and stores error message', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } });
        const store = makeStore();
        const result = await store.dispatch(fetchPublicUserProfile(USER_ID) as any);
        expect(result.meta.requestStatus).toBe('rejected');
        expect(getUser(store).publicProfileError).toBeTruthy();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// fetchPublicUserReviews
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchPublicUserReviews', () => {
    it('calls rpc get_user_public_reviews with user id', async () => {
        mockRpc.mockResolvedValue({ data: [MOCK_PUBLIC_REVIEW], error: null });
        const store = makeStore();
        await store.dispatch(fetchPublicUserReviews(USER_ID) as any);
        expect(mockRpc).toHaveBeenCalledWith('get_user_public_reviews', {
            profile_user_id: USER_ID,
            review_limit: 10,
        });
    });

    it('stores reviews on success', async () => {
        mockRpc.mockResolvedValue({ data: [MOCK_PUBLIC_REVIEW], error: null });
        const store = makeStore();
        await store.dispatch(fetchPublicUserReviews(USER_ID) as any);
        expect(getUser(store).publicReviews).toHaveLength(1);
        expect(getUser(store).publicReviews[0]).toEqual(MOCK_PUBLIC_REVIEW);
    });

    it('stores empty array when data is null', async () => {
        mockRpc.mockResolvedValue({ data: null, error: null });
        const store = makeStore();
        await store.dispatch(fetchPublicUserReviews(USER_ID) as any);
        expect(getUser(store).publicReviews).toEqual([]);
    });

    it('sets publicReviews to empty array on rejection', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: 'Error' } });
        const store = makeStore();
        await store.dispatch(fetchPublicUserReviews(USER_ID) as any);
        expect(getUser(store).publicReviews).toEqual([]);
    });

    it('rejects on DB error', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: 'Error' } });
        const store = makeStore();
        const result = await store.dispatch(fetchPublicUserReviews(USER_ID) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// updateSearchRadius
// ══════════════════════════════════════════════════════════════════════════════

describe('updateSearchRadius', () => {
    const MIN = APP_CONFIG.DISTANCE.MIN_SEARCH_RADIUS_KM;
    const MAX = APP_CONFIG.DISTANCE.MAX_SEARCH_RADIUS_KM;

    function mockRadiusSuccess(returnedProfile = MOCK_PROFILE) {
        mockFrom
            .mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: { preferences: null },
                            error: null,
                        }),
                    }),
                }),
            })
            .mockReturnValueOnce({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: returnedProfile, error: null }),
                        }),
                    }),
                }),
            });
    }

    it('updates the user_profiles table', async () => {
        mockRadiusSuccess();
        const store = makeStore();
        await store.dispatch(updateSearchRadius({ userId: USER_ID, radiusKm: 10 }) as any);
        expect(mockFrom).toHaveBeenCalledWith('user_profiles');
    });

    it('clamps radius to MIN when below minimum', async () => {
        const updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
                }),
            }),
        });
        mockFrom
            .mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: { preferences: null }, error: null }),
                    }),
                }),
            })
            .mockReturnValueOnce({ update: updateMock });

        await makeStore().dispatch(updateSearchRadius({ userId: USER_ID, radiusKm: MIN - 100 }) as any);
        const prefs = updateMock.mock.calls[0][0].preferences;
        expect(prefs.search.radius_km).toBe(MIN);
    });

    it('clamps radius to MAX when above maximum', async () => {
        const updateMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
                }),
            }),
        });
        mockFrom
            .mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: { preferences: null }, error: null }),
                    }),
                }),
            })
            .mockReturnValueOnce({ update: updateMock });

        await makeStore().dispatch(updateSearchRadius({ userId: USER_ID, radiusKm: MAX + 100 }) as any);
        const prefs = updateMock.mock.calls[0][0].preferences;
        expect(prefs.search.radius_km).toBe(MAX);
    });

    it('updates searchRadiusKm in state from returned profile preferences', async () => {
        const profileWithRadius = { ...MOCK_PROFILE, preferences: { search: { radius_km: 15 } } } as any;
        mockRadiusSuccess(profileWithRadius);
        const store = makeStore();
        await store.dispatch(updateSearchRadius({ userId: USER_ID, radiusKm: 15 }) as any);
        expect(getUser(store).searchRadiusKm).toBe(15);
    });

    it('rejects on DB fetch error', async () => {
        mockFrom.mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
                }),
            }),
        });
        const result = await makeStore().dispatch(updateSearchRadius({ userId: USER_ID, radiusKm: 10 }) as any);
        expect(result.meta.requestStatus).toBe('rejected');
    });
});