jest.unmock('@/services/offlineQueue');
jest.mock('@/services/supabase', () => ({
    supabase: {
        from: jest.fn(),
    },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineQueue } from '../offlineQueue';
import { supabase } from '@/services/supabase';

const mockFrom = supabase.from as jest.Mock;

const QUEUE_KEY = 'offline_review_queue';

const REVIEW_A = { location_id: 'loc-1', title: 'Safe spot' };
const REVIEW_B = { location_id: 'loc-2', title: 'Avoid this' };

function makeQueuedItem(reviewData: any, userId: string, queuedAt: number) {
    return { reviewData, userId, queuedAt };
}

function mockStoredQueue(items: any[]) {
    mockedStorage.getItem.mockResolvedValue(JSON.stringify(items));
}

function mockInsertSuccess() {
    mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'r1' }, error: null }),
            }),
        }),
    });
}

function mockInsertError(message = 'Insert failed') {
    mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message } }),
            }),
        }),
    });
}
beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-23T12:00:00Z'));
    mockedStorage.getItem.mockResolvedValue(null);
    mockedStorage.setItem.mockResolvedValue(undefined);
});

afterEach(() => {
    jest.useRealTimers();
});

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('getAll', () => {
    it('returns empty array when storage is empty', async () => {
        mockedStorage.getItem.mockResolvedValue(null);
        expect(await offlineQueue.getAll()).toEqual([]);
    });

    it('returns parsed queue from storage', async () => {
        const item = makeQueuedItem(REVIEW_A, 'user-1', 1000);
        mockStoredQueue([item]);
        expect(await offlineQueue.getAll()).toEqual([item]);
    });

    it('reads from the correct storage key', async () => {
        await offlineQueue.getAll();
        expect(mockedStorage.getItem).toHaveBeenCalledWith(QUEUE_KEY);
    });
});

// ─── add ─────────────────────────────────────────────────────────────────────

describe('add', () => {
    it('appends to an empty queue', async () => {
        mockedStorage.getItem.mockResolvedValue(null);
        await offlineQueue.add(REVIEW_A, 'user-1');

        const stored = JSON.parse(mockedStorage.setItem.mock.calls[0][1]);
        expect(stored).toHaveLength(1);
        expect(stored[0].reviewData).toEqual(REVIEW_A);
        expect(stored[0].userId).toBe('user-1');
    });

    it('appends to existing queue without replacing it', async () => {
        const existing = makeQueuedItem(REVIEW_A, 'user-1', 1000);
        mockStoredQueue([existing]);

        await offlineQueue.add(REVIEW_B, 'user-2');

        const stored = JSON.parse(mockedStorage.setItem.mock.calls[0][1]);
        expect(stored).toHaveLength(2);
        expect(stored[0].reviewData).toEqual(REVIEW_A); // original preserved
        expect(stored[1].reviewData).toEqual(REVIEW_B); // new appended
    });

    it('stamps queuedAt with current timestamp', async () => {
        const before = Date.now();
        await offlineQueue.add(REVIEW_A, 'user-1');
        const after = Date.now();

        const stored = JSON.parse(mockedStorage.setItem.mock.calls[0][1]);
        expect(stored[0].queuedAt).toBeGreaterThanOrEqual(before);
        expect(stored[0].queuedAt).toBeLessThanOrEqual(after);
    });

    it('writes to the correct storage key', async () => {
        await offlineQueue.add(REVIEW_A, 'user-1');
        expect(mockedStorage.setItem.mock.calls[0][0]).toBe(QUEUE_KEY);
    });
});

// ─── remove ──────────────────────────────────────────────────────────────────

describe('remove', () => {
    it('removes item matching queuedAt', async () => {
        const itemA = makeQueuedItem(REVIEW_A, 'user-1', 1000);
        const itemB = makeQueuedItem(REVIEW_B, 'user-2', 2000);
        mockStoredQueue([itemA, itemB]);

        await offlineQueue.remove(1000);

        const stored = JSON.parse(mockedStorage.setItem.mock.calls[0][1]);
        expect(stored).toHaveLength(1);
        expect(stored[0].queuedAt).toBe(2000);
    });

    it('leaves queue unchanged when queuedAt does not match', async () => {
        const itemA = makeQueuedItem(REVIEW_A, 'user-1', 1000);
        mockStoredQueue([itemA]);

        await offlineQueue.remove(9999);

        const stored = JSON.parse(mockedStorage.setItem.mock.calls[0][1]);
        expect(stored).toHaveLength(1);
    });

    it('results in empty queue when last item is removed', async () => {
        const item = makeQueuedItem(REVIEW_A, 'user-1', 1000);
        mockStoredQueue([item]);

        await offlineQueue.remove(1000);

        const stored = JSON.parse(mockedStorage.setItem.mock.calls[0][1]);
        expect(stored).toHaveLength(0);
    });
});

