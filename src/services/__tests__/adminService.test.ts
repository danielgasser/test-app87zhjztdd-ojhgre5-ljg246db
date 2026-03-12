jest.mock('@/services/supabase', () => ({
    supabase: { from: jest.fn() },
}));

import { supabase } from '../supabase';
import {
    adminFetchBlockedWords,
    adminAddBlockedWord,
    adminDeleteBlockedWord,
    BlockedWord,
    TestUser,
    adminFetchTestUsers,
    adminAddTestUser,
    adminUpdateTestUserStatus,
    adminDeleteTestUser,
} from '../adminService';

const mockFrom = supabase.from as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── adminFetchBlockedWords ───────────────────────────────────────────────────

describe('adminFetchBlockedWords', () => {
    it('returns list of blocked words', async () => {
        const words: BlockedWord[] = [
            { id: '1', word: 'badword', created_at: '2026-01-01', created_by: 'user-1' },
        ];
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: words, error: null }),
            }),
        });
        expect(await adminFetchBlockedWords()).toEqual(words);
    });

    it('returns empty array when table is empty', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
        });
        expect(await adminFetchBlockedWords()).toEqual([]);
    });

    it('throws on supabase error', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            }),
        });
        await expect(adminFetchBlockedWords()).rejects.toThrow();
    });
});

// ─── adminAddBlockedWord ──────────────────────────────────────────────────────

describe('adminAddBlockedWord', () => {
    it('inserts word and returns the new record', async () => {
        const newWord: BlockedWord = { id: '2', word: 'newbad', created_at: '2026-01-02', created_by: 'user-1' };
        mockFrom.mockReturnValue({
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: newWord, error: null }),
                }),
            }),
        });
        expect(await adminAddBlockedWord('newbad', 'user-1')).toEqual(newWord);
    });

    it('throws on supabase error', async () => {
        mockFrom.mockReturnValue({
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
                }),
            }),
        });
        await expect(adminAddBlockedWord('newbad', 'user-1')).rejects.toThrow();
    });
});

// ─── adminDeleteBlockedWord ───────────────────────────────────────────────────

describe('adminDeleteBlockedWord', () => {
    it('deletes by id without throwing', async () => {
        mockFrom.mockReturnValue({
            delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            }),
        });
        await expect(adminDeleteBlockedWord('1')).resolves.toBeUndefined();
    });

    it('throws on supabase error', async () => {
        mockFrom.mockReturnValue({
            delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
            }),
        });
        await expect(adminDeleteBlockedWord('1')).rejects.toThrow();
    });
});

// ─── adminFetchTestUsers ──────────────────────────────────────────────────────

describe('adminFetchTestUsers', () => {
    it('returns list of test users', async () => {
        const users = [
            { id: '1', email: 'tester@test.com', name: 'Tester', status: 'invited', metadata: null, created_at: '2026-01-01' },
        ];
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: users, error: null }),
            }),
        });
        expect(await adminFetchTestUsers()).toEqual(users);
    });

    it('returns empty array when table is empty', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
        });
        expect(await adminFetchTestUsers()).toEqual([]);
    });

    it('throws on supabase error', async () => {
        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            }),
        });
        await expect(adminFetchTestUsers()).rejects.toThrow();
    });
});

// ─── adminAddTestUser ─────────────────────────────────────────────────────────

describe('adminAddTestUser', () => {
    it('inserts and returns the new test user', async () => {
        const newUser = { id: '2', email: 'new@test.com', name: 'New', status: 'invited', metadata: { source: 'linkedin' }, created_at: '2026-01-02' };
        mockFrom.mockReturnValue({
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: newUser, error: null }),
                }),
            }),
        });
        expect(await adminAddTestUser({ email: 'new@test.com', name: 'New', metadata: { source: 'linkedin' } })).toEqual(newUser);
    });

    it('throws on supabase error', async () => {
        mockFrom.mockReturnValue({
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
                }),
            }),
        });
        await expect(adminAddTestUser({ email: 'fail@test.com' })).rejects.toThrow();
    });
});

// ─── adminUpdateTestUserStatus ────────────────────────────────────────────────

describe('adminUpdateTestUserStatus', () => {
    it('updates status without throwing', async () => {
        mockFrom.mockReturnValue({
            update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            }),
        });
        await expect(adminUpdateTestUserStatus('1', 'signed_up')).resolves.toBeUndefined();
    });

    it('throws on supabase error', async () => {
        mockFrom.mockReturnValue({
            update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
            }),
        });
        await expect(adminUpdateTestUserStatus('1', 'signed_up')).rejects.toThrow();
    });
});

// ─── adminDeleteTestUser ──────────────────────────────────────────────────────

describe('adminDeleteTestUser', () => {
    it('deletes by id without throwing', async () => {
        mockFrom.mockReturnValue({
            delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            }),
        });
        await expect(adminDeleteTestUser('1')).resolves.toBeUndefined();
    });

    it('throws on supabase error', async () => {
        mockFrom.mockReturnValue({
            delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
            }),
        });
        await expect(adminDeleteTestUser('1')).rejects.toThrow();
    });
});