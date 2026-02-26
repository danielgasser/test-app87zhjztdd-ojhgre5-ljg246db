/**
 * Shared test utilities for SafePath store thunk tests.
 *
 * Provides:
 *  - Env setup (Supabase URL, Google Maps key)
 *  - Mock surfaces (global.fetch, supabase.functions.invoke, supabase.auth.getSession)
 *  - Shared fixtures (profile, session, routes, route requests, edge function responses)
 *  - makeStore factory (all 4 reducers, preloadable locations + user state)
 */

import { configureStore } from '@reduxjs/toolkit';
import locationsReducer, {
    setSelectedRoute,
    setRouteRequest,
    startNavigation,
} from '../../locationsSlice';
import userReducer, { setProfile } from '../../userSlice';
import profileBannerReducer from '../../profileBannerSlice';
import premiumPromptReducer from '../../premiumPromptSlice';
import type { UserProfile } from '../../userSlice';
import { supabase } from '../../../services/supabase';

// ─── Env ──────────────────────────────────────────────────────────────────────

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? 'test-key';

// ─── Mock surfaces ────────────────────────────────────────────────────────────
// These reference the jest.fn() instances from the global supabase mock
// (src/__mocks__/services/supabase.ts) so tests can override them per-case.

export const mockFetch = jest.fn();
export const mockFunctionsInvoke = supabase.functions.invoke as jest.Mock;
export const mockAuthGetSession = supabase.auth.getSession as jest.Mock;

// ─── Fixtures — auth ──────────────────────────────────────────────────────────

export const MOCK_SESSION = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: { id: 'user-123', email: 'test@safepath.app' },
};

/**
 * Call in beforeEach to wire all mock surfaces.
 * Resets all mocks first, then restores sensible defaults.
 */
export function setupMocks() {
    global.fetch = mockFetch;
    jest.resetAllMocks();

    // Default: authenticated session
    mockAuthGetSession.mockResolvedValue({
        data: { session: MOCK_SESSION },
        error: null,
    });

    // Default: fetch succeeds (overridable per test)
    mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
    });

    // Default: functions.invoke succeeds (overridable per test)
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: null });
}

// ─── Fixtures — user profile ──────────────────────────────────────────────────

export function buildUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
        id: 'user-123',
        race_ethnicity: ['Black'],
        gender: 'female',
        lgbtq_status: false,
        religion: 'Christian',
        disability_status: ['wheelchair'],
        age_range: '25-34',
        ...overrides,
    } as unknown as UserProfile;
}

export const BASE_USER_PROFILE = buildUserProfile();

// ─── Fixtures — coordinates ───────────────────────────────────────────────────

export const BASE_POSITION = { latitude: 40.7580, longitude: -73.9855 };
export const BASE_DESTINATION = { latitude: 40.7484, longitude: -73.9857 };

// ─── Fixtures — route request ─────────────────────────────────────────────────

export const BASE_ROUTE_REQUEST = {
    origin: BASE_POSITION,
    destination: BASE_DESTINATION,
    heading: undefined,
    user_demographics: {
        race_ethnicity: 'Black',
        gender: 'female',
        lgbtq_status: 'false',
        religion: 'Christian',
        disability_status: 'wheelchair',
        age_range: '25-34',
    },
    route_preferences: {
        prioritize_safety: true, avoid_evening_danger: true,
        max_detour_minutes: 30,
    },
};

// ─── Fixtures — route ─────────────────────────────────────────────────────────

export const BASE_ROUTE = {
    id: 'route-1',
    name: 'Safe Route',
    route_type: 'safest' as const,
    coordinates: [BASE_POSITION],
    route_points: [BASE_POSITION],
    steps: [],
    estimated_duration_minutes: 15,
    distance_kilometers: 5.2,
    safety_analysis: {
        overall_route_score: 4.0,
        overall_confidence: 0.85,
        confidence: 0.85,
        safety_notes: [],
        confidence_score: 0.85,
    },
    created_at: new Date().toISOString(),
    navigationSessionId: 'session-001',
    databaseId: 'db-route-1',
};

// ─── Fixtures — edge function responses ──────────────────────────────────────

