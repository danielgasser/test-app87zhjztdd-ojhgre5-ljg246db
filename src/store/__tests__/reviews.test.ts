import { submitReview, updateReview } from '../locationsSlice';
import { makeStore, getLocations } from './helpers/testUtils';
import { supabase } from '../../services/supabase';
import NetInfo from '@react-native-community/netinfo';
import { offlineQueue } from '../../services/offlineQueue';

const mockNetInfoFetch = NetInfo.fetch as jest.Mock;
const mockOfflineQueueAdd = offlineQueue.add as jest.Mock;


// ─── Supabase mock helpers ─────────────────────────────────────────────────────

const mockSupabaseFrom = supabase.from as jest.Mock;
const mockGetUser = supabase.auth.getUser as jest.Mock;

function mockOnline() {
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
}

function mockOffline() {
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
}

function mockInsertSuccess(data = { id: 'review-1', title: 'Great place' }) {
    mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data, error: null }),
            }),
        }),
    });
}

function mockInsertError(message = 'Insert failed') {
    mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message } }),
            }),
        }),
    });
}

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_REVIEW_DATA = {
    location_id: 'loc-1',
    title: 'Great place',
    content: 'Felt very safe here',
    overall_rating: 5,
    safety_rating: 5,
    comfort_rating: 4,
    time_of_day: 'afternoon' as const,
    visit_type: 'solo' as const,
    visited_at: new Date().toISOString(),
};

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-123' } } });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: 'mock-token' } }, error: null });
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockOfflineQueueAdd.mockResolvedValue(undefined);
});
// ══════════════════════════════════════════════════════════════════════════════
// submitReview
// ══════════════════════════════════════════════════════════════════════════════

