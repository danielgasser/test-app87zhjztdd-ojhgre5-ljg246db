import locationsReducer, {
    setSelectedRoute,
    setRouteRequest,
    clearRoutes,
    toggleRouteSegments,
    setSelectedSegment,
    updateRoutePreferences,
    setSmartRouteComparison,
    toggleSmartRouteComparison,
    startNavigation,
    SafeRoute,
    RouteRequest,
    SmartRouteComparison,
} from '../locationsSlice';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const buildSafetyAnalysis = (score = 4.0) => ({
    overall_route_score: score,
    safety_notes: [],
    confidence_score: null,
});

const buildSafeRoute = (overrides: Partial<SafeRoute> = {}): SafeRoute => ({
    id: 'route-1',
    name: 'Safe Route',
    route_type: 'safest',
    coordinates: [{ latitude: 40.7, longitude: -74.0 }],
    estimated_duration_minutes: 15,
    distance_kilometers: 5.2,
    safety_analysis: buildSafetyAnalysis(),
    created_at: new Date().toISOString(),
    navigationSessionId: 'session-001',
    ...overrides,
});

const buildRouteRequest = (overrides: Partial<RouteRequest> = {}): RouteRequest => ({
    origin: { latitude: 40.7, longitude: -74.0 },
    destination: { latitude: 40.8, longitude: -74.1 },
    user_demographics: {
        race_ethnicity: 'black',
        gender: 'female',
        lgbtq_status: 'false',
        religion: 'none',
        disability_status: 'none',
        age_range: '25-34',
    },
    route_preferences: {
        prioritize_safety: true,
        avoid_evening_danger: true,
        max_detour_minutes: 30,
    },
    ...overrides,
});

const buildSmartRouteComparison = (): SmartRouteComparison => ({
    original_route: buildSafeRoute({ id: 'original', name: 'Fastest Route', route_type: 'fastest' }),
    optimized_route: buildSafeRoute({ id: 'optimized', name: 'Safe Route', route_type: 'safest' }),
    improvement_summary: {
        original_safety_score: 2.8,
        optimized_safety_score: 4.2,
        safety_improvement: 1.4,
        time_added_minutes: 5,
        distance_added_km: 1.2,
        danger_zones_avoided: 2,
    },
    waypoints_added: [],
    message: 'Safer route found avoiding 2 danger zones',
});

const initialState = locationsReducer(undefined, { type: '@@INIT' });

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial route state', () => {
    it('routes is empty array', () => {
        expect(initialState.routes).toEqual([]);
    });

    it('selectedRoute is null', () => {
        expect(initialState.selectedRoute).toBeNull();
    });

    it('routeRequest is null', () => {
        expect(initialState.routeRequest).toBeNull();
    });

    it('routeLoading is false', () => {
        expect(initialState.routeLoading).toBe(false);
    });

    it('routeError is null', () => {
        expect(initialState.routeError).toBeNull();
    });

    it('showRouteSegments is false', () => {
        expect(initialState.showRouteSegments).toBe(false);
    });

    it('selectedSegment is null', () => {
        expect(initialState.selectedSegment).toBeNull();
    });

    it('smartRouteComparison is null', () => {
        expect(initialState.smartRouteComparison).toBeNull();
    });

    it('showSmartRouteComparison is false', () => {
        expect(initialState.showSmartRouteComparison).toBe(false);
    });

    it('routePreferences has correct defaults', () => {
        expect(initialState.routePreferences).toEqual({
            avoidEveningDanger: true,
            maxDetourMinutes: 3600,
        });
    });
});

// ─── setSelectedRoute ─────────────────────────────────────────────────────────

describe('setSelectedRoute', () => {
    it('sets a route', () => {
        const route = buildSafeRoute();
        const state = locationsReducer(initialState, setSelectedRoute(route));
        expect(state.selectedRoute).toEqual(route);
    });

    it('sets route to null (clear)', () => {
        const withRoute = locationsReducer(initialState, setSelectedRoute(buildSafeRoute()));
        const state = locationsReducer(withRoute, setSelectedRoute(null));
        expect(state.selectedRoute).toBeNull();
    });

    it('overwrites previous route', () => {
        const first = buildSafeRoute({ id: 'route-1' });
        const second = buildSafeRoute({ id: 'route-2' });
        let state = locationsReducer(initialState, setSelectedRoute(first));
        state = locationsReducer(state, setSelectedRoute(second));
        expect(state.selectedRoute?.id).toBe('route-2');
    });

    it('preserves all route fields', () => {
        const route = buildSafeRoute({
            name: 'Caution Advised Route',
            route_type: 'fastest',
            distance_kilometers: 12.5,
            estimated_duration_minutes: 25,
        });
        const state = locationsReducer(initialState, setSelectedRoute(route));
        expect(state.selectedRoute?.name).toBe('Caution Advised Route');
        expect(state.selectedRoute?.route_type).toBe('fastest');
        expect(state.selectedRoute?.distance_kilometers).toBe(12.5);
    });

    it('does not affect routeRequest', () => {
        const withRequest = locationsReducer(initialState, setRouteRequest(buildRouteRequest()));
        const state = locationsReducer(withRequest, setSelectedRoute(buildSafeRoute()));
        expect(state.routeRequest).not.toBeNull();
    });
});

// ─── setRouteRequest ──────────────────────────────────────────────────────────

describe('setRouteRequest', () => {
    it('sets a route request', () => {
        const request = buildRouteRequest();
        const state = locationsReducer(initialState, setRouteRequest(request));
        expect(state.routeRequest).toEqual(request);
    });

    it('sets route request to null', () => {
        const withRequest = locationsReducer(initialState, setRouteRequest(buildRouteRequest()));
        const state = locationsReducer(withRequest, setRouteRequest(null));
        expect(state.routeRequest).toBeNull();
    });

    it('preserves origin and destination coordinates', () => {
        const request = buildRouteRequest({
            origin: { latitude: 25.7617, longitude: -80.1918 },
            destination: { latitude: 25.9, longitude: -80.3 },
        });
        const state = locationsReducer(initialState, setRouteRequest(request));
        expect(state.routeRequest?.origin).toEqual({ latitude: 25.7617, longitude: -80.1918 });
        expect(state.routeRequest?.destination).toEqual({ latitude: 25.9, longitude: -80.3 });
    });

    it('preserves user demographics', () => {
        const request = buildRouteRequest();
        const state = locationsReducer(initialState, setRouteRequest(request));
        expect(state.routeRequest?.user_demographics.gender).toBe('female');
        expect(state.routeRequest?.user_demographics.race_ethnicity).toBe('black');
    });
});

// ─── clearRoutes ──────────────────────────────────────────────────────────────

describe('clearRoutes', () => {
    // Build a "fully loaded" state to clear
    const loadedState = (() => {
        let s = initialState;
        s = locationsReducer(s, setSelectedRoute(buildSafeRoute()));
        s = locationsReducer(s, setSmartRouteComparison(buildSmartRouteComparison()));
        return s;
    })();

    it('clears selectedRoute', () => {
        const state = locationsReducer(loadedState, clearRoutes());
        expect(state.selectedRoute).toBeNull();
    });

    it('clears routes array', () => {
        const state = locationsReducer(loadedState, clearRoutes());
        expect(state.routes).toEqual([]);
    });

    it('clears routeAlternatives', () => {
        const state = locationsReducer(loadedState, clearRoutes());
        expect(state.routeAlternatives).toEqual([]);
    });

    it('clears routeSafetyAnalysis', () => {
        const state = locationsReducer(loadedState, clearRoutes());
        expect(state.routeSafetyAnalysis).toBeNull();
    });

    it('clears routeError', () => {
        const state = locationsReducer(loadedState, clearRoutes());
        expect(state.routeError).toBeNull();
    });

    it('clears smartRouteComparison', () => {
        const state = locationsReducer(loadedState, clearRoutes());
        expect(state.smartRouteComparison).toBeNull();
    });

    it('sets showSmartRouteComparison to false', () => {
        const state = locationsReducer(loadedState, clearRoutes());
        expect(state.showSmartRouteComparison).toBe(false);
    });

    it('does NOT clear routeRequest (origin/destination preserved for re-planning)', () => {
        let s = locationsReducer(initialState, setRouteRequest(buildRouteRequest()));
        s = locationsReducer(s, setSelectedRoute(buildSafeRoute()));
        const state = locationsReducer(s, clearRoutes());
        expect(state.routeRequest).not.toBeNull();
    });

    it('does NOT affect navigationActive', () => {
        let s = locationsReducer(loadedState, startNavigation());
        const state = locationsReducer(s, clearRoutes());
        expect(state.navigationActive).toBe(true);
    });

    it('is safe to call on already-empty state', () => {
        const state = locationsReducer(initialState, clearRoutes());
        expect(state.selectedRoute).toBeNull();
        expect(state.routes).toEqual([]);
    });
});

