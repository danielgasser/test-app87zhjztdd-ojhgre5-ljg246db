import { saveRouteToDatabase } from '../locationsSlice';
import { makeStore, setupMocks } from './helpers/testUtils';
import { supabase } from '../../services/supabase';

const mockFrom = supabase.from as jest.Mock;
const mockGetUser = supabase.auth.getUser as jest.Mock;

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_ROUTE = {
    route_coordinates: [
        { latitude: 27.9506, longitude: -82.4572 },
        { latitude: 27.9550, longitude: -82.4600 },
    ],
    origin_name: 'Home',
    destination_name: 'Work',
    distance_km: 5.2,
    duration_minutes: 12,
    safety_score: 4.1,
    navigation_session_id: 'session-abc-123',
};

const DB_ROUTE = {
    id: 'route-1',
    user_id: 'user-123',
    ...BASE_ROUTE,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockInsertSuccess(data = DB_ROUTE) {
    mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data, error: null }),
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

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    setupMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
});

// ══════════════════════════════════════════════════════════════════════════════
// saveRouteToDatabase
// ══════════════════════════════════════════════════════════════════════════════

describe('saveRouteToDatabase', () => {

    describe('auth check', () => {
        it('rejects when user is not authenticated', async () => {
            mockGetUser.mockResolvedValue({ data: { user: null } });
            const store = makeStore();
            const result = await store.dispatch(saveRouteToDatabase(BASE_ROUTE) as any);
            expect(result.meta.requestStatus).toBe('rejected');
        });

        it('rejection payload mentions authentication', async () => {
            mockGetUser.mockResolvedValue({ data: { user: null } });
            const store = makeStore();
            const result = await store.dispatch(saveRouteToDatabase(BASE_ROUTE) as any);
            expect(result.payload).toMatch(/authenticated/i);
        });
    });

    describe('DB insert', () => {
        it('inserts into the routes table', async () => {
            mockInsertSuccess();
            const store = makeStore();
            await store.dispatch(saveRouteToDatabase(BASE_ROUTE) as any);
            expect(mockFrom).toHaveBeenCalledWith('routes');
        });

        it('includes user_id in the insert payload', async () => {
            const insertMock = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: DB_ROUTE, error: null }),
                }),
            });
            mockFrom.mockReturnValue({ insert: insertMock });
            const store = makeStore();
            await store.dispatch(saveRouteToDatabase(BASE_ROUTE) as any);
            expect(insertMock).toHaveBeenCalledWith(
                expect.objectContaining({ user_id: 'user-123' })
            );
        });

        it('includes route_coordinates in the insert payload', async () => {
            const insertMock = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: DB_ROUTE, error: null }),
                }),
            });
            mockFrom.mockReturnValue({ insert: insertMock });
            const store = makeStore();
            await store.dispatch(saveRouteToDatabase(BASE_ROUTE) as any);
            expect(insertMock).toHaveBeenCalledWith(
                expect.objectContaining({ route_coordinates: BASE_ROUTE.route_coordinates })
            );
        });

        it('includes navigation_session_id in the insert payload', async () => {
            const insertMock = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: DB_ROUTE, error: null }),
                }),
            });
            mockFrom.mockReturnValue({ insert: insertMock });
            const store = makeStore();
            await store.dispatch(saveRouteToDatabase(BASE_ROUTE) as any);
            expect(insertMock).toHaveBeenCalledWith(
                expect.objectContaining({ navigation_session_id: BASE_ROUTE.navigation_session_id })
            );
        });

        it('sets steps to null when not provided', async () => {
            const insertMock = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: DB_ROUTE, error: null }),
                }),
            });
            mockFrom.mockReturnValue({ insert: insertMock });
            const store = makeStore();
            const { steps, ...routeWithoutSteps } = BASE_ROUTE as any;
            await store.dispatch(saveRouteToDatabase(routeWithoutSteps) as any);
            expect(insertMock).toHaveBeenCalledWith(
                expect.objectContaining({ steps: null })
            );
        });

        it('includes steps when provided', async () => {
            const steps = [{ instruction: 'Turn left', distance_meters: 100 }];
            const insertMock = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: DB_ROUTE, error: null }),
                }),
            });
            mockFrom.mockReturnValue({ insert: insertMock });
            const store = makeStore();
            await store.dispatch(saveRouteToDatabase({ ...BASE_ROUTE, steps } as any) as any);
            expect(insertMock).toHaveBeenCalledWith(
                expect.objectContaining({ steps })
            );
        });
    });

    describe('success', () => {
        it('fulfills with the saved route data', async () => {
            mockInsertSuccess(DB_ROUTE);
            const store = makeStore();
            const result = await store.dispatch(saveRouteToDatabase(BASE_ROUTE) as any);
            expect(result.meta.requestStatus).toBe('fulfilled');
            expect(result.payload).toEqual(DB_ROUTE);
        });

        it('fulfills with correct id', async () => {
            mockInsertSuccess(DB_ROUTE);
            const store = makeStore();
            const result = await store.dispatch(saveRouteToDatabase(BASE_ROUTE) as any);
            expect(result.payload.id).toBe('route-1');
        });
    });

    describe('failure', () => {
        it('rejects when DB insert fails', async () => {
            mockInsertError('Duplicate key');
            const store = makeStore();
            const result = await store.dispatch(saveRouteToDatabase(BASE_ROUTE) as any);
            expect(result.meta.requestStatus).toBe('rejected');
        });

        it('rejectWithValue contains the error message', async () => {
            mockInsertError('Permission denied');
            const store = makeStore();
            const result = await store.dispatch(saveRouteToDatabase(BASE_ROUTE) as any);
            expect(result.payload).toBe('Failed to save route');
        });
    });
});