describe('submitReview', () => {

    describe('auth check', () => {
        it('rejects when user is not authenticated', async () => {
            mockGetUser.mockResolvedValue({ data: { user: null } });
            mockOnline();
            const store = makeStore();
            const result = await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            console.log(result.payload, result.meta.requestStatus);
            expect(result.meta.requestStatus).toBe('rejected');
        });
    });

    describe('online path', () => {
        beforeEach(() => mockOnline());

        it('inserts into "reviews" table', async () => {
            mockInsertSuccess();
            const store = makeStore();
            const result = await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            console.log(result.payload, result.meta.requestStatus);
            expect(mockSupabaseFrom).toHaveBeenCalledWith('reviews');
        });

        it('strips time_of_day from DB payload', async () => {
            const insertMock = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: { id: 'r1' }, error: null }),
                }),
            });
            mockSupabaseFrom.mockReturnValue({ insert: insertMock });

            const store = makeStore();
            await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);

            const insertedData = insertMock.mock.calls[0][0];
            expect(insertedData).not.toHaveProperty('time_of_day');
        });

        it('adds user_id to DB payload', async () => {
            const insertMock = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: { id: 'r1' }, error: null }),
                }),
            });
            mockSupabaseFrom.mockReturnValue({ insert: insertMock });

            const store = makeStore();
            await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);

            const insertedData = insertMock.mock.calls[0][0];
            expect(insertedData.user_id).toBe('user-123');
        });

        it('fulfills with review data on success', async () => {
            const reviewData = { id: 'review-1', title: 'Great place' };
            mockInsertSuccess(reviewData);
            const store = makeStore();
            const result = await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            expect(result.meta.requestStatus).toBe('fulfilled');
            expect(result.payload).toEqual(reviewData);
        });

        it('adds review to userReviews state on success', async () => {
            mockInsertSuccess({ id: 'review-1', title: 'Great place' });
            const store = makeStore();
            await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            expect(getLocations(store).userReviews).toHaveLength(1);
        });

        it('rejects when DB insert fails', async () => {
            mockInsertError('Duplicate review');
            const store = makeStore();
            const result = await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            expect(result.meta.requestStatus).toBe('rejected');
        });

        it('does NOT call offlineQueue when online', async () => {
            mockInsertSuccess();
            const store = makeStore();
            await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            expect(mockOfflineQueueAdd).not.toHaveBeenCalled();
        });
    });

    describe('offline path', () => {
        beforeEach(() => mockOffline());

        it('calls offlineQueue.add when offline', async () => {
            const store = makeStore();
            await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            expect(mockOfflineQueueAdd).toHaveBeenCalledTimes(1);
        });

        it('passes user_id to offlineQueue.add', async () => {
            const store = makeStore();
            await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            expect(mockOfflineQueueAdd).toHaveBeenCalledWith(
                expect.any(Object),
                'user-123'
            );
        });

        it('does NOT call supabase insert when offline', async () => {
            const store = makeStore();
            await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            expect(mockSupabaseFrom).not.toHaveBeenCalled();
        });

        it('returns queued: true when offline', async () => {
            const store = makeStore();
            const result = await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            expect(result.payload).toEqual({
                queued: true,
                message: 'Review saved - will sync when online',
            });
        });

        it('fulfills (does not reject) when offline', async () => {
            const store = makeStore();
            const result = await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            expect(result.meta.requestStatus).toBe('fulfilled');
        });

        it('does NOT add to userReviews when queued', async () => {
            const store = makeStore();
            await store.dispatch(submitReview(BASE_REVIEW_DATA) as any);
            expect(getLocations(store).userReviews).toHaveLength(0);
        });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// updateReview
// ══════════════════════════════════════════════════════════════════════════════

describe('updateReview', () => {
    const REVIEW_ID = 'review-abc';

    function mockFetchReview(createdAt: string) {
        mockSupabaseFrom.mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: { created_at: createdAt },
                        error: null,
                    }),
                }),
            }),
        });
    }

    function mockUpdateSuccess(data = { id: REVIEW_ID, title: 'Updated' }) {
        mockSupabaseFrom.mockReturnValueOnce({
            update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data, error: null }),
                    }),
                }),
            }),
        });
    }

    function withinWindow() {
        return new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1 hour ago
    }

    function outsideWindow() {
        return new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
    }

    describe('24-hour edit window', () => {
        it('rejects when review was created more than 24 hours ago', async () => {
            mockFetchReview(outsideWindow());
            const store = makeStore();
            const result = await store.dispatch(
                updateReview({ id: REVIEW_ID, title: 'Updated' }) as any
            );
            expect(result.meta.requestStatus).toBe('rejected');
        });

        it('rejection payload mentions 24 hours', async () => {
            mockFetchReview(outsideWindow());
            const store = makeStore();
            const result = await store.dispatch(
                updateReview({ id: REVIEW_ID, title: 'Updated' }) as any
            );
            expect(result.payload).toContain('24 hours');
        });

        it('does NOT call update when outside edit window', async () => {
            mockFetchReview(outsideWindow());
            const store = makeStore();
            await store.dispatch(updateReview({ id: REVIEW_ID, title: 'Updated' }) as any);
            // Only one call (the fetch), no update call
            expect(mockSupabaseFrom).toHaveBeenCalledTimes(1);
        });

        it('proceeds with update when within 24-hour window', async () => {
            mockFetchReview(withinWindow());
            mockUpdateSuccess();
            const store = makeStore();
            const result = await store.dispatch(
                updateReview({ id: REVIEW_ID, title: 'Updated' }) as any
            );
            expect(result.meta.requestStatus).toBe('fulfilled');
        });
    });

    describe('fetch review errors', () => {
        it('rejects when review is not found', async () => {
            mockSupabaseFrom.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Not found' },
                        }),
                    }),
                }),
            });
            const store = makeStore();
            const result = await store.dispatch(
                updateReview({ id: REVIEW_ID, title: 'Updated' }) as any
            );
            expect(result.meta.requestStatus).toBe('rejected');
        });

        it('rejects when created_at is null', async () => {
            mockSupabaseFrom.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: { created_at: null },
                            error: null,
                        }),
                    }),
                }),
            });
            const store = makeStore();
            const result = await store.dispatch(
                updateReview({ id: REVIEW_ID, title: 'Updated' }) as any
            );
            expect(result.meta.requestStatus).toBe('rejected');
        });
    });

    describe('successful update', () => {
        it('updates the review in userReviews state', async () => {
            mockFetchReview(withinWindow());
            mockUpdateSuccess({ id: REVIEW_ID, title: 'Updated title' });

            // Pre-populate userReviews via submitReview state shape
            const store = makeStore();
            // Manually push a review into state first via a fulfilled action
            // by dispatching to get state with existing review
            const existingReview = { id: REVIEW_ID, title: 'Original' };
            store.dispatch({
                type: 'locations/submitReview/fulfilled',
                payload: existingReview,
            });

            await store.dispatch(updateReview({ id: REVIEW_ID, title: 'Updated title' }) as any);

            const reviews = getLocations(store).userReviews;
            const updated = reviews.find((r: any) => r.id === REVIEW_ID);
            expect(updated?.title).toBe('Updated title');
        });

        it('fulfills with updated review data', async () => {
            mockFetchReview(withinWindow());
            const updatedData = { id: REVIEW_ID, title: 'Updated title' };
            mockUpdateSuccess(updatedData);
            const store = makeStore();
            const result = await store.dispatch(
                updateReview({ id: REVIEW_ID, title: 'Updated title' }) as any
            );
            expect(result.payload).toEqual(updatedData);
        });
    });
});