export const SMART_ROUTE_RESPONSE = {
    success: true,
    optimized_route: {
        geometry: { coordinates: [[-73.9855, 40.7580], [-73.9857, 40.7484]] },
        steps: [],
        duration: 900,
        distance: 5200,
    },
    original_route: {
        geometry: { coordinates: [[-73.9855, 40.7580]] },
        duration: 1000,
        distance: 5500,
    },
    improvement_summary: {
        original_safety_score: 2.8,
        optimized_safety_score: 4.2,
        safety_improvement: 1.4,
        time_added_minutes: 5,
        distance_added_km: 1.2,
        danger_zones_avoided: 2,
    },
    optimized_safety: { overall_confidence: 0.9, overall_route_score: 4.2 },
    original_safety: { overall_route_score: 2.8 },
};

export const ROUTE_SAFETY_RESPONSE = {
    overall_route_score: 4.2,
    overall_confidence: 0.85,
    confidence: 0.85,
    confidence_score: 0.85,
    segment_scores: [],
    danger_zones_intersected: 0,
    high_risk_segments: 0,
    total_segments: 3,
    safety_summary: { safe_segments: 3, mixed_segments: 0, unsafe_segments: 0 },
    safety_notes: ['This route is generally considered safe'],
    analysis_timestamp: new Date().toISOString(),
    route_summary: 'Safe route',
    risk_factors: [],
};

export const ML_PREDICTION_RESPONSE = {
    predicted_safety: 4.1,
    confidence: 0.78,
    similar_users_count: 12,
    based_on_locations: 5,
    risk_factors: [],
    primary_source: 'demographic_match',
};

export const DANGER_ZONES_RESPONSE = {
    danger_zones: [
        {
            id: 'zone-1',
            location_id: 'loc-1',
            location_name: 'Test Area',
            center_lat: 40.758,
            center_lng: -73.985,
            danger_level: 'medium' as const,
            affected_demographics: ['Black', 'female'],
            polygon_points: [
                { lat: 40.757, lng: -73.984 },
                { lat: 40.759, lng: -73.984 },
                { lat: 40.759, lng: -73.986 },
                { lat: 40.757, lng: -73.986 },
            ],
            reasons: ['Historical incidents reported'],
            time_based: false,
        },
    ],
    total_zones: 1,
    search_radius_miles: 1,
    user_location: BASE_POSITION,
};

export const SIMILAR_USERS_RESPONSE = {
    similar_users: [
        { user_id: 'user-456', similarity_score: 0.92, shared_demographics: ['gender', 'race_ethnicity'] },
        { user_id: 'user-789', similarity_score: 0.81, shared_demographics: ['gender'] },
    ],
    target_user_id: 'user-123',
};

export const GOOGLE_DIRECTIONS_RESPONSE = {
    status: 'OK',
    routes: [{
        legs: [{
            duration: { value: 900 },
            distance: { value: 5200 },
            steps: [],
        }],
        overview_polyline: { points: '' },
    }],
};

// ─── Store factory ────────────────────────────────────────────────────────────

interface PreloadedLocations {
    selectedRoute?: any;
    routeRequest?: any;
    navigationActive?: boolean;
}

interface PreloadedUser {
    profile?: UserProfile | null;
}

interface PreloadedState {
    locations?: PreloadedLocations;
    user?: PreloadedUser;
    navigationActive?: boolean;
}

export function makeStore(preloaded: PreloadedState = {}) {
    const store = configureStore({
        reducer: {
            locations: locationsReducer as any,
            user: userReducer,
            profileBanner: profileBannerReducer,
            premiumPrompt: premiumPromptReducer,
        },
    });

    const { locations = {}, user = {} } = preloaded;

    // Preload locations state
    if (locations.selectedRoute !== undefined) {
        store.dispatch(setSelectedRoute(locations.selectedRoute));
    }
    if (locations.routeRequest !== undefined) {
        store.dispatch(setRouteRequest(locations.routeRequest));
    }
    if (locations.navigationActive !== undefined) {
        store.dispatch(startNavigation());
    }
    // Preload user state
    const profile = user.profile !== undefined ? user.profile : BASE_USER_PROFILE;
    if (profile !== null) {
        store.dispatch(setProfile(profile));
    }

    return store;
}

export type TestStore = ReturnType<typeof makeStore>;

// ─── State selectors ──────────────────────────────────────────────────────────

export function getLocations(store: TestStore) {
    return (store.getState() as any).locations;
}

export function getUser(store: TestStore) {
    return (store.getState() as any).user;
}