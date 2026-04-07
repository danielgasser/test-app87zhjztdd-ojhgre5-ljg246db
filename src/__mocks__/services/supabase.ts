export const supabase = {
    from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
        getSession: jest.fn().mockResolvedValue({
            data: { session: { access_token: 'mock-token' } },
            error: null,
        }),
        getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'mock-user-id' } },
            error: null,
        }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    functions: {
        invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
    }),
};
(supabase as any).__mockId = 'global-mock';