// ─── count ───────────────────────────────────────────────────────────────────

describe('count', () => {
    it('returns 0 for empty queue', async () => {
        expect(await offlineQueue.count()).toBe(0);
    });

    it('returns correct count', async () => {
        const items = [
            makeQueuedItem(REVIEW_A, 'user-1', 1000),
            makeQueuedItem(REVIEW_B, 'user-2', 2000),
        ];
        mockStoredQueue(items);
        expect(await offlineQueue.count()).toBe(2);
    });
});

// ─── processAll ──────────────────────────────────────────────────────────────

describe('processAll', () => {
    it('returns 0 when queue is empty', async () => {
        expect(await offlineQueue.processAll()).toBe(0);
    });

    it('returns success count when all items sync', async () => {
        const items = [
            makeQueuedItem(REVIEW_A, 'user-1', 1000),
            makeQueuedItem(REVIEW_B, 'user-2', 2000),
        ];
        mockStoredQueue(items);
        mockInsertSuccess();

        const count = await offlineQueue.processAll();
        expect(count).toBe(2);
    });

    it('inserts with merged reviewData and user_id', async () => {
        const item = makeQueuedItem(REVIEW_A, 'user-1', 1000);
        mockStoredQueue([item]);

        const mockInsert = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'r1' }, error: null }),
            }),
        });
        (supabase.from as jest.Mock).mockImplementation(() => ({ insert: mockInsert }));
        mockFrom.mockReturnValue({ insert: mockInsert });

        await offlineQueue.processAll();

        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({ ...REVIEW_A, user_id: 'user-1' })
        );
    });

    it('removes item from queue after successful sync', async () => {
        const item = makeQueuedItem(REVIEW_A, 'user-1', 1000);
        // First getItem call: processAll reads queue
        // Second getItem call: remove() reads queue again
        mockedStorage.getItem
            .mockResolvedValueOnce(JSON.stringify([item])) // processAll → getAll
            .mockResolvedValueOnce(JSON.stringify([item])); // remove → getAll
        mockInsertSuccess();

        await offlineQueue.processAll();

        const removeCall = mockedStorage.setItem.mock.calls[0];
        const storedAfterRemove = JSON.parse(removeCall[1]);
        expect(storedAfterRemove).toHaveLength(0);
    });

    it('does NOT remove item when insert fails', async () => {
        const item = makeQueuedItem(REVIEW_A, 'user-1', 1000);
        mockStoredQueue([item]);
        mockInsertError();

        await offlineQueue.processAll();

        // setItem should never be called (no remove happened)
        expect(mockedStorage.setItem).not.toHaveBeenCalled();
    });

    it('returns 0 when all items fail to sync', async () => {
        const items = [
            makeQueuedItem(REVIEW_A, 'user-1', 1000),
            makeQueuedItem(REVIEW_B, 'user-2', 2000),
        ];
        mockStoredQueue(items);
        mockInsertError();

        expect(await offlineQueue.processAll()).toBe(0);
    });

    it('continues processing remaining items after one fails', async () => {
        const items = [
            makeQueuedItem(REVIEW_A, 'user-1', 1000),
            makeQueuedItem(REVIEW_B, 'user-2', 2000),
        ];
        mockStoredQueue(items);

        // First insert fails, second succeeds
        mockFrom
            (supabase.from as jest.Mock)
            .mockImplementationOnce(() => ({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
                    }),
                }),
            }))
            .mockImplementationOnce(() => ({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: { id: 'r2' }, error: null }),
                    }),
                }),
            }));

        mockedStorage.getItem
            .mockResolvedValueOnce(JSON.stringify(items)) // processAll → getAll
            .mockResolvedValueOnce(JSON.stringify(items)); // remove (second item) → getAll

        const count = await offlineQueue.processAll();
        expect(count).toBe(1);
    });

    it('does not throw when supabase throws unexpectedly', async () => {
        const item = makeQueuedItem(REVIEW_A, 'user-1', 1000);
        mockStoredQueue([item]);

        (supabase.from as jest.Mock).mockImplementation(() => ({
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockRejectedValue(new Error('Network error')),
                }),
            }),
        }));

        await expect(offlineQueue.processAll()).resolves.toBe(0);
    });
});