// ─── toggleRouteSegments ──────────────────────────────────────────────────────

describe('toggleRouteSegments', () => {
    it('toggles from false to true', () => {
        const state = locationsReducer(initialState, toggleRouteSegments());
        expect(state.showRouteSegments).toBe(true);
    });

    it('toggles from true back to false', () => {
        let state = locationsReducer(initialState, toggleRouteSegments());
        state = locationsReducer(state, toggleRouteSegments());
        expect(state.showRouteSegments).toBe(false);
    });

    it('does not affect other route state', () => {
        const withRoute = locationsReducer(initialState, setSelectedRoute(buildSafeRoute()));
        const state = locationsReducer(withRoute, toggleRouteSegments());
        expect(state.selectedRoute).not.toBeNull();
    });
});

// ─── setSelectedSegment ───────────────────────────────────────────────────────

describe('setSelectedSegment', () => {
    const segment = {
        start_lat: 40.7,
        start_lng: -74.0,
        end_lat: 40.71,
        end_lng: -74.01,
        safety_score: 3.5,
        distance_meters: 500,
        duration_seconds: 120,
    };

    it('sets a segment', () => {
        const state = locationsReducer(initialState, setSelectedSegment(segment));
        expect(state.selectedSegment).toEqual(segment);
    });

    it('clears segment by setting null', () => {
        const withSegment = locationsReducer(initialState, setSelectedSegment(segment));
        const state = locationsReducer(withSegment, setSelectedSegment(null));
        expect(state.selectedSegment).toBeNull();
    });

    it('overwrites previous segment', () => {
        const second = { ...segment, safety_score: 1.5 };
        let state = locationsReducer(initialState, setSelectedSegment(segment));
        state = locationsReducer(state, setSelectedSegment(second));
        expect(state.selectedSegment?.safety_score).toBe(1.5);
    });
});

// ─── updateRoutePreferences ───────────────────────────────────────────────────

describe('updateRoutePreferences', () => {
    it('updates avoidEveningDanger', () => {
        const state = locationsReducer(
            initialState,
            updateRoutePreferences({ avoidEveningDanger: false })
        );
        expect(state.routePreferences.avoidEveningDanger).toBe(false);
    });

    it('updates maxDetourMinutes', () => {
        const state = locationsReducer(
            initialState,
            updateRoutePreferences({ maxDetourMinutes: 15 })
        );
        expect(state.routePreferences.maxDetourMinutes).toBe(15);
    });

    it('merges partial update — untouched fields preserved', () => {
        const state = locationsReducer(
            initialState,
            updateRoutePreferences({ avoidEveningDanger: false })
        );
        // maxDetourMinutes should retain its default
        expect(state.routePreferences.maxDetourMinutes).toBe(3600);
    });

    it('can update both fields at once', () => {
        const state = locationsReducer(
            initialState,
            updateRoutePreferences({ avoidEveningDanger: false, maxDetourMinutes: 10 })
        );
        expect(state.routePreferences.avoidEveningDanger).toBe(false);
        expect(state.routePreferences.maxDetourMinutes).toBe(10);
    });

    it('empty update object leaves preferences unchanged', () => {
        const state = locationsReducer(initialState, updateRoutePreferences({}));
        expect(state.routePreferences).toEqual({
            avoidEveningDanger: true,
            maxDetourMinutes: 3600,
        });
    });
});

