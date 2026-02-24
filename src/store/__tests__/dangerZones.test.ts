import locationsReducer, {
    toggleDangerZones,
    setDangerZonesVisible,
} from '../locationsSlice';

const initialState = locationsReducer(undefined, { type: '@@INIT' });

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial danger zone state', () => {
    it('dangerZonesVisible is false by default', () => {
        expect(initialState.dangerZonesVisible).toBe(false);
    });

    it('dangerZones is empty array by default', () => {
        expect(initialState.dangerZones).toEqual([]);
    });

    it('dangerZonesLoading is false by default', () => {
        expect(initialState.dangerZonesLoading).toBe(false);
    });
});

// ─── toggleDangerZones ────────────────────────────────────────────────────────

describe('toggleDangerZones', () => {
    it('toggles from false to true', () => {
        const state = locationsReducer(initialState, toggleDangerZones());
        expect(state.dangerZonesVisible).toBe(true);
    });

    it('toggles from true back to false', () => {
        let state = locationsReducer(initialState, toggleDangerZones());
        state = locationsReducer(state, toggleDangerZones());
        expect(state.dangerZonesVisible).toBe(false);
    });

    it('clears dangerZones array when toggling OFF', () => {
        // Simulate zones loaded while visible
        let state = { ...initialState, dangerZonesVisible: true, dangerZones: [{ id: 'zone-1' } as any] };
        state = locationsReducer(state, toggleDangerZones());
        expect(state.dangerZones).toEqual([]);
    });

    it('does NOT clear dangerZones when toggling ON', () => {
        // Zones may already be cached — should not wipe them on toggle on
        const state = locationsReducer(initialState, toggleDangerZones());
        expect(state.dangerZones).toEqual([]);  // was already empty, stays empty
        expect(state.dangerZonesVisible).toBe(true);
    });

    it('clears zones on toggle OFF so next toggle ON triggers a fresh fetch', () => {
        // This is the critical behavior — ensures stale zones are never shown
        let state = { ...initialState, dangerZonesVisible: true, dangerZones: [{ id: 'z1' }, { id: 'z2' }] as any[] };
        state = locationsReducer(state, toggleDangerZones());
        expect(state.dangerZonesVisible).toBe(false);
        expect(state.dangerZones).toHaveLength(0);

        // Toggle back on — zones are empty, component will refetch
        state = locationsReducer(state, toggleDangerZones());
        expect(state.dangerZonesVisible).toBe(true);
        expect(state.dangerZones).toHaveLength(0);
    });

    it('does not affect other location state', () => {
        const withLocation = { ...initialState, userLocation: { latitude: 40.7, longitude: -74.0 } };
        const state = locationsReducer(withLocation, toggleDangerZones());
        expect(state.userLocation).toEqual({ latitude: 40.7, longitude: -74.0 });
    });
});

// ─── setDangerZonesVisible ────────────────────────────────────────────────────

describe('setDangerZonesVisible', () => {
    it('sets to true explicitly', () => {
        const state = locationsReducer(initialState, setDangerZonesVisible(true));
        expect(state.dangerZonesVisible).toBe(true);
    });

    it('sets to false explicitly', () => {
        const withVisible = locationsReducer(initialState, setDangerZonesVisible(true));
        const state = locationsReducer(withVisible, setDangerZonesVisible(false));
        expect(state.dangerZonesVisible).toBe(false);
    });

    it('does NOT clear dangerZones array (unlike toggleDangerZones)', () => {
        // setDangerZonesVisible is a direct setter — no side effects
        const withZones = { ...initialState, dangerZones: [{ id: 'zone-1' }] as any[] };
        const state = locationsReducer(withZones, setDangerZonesVisible(false));
        expect(state.dangerZones).toHaveLength(1);
    });

    it('idempotent — setting true twice stays true', () => {
        let state = locationsReducer(initialState, setDangerZonesVisible(true));
        state = locationsReducer(state, setDangerZonesVisible(true));
        expect(state.dangerZonesVisible).toBe(true);
    });

    it('idempotent — setting false twice stays false', () => {
        let state = locationsReducer(initialState, setDangerZonesVisible(false));
        state = locationsReducer(state, setDangerZonesVisible(false));
        expect(state.dangerZonesVisible).toBe(false);
    });
});

// ─── toggle vs set — behavioral difference ────────────────────────────────────

describe('toggleDangerZones vs setDangerZonesVisible — critical difference', () => {
    it('toggle clears zones on OFF, set does not', () => {
        const zones = [{ id: 'z1' }, { id: 'z2' }] as any[];
        const visibleWithZones = { ...initialState, dangerZonesVisible: true, dangerZones: zones };

        const afterToggle = locationsReducer(visibleWithZones, toggleDangerZones());
        const afterSet = locationsReducer(visibleWithZones, setDangerZonesVisible(false));

        expect(afterToggle.dangerZones).toHaveLength(0);  // toggle clears
        expect(afterSet.dangerZones).toHaveLength(2);     // set preserves
    });
});