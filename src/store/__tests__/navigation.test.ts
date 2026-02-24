import locationsReducer, {
    startNavigation,
    endNavigation,
    updateNavigationProgress,
    setRerouting,
    setNavigationSessionId,
    setNavigationPosition,
    setNavigationIntent,
    clearNavigationIntent,
} from '../locationsSlice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Returns only the navigation-relevant slice of state
const getNavState = (state: ReturnType<typeof locationsReducer>) => ({
    navigationActive: state.navigationActive,
    currentNavigationStep: state.currentNavigationStep,
    navigationStartTime: state.navigationStartTime,
    navigationSessionId: state.navigationSessionId,
    navigationPosition: state.navigationPosition,
    navigationIntent: state.navigationIntent,
    isRerouting: state.isRerouting,
});

const initialState = locationsReducer(undefined, { type: '@@INIT' });

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial navigation state', () => {
    it('navigation is inactive by default', () => {
        expect(initialState.navigationActive).toBe(false);
    });

    it('currentNavigationStep is null by default', () => {
        expect(initialState.currentNavigationStep).toBeNull();
    });

    it('navigationStartTime is null by default', () => {
        expect(initialState.navigationStartTime).toBeNull();
    });

    it('navigationSessionId is null by default', () => {
        expect(initialState.navigationSessionId).toBeNull();
    });

    it('navigationPosition is null by default', () => {
        expect(initialState.navigationPosition).toBeNull();
    });

    it('isRerouting is false by default', () => {
        expect(initialState.isRerouting).toBe(false);
    });

    it('navigationIntent is null by default', () => {
        expect(initialState.navigationIntent).toBeNull();
    });
});

// ─── startNavigation ─────────────────────────────────────────────────────────

describe('startNavigation', () => {
    it('sets navigationActive to true', () => {
        const state = locationsReducer(initialState, startNavigation());
        expect(state.navigationActive).toBe(true);
    });

    it('sets currentNavigationStep to 0', () => {
        const state = locationsReducer(initialState, startNavigation());
        expect(state.currentNavigationStep).toBe(0);
    });

    it('sets navigationStartTime to a valid ISO timestamp', () => {
        const before = new Date().toISOString();
        const state = locationsReducer(initialState, startNavigation());
        const after = new Date().toISOString();

        expect(state.navigationStartTime).not.toBeNull();
        expect(state.navigationStartTime! >= before).toBe(true);
        expect(state.navigationStartTime! <= after).toBe(true);
    });

    it('resets isRerouting to false', () => {
        const reroutingState = locationsReducer(initialState, setRerouting(true));
        const state = locationsReducer(reroutingState, startNavigation());
        expect(state.isRerouting).toBe(false);
    });

    it('does not clear navigationSessionId (set separately)', () => {
        const withSession = locationsReducer(initialState, setNavigationSessionId('session-123'));
        const state = locationsReducer(withSession, startNavigation());
        expect(state.navigationSessionId).toBe('session-123');
    });
});

// ─── endNavigation ───────────────────────────────────────────────────────────

describe('endNavigation', () => {
    // Set up an active navigation state to end
    const activeState = locationsReducer(initialState, startNavigation());

    it('sets navigationActive to false', () => {
        const state = locationsReducer(activeState, endNavigation());
        expect(state.navigationActive).toBe(false);
    });

    it('sets currentNavigationStep to null', () => {
        const withStep = locationsReducer(activeState, updateNavigationProgress(5));
        const state = locationsReducer(withStep, endNavigation());
        expect(state.currentNavigationStep).toBeNull();
    });

    it('sets navigationStartTime to null', () => {
        const state = locationsReducer(activeState, endNavigation());
        expect(state.navigationStartTime).toBeNull();
    });

    it('does NOT clear navigationSessionId (must be cleared explicitly)', () => {
        const withSession = locationsReducer(activeState, setNavigationSessionId('session-abc'));
        const state = locationsReducer(withSession, endNavigation());
        // Intentional design: session ID persists so saveFinalRoute can still use it
        expect(state.navigationSessionId).toBe('session-abc');
    });

    it('does NOT clear navigationPosition (must be cleared explicitly)', () => {
        const withPosition = locationsReducer(
            activeState,
            setNavigationPosition({ latitude: 40.7, longitude: -74.0 })
        );
        const state = locationsReducer(withPosition, endNavigation());
        expect(state.navigationPosition).not.toBeNull();
    });

    it('does NOT clear isRerouting', () => {
        const reroutingActive = locationsReducer(activeState, setRerouting(true));
        const state = locationsReducer(reroutingActive, endNavigation());
        // isRerouting is not part of endNavigation — separate concern
        expect(state.isRerouting).toBe(true);
    });
});

// ─── updateNavigationProgress ────────────────────────────────────────────────

describe('updateNavigationProgress', () => {
    it('sets currentNavigationStep to the given step number', () => {
        const state = locationsReducer(initialState, updateNavigationProgress(3));
        expect(state.currentNavigationStep).toBe(3);
    });

    it('advances step from 0 to 1', () => {
        const active = locationsReducer(initialState, startNavigation());
        const state = locationsReducer(active, updateNavigationProgress(1));
        expect(state.currentNavigationStep).toBe(1);
    });

    it('can set step to 0 (restart)', () => {
        const withStep = locationsReducer(initialState, updateNavigationProgress(5));
        const state = locationsReducer(withStep, updateNavigationProgress(0));
        expect(state.currentNavigationStep).toBe(0);
    });

    it('handles large step numbers', () => {
        const state = locationsReducer(initialState, updateNavigationProgress(99));
        expect(state.currentNavigationStep).toBe(99);
    });

    it('overwrites previous step', () => {
        let state = locationsReducer(initialState, updateNavigationProgress(2));
        state = locationsReducer(state, updateNavigationProgress(7));
        expect(state.currentNavigationStep).toBe(7);
    });
});

// ─── setRerouting ────────────────────────────────────────────────────────────

describe('setRerouting', () => {
    it('sets isRerouting to true', () => {
        const state = locationsReducer(initialState, setRerouting(true));
        expect(state.isRerouting).toBe(true);
    });

    it('sets isRerouting to false', () => {
        const reroutingState = locationsReducer(initialState, setRerouting(true));
        const state = locationsReducer(reroutingState, setRerouting(false));
        expect(state.isRerouting).toBe(false);
    });

    it('does not affect other navigation state', () => {
        const active = locationsReducer(initialState, startNavigation());
        const state = locationsReducer(active, setRerouting(true));
        expect(state.navigationActive).toBe(true);
        expect(state.currentNavigationStep).toBe(0);
    });
});

// ─── setNavigationSessionId ──────────────────────────────────────────────────

describe('setNavigationSessionId', () => {
    it('sets a session ID string', () => {
        const state = locationsReducer(initialState, setNavigationSessionId('session-xyz'));
        expect(state.navigationSessionId).toBe('session-xyz');
    });

    it('sets session ID to null (explicit clear)', () => {
        const withSession = locationsReducer(initialState, setNavigationSessionId('session-xyz'));
        const state = locationsReducer(withSession, setNavigationSessionId(null));
        expect(state.navigationSessionId).toBeNull();
    });

    it('overwrites an existing session ID', () => {
        const withSession = locationsReducer(initialState, setNavigationSessionId('old-session'));
        const state = locationsReducer(withSession, setNavigationSessionId('new-session'));
        expect(state.navigationSessionId).toBe('new-session');
    });
});

// ─── setNavigationPosition ───────────────────────────────────────────────────

describe('setNavigationPosition', () => {
    it('sets latitude and longitude', () => {
        const state = locationsReducer(
            initialState,
            setNavigationPosition({ latitude: 40.7128, longitude: -74.006 })
        );
        expect(state.navigationPosition).toEqual({ latitude: 40.7128, longitude: -74.006 });
    });

    it('sets position with optional heading', () => {
        const state = locationsReducer(
            initialState,
            setNavigationPosition({ latitude: 40.7128, longitude: -74.006, heading: 270 })
        );
        expect(state.navigationPosition?.heading).toBe(270);
    });

    it('updates position as user moves', () => {
        let state = locationsReducer(
            initialState,
            setNavigationPosition({ latitude: 40.7128, longitude: -74.006 })
        );
        state = locationsReducer(
            state,
            setNavigationPosition({ latitude: 40.7200, longitude: -74.010 })
        );
        expect(state.navigationPosition).toEqual({ latitude: 40.7200, longitude: -74.010 });
    });

    it('sets position to null (explicit clear after navigation ends)', () => {
        const withPosition = locationsReducer(
            initialState,
            setNavigationPosition({ latitude: 40.7128, longitude: -74.006 })
        );
        const state = locationsReducer(withPosition, setNavigationPosition(null));
        expect(state.navigationPosition).toBeNull();
    });
});

// ─── setNavigationIntent / clearNavigationIntent ─────────────────────────────

describe('setNavigationIntent', () => {
    it('sets a navigation intent', () => {
        const intent = {
            targetTab: 'map' as const,
            action: 'center_map' as const,
        };
        const state = locationsReducer(initialState, setNavigationIntent(intent));
        expect(state.navigationIntent).toEqual(intent);
    });

    it('sets intent with optional locationId', () => {
        const intent = {
            targetTab: 'map' as const,
            locationId: 'loc-123',
            action: 'view_location' as const,
        };
        const state = locationsReducer(initialState, setNavigationIntent(intent));
        expect(state.navigationIntent?.locationId).toBe('loc-123');
    });

    it('overwrites an existing intent', () => {
        const first = { targetTab: 'map' as const, action: 'center_map' as const };
        const second = { targetTab: 'community' as const, action: 'show_reviews' as const };
        let state = locationsReducer(initialState, setNavigationIntent(first));
        state = locationsReducer(state, setNavigationIntent(second));
        expect(state.navigationIntent?.targetTab).toBe('community');
    });
});

describe('clearNavigationIntent', () => {
    it('sets navigationIntent to null', () => {
        const withIntent = locationsReducer(
            initialState,
            setNavigationIntent({ targetTab: 'map', action: 'center_map' })
        );
        const state = locationsReducer(withIntent, clearNavigationIntent());
        expect(state.navigationIntent).toBeNull();
    });

    it('is safe to call when intent is already null', () => {
        const state = locationsReducer(initialState, clearNavigationIntent());
        expect(state.navigationIntent).toBeNull();
    });
});

// ─── Full lifecycle ───────────────────────────────────────────────────────────

describe('navigation lifecycle', () => {
    it('full trip: start → progress → reroute → end', () => {
        let state = initialState;

        // Set session and start
        state = locationsReducer(state, setNavigationSessionId('trip-001'));
        state = locationsReducer(state, startNavigation());
        expect(state.navigationActive).toBe(true);
        expect(state.currentNavigationStep).toBe(0);
        expect(state.isRerouting).toBe(false);

        // Progress through steps
        state = locationsReducer(state, updateNavigationProgress(1));
        state = locationsReducer(state, updateNavigationProgress(2));
        expect(state.currentNavigationStep).toBe(2);

        // Reroute triggered
        state = locationsReducer(state, setRerouting(true));
        expect(state.isRerouting).toBe(true);

        // Reroute complete, reset to step 0
        state = locationsReducer(state, setRerouting(false));
        state = locationsReducer(state, updateNavigationProgress(0));
        expect(state.isRerouting).toBe(false);
        expect(state.currentNavigationStep).toBe(0);

        // End navigation
        state = locationsReducer(state, endNavigation());
        expect(state.navigationActive).toBe(false);
        expect(state.currentNavigationStep).toBeNull();
        expect(state.navigationStartTime).toBeNull();
        // Session ID persists for saveFinalRoute
        expect(state.navigationSessionId).toBe('trip-001');

        // Explicit cleanup
        state = locationsReducer(state, setNavigationSessionId(null));
        state = locationsReducer(state, setNavigationPosition(null));
        expect(state.navigationSessionId).toBeNull();
        expect(state.navigationPosition).toBeNull();
    });
});