// ─── setSmartRouteComparison ──────────────────────────────────────────────────

describe('setSmartRouteComparison', () => {
    it('sets comparison data', () => {
        const comparison = buildSmartRouteComparison();
        const state = locationsReducer(initialState, setSmartRouteComparison(comparison));
        expect(state.smartRouteComparison).toEqual(comparison);
    });

    it('auto-shows comparison UI when value is not null', () => {
        const state = locationsReducer(
            initialState,
            setSmartRouteComparison(buildSmartRouteComparison())
        );
        expect(state.showSmartRouteComparison).toBe(true);
    });

    it('auto-hides comparison UI when value is null', () => {
        const withComparison = locationsReducer(
            initialState,
            setSmartRouteComparison(buildSmartRouteComparison())
        );
        const state = locationsReducer(withComparison, setSmartRouteComparison(null));
        expect(state.showSmartRouteComparison).toBe(false);
    });

    it('clears comparison data when set to null', () => {
        const withComparison = locationsReducer(
            initialState,
            setSmartRouteComparison(buildSmartRouteComparison())
        );
        const state = locationsReducer(withComparison, setSmartRouteComparison(null));
        expect(state.smartRouteComparison).toBeNull();
    });

    it('preserves improvement_summary data', () => {
        const comparison = buildSmartRouteComparison();
        const state = locationsReducer(initialState, setSmartRouteComparison(comparison));
        expect(state.smartRouteComparison?.improvement_summary.danger_zones_avoided).toBe(2);
        expect(state.smartRouteComparison?.improvement_summary.safety_improvement).toBe(1.4);
    });
});

// ─── toggleSmartRouteComparison ───────────────────────────────────────────────

describe('toggleSmartRouteComparison', () => {
    it('toggles showSmartRouteComparison from false to true', () => {
        const state = locationsReducer(initialState, toggleSmartRouteComparison());
        expect(state.showSmartRouteComparison).toBe(true);
    });

    it('toggles showSmartRouteComparison from true back to false', () => {
        let state = locationsReducer(initialState, toggleSmartRouteComparison());
        state = locationsReducer(state, toggleSmartRouteComparison());
        expect(state.showSmartRouteComparison).toBe(false);
    });

    it('does NOT clear smartRouteComparison data when toggling off', () => {
        let state = locationsReducer(
            initialState,
            setSmartRouteComparison(buildSmartRouteComparison())
        );
        // showSmartRouteComparison is now true — toggle it off
        state = locationsReducer(state, toggleSmartRouteComparison());
        expect(state.showSmartRouteComparison).toBe(false);
        // Data should still be there — user may re-open the comparison card
        expect(state.smartRouteComparison).not.toBeNull();
    });
});

// ─── Full route planning lifecycle ───────────────────────────────────────────

describe('route planning lifecycle', () => {
    it('plan → compare → select → clear', () => {
        let state = initialState;

        // User submits route request
        state = locationsReducer(state, setRouteRequest(buildRouteRequest()));
        expect(state.routeRequest).not.toBeNull();

        // Smart route comparison arrives
        state = locationsReducer(state, setSmartRouteComparison(buildSmartRouteComparison()));
        expect(state.smartRouteComparison).not.toBeNull();
        expect(state.showSmartRouteComparison).toBe(true);

        // User selects the optimized route
        const route = buildSafeRoute({ id: 'optimized' });
        state = locationsReducer(state, setSelectedRoute(route));
        expect(state.selectedRoute?.id).toBe('optimized');

        // User toggles segment view on
        state = locationsReducer(state, toggleRouteSegments());
        expect(state.showRouteSegments).toBe(true);

        // User cancels / clears route
        state = locationsReducer(state, clearRoutes());
        expect(state.selectedRoute).toBeNull();
        expect(state.smartRouteComparison).toBeNull();
        expect(state.showSmartRouteComparison).toBe(false);

        // routeRequest persists for re-planning
        expect(state.routeRequest).not.toBeNull();
    });
});