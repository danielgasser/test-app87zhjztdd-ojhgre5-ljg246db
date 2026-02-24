import locationsReducer, {
    setUserLocation,
    setUserCountry,
    setFilters,
    setMapCenter,
    setCommunityFeedMode,
    addLocationToNearby,
    clearSearchResults,
    setShowSearchResults,
} from '../locationsSlice';
import { LocationWithScores } from '@/types/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildLocation = (overrides: Partial<LocationWithScores> = {}): LocationWithScores => ({
    id: 'loc-1',
    name: 'Test Location',
    address: '123 Main St',
    latitude: 40.7128,
    longitude: -74.006,
    place_type: 'restaurant',
    overall_safety_score: 4.2,
    review_count: 10,
    city: 'New York',
    state_province: 'NY',
    country: 'US',
    ...overrides,
} as LocationWithScores);

const initialState = locationsReducer(undefined, { type: '@@INIT' });

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial map state', () => {
    it('userLocation is null', () => {
        expect(initialState.userLocation).toBeNull();
    });

    it('userCountry is null', () => {
        expect(initialState.userCountry).toBeNull();
    });

    it('mapCenter is null', () => {
        expect(initialState.mapCenter).toBeNull();
    });

    it('communityFeedMode defaults to near_me', () => {
        expect(initialState.communityFeedMode).toBe('near_me');
    });

    it('filters has correct defaults', () => {
        expect(initialState.filters).toEqual({
            placeType: null,
            minSafetyScore: null,
            radius: 10000,
        });
    });

    it('searchResults is empty array', () => {
        expect(initialState.searchResults).toEqual([]);
    });

    it('showSearchResults is false', () => {
        expect(initialState.showSearchResults).toBe(false);
    });

    it('nearbyLocations is empty array', () => {
        expect(initialState.nearbyLocations).toEqual([]);
    });
});

// ─── setUserLocation ──────────────────────────────────────────────────────────

describe('setUserLocation', () => {
    it('sets user location coordinates', () => {
        const state = locationsReducer(
            initialState,
            setUserLocation({ latitude: 40.7128, longitude: -74.006 })
        );
        expect(state.userLocation).toEqual({ latitude: 40.7128, longitude: -74.006 });
    });

    it('sets location to null (permission denied or lost)', () => {
        const withLocation = locationsReducer(
            initialState,
            setUserLocation({ latitude: 40.7128, longitude: -74.006 })
        );
        const state = locationsReducer(withLocation, setUserLocation(null));
        expect(state.userLocation).toBeNull();
    });

    it('updates location as user moves', () => {
        let state = locationsReducer(
            initialState,
            setUserLocation({ latitude: 40.7128, longitude: -74.006 })
        );
        state = locationsReducer(
            state,
            setUserLocation({ latitude: 40.7200, longitude: -74.010 })
        );
        expect(state.userLocation).toEqual({ latitude: 40.7200, longitude: -74.010 });
    });

    it('handles international coordinates', () => {
        const state = locationsReducer(
            initialState,
            setUserLocation({ latitude: 47.3769, longitude: 8.5417 }) // Winterthur
        );
        expect(state.userLocation?.latitude).toBe(47.3769);
        expect(state.userLocation?.longitude).toBe(8.5417);
    });

    it('handles southern hemisphere coordinates', () => {
        const state = locationsReducer(
            initialState,
            setUserLocation({ latitude: -33.8688, longitude: 151.2093 }) // Sydney
        );
        expect(state.userLocation?.latitude).toBe(-33.8688);
    });
});

// ─── setUserCountry ───────────────────────────────────────────────────────────

describe('setUserCountry', () => {
    it('sets country code', () => {
        const state = locationsReducer(initialState, setUserCountry('US'));
        expect(state.userCountry).toBe('US');
    });

    it('sets to null (unknown country)', () => {
        const withCountry = locationsReducer(initialState, setUserCountry('US'));
        const state = locationsReducer(withCountry, setUserCountry(null));
        expect(state.userCountry).toBeNull();
    });

    it('updates when user crosses border', () => {
        let state = locationsReducer(initialState, setUserCountry('US'));
        state = locationsReducer(state, setUserCountry('CA'));
        expect(state.userCountry).toBe('CA');
    });

    it('handles various country codes', () => {
        const codes = ['US', 'GB', 'DE', 'CH', 'BR', 'JP'];
        for (const code of codes) {
            const state = locationsReducer(initialState, setUserCountry(code));
            expect(state.userCountry).toBe(code);
        }
    });
});

// ─── setMapCenter ─────────────────────────────────────────────────────────────

describe('setMapCenter', () => {
    it('sets map center coordinates', () => {
        const state = locationsReducer(
            initialState,
            setMapCenter({ latitude: 40.7128, longitude: -74.006 })
        );
        expect(state.mapCenter).toEqual({ latitude: 40.7128, longitude: -74.006 });
    });

    it('sets map center to null', () => {
        const withCenter = locationsReducer(
            initialState,
            setMapCenter({ latitude: 40.7128, longitude: -74.006 })
        );
        const state = locationsReducer(withCenter, setMapCenter(null));
        expect(state.mapCenter).toBeNull();
    });

    it('updates map center independently of userLocation', () => {
        let state = locationsReducer(
            initialState,
            setUserLocation({ latitude: 40.7128, longitude: -74.006 })
        );
        state = locationsReducer(
            state,
            setMapCenter({ latitude: 25.7617, longitude: -80.1918 })
        );
        expect(state.userLocation?.latitude).toBe(40.7128);
        expect(state.mapCenter?.latitude).toBe(25.7617);
    });
});

// ─── setCommunityFeedMode ─────────────────────────────────────────────────────

describe('setCommunityFeedMode', () => {
    it('sets to map_area', () => {
        const state = locationsReducer(initialState, setCommunityFeedMode('map_area'));
        expect(state.communityFeedMode).toBe('map_area');
    });

    it('sets back to near_me', () => {
        let state = locationsReducer(initialState, setCommunityFeedMode('map_area'));
        state = locationsReducer(state, setCommunityFeedMode('near_me'));
        expect(state.communityFeedMode).toBe('near_me');
    });

    it('idempotent — setting same mode twice', () => {
        let state = locationsReducer(initialState, setCommunityFeedMode('map_area'));
        state = locationsReducer(state, setCommunityFeedMode('map_area'));
        expect(state.communityFeedMode).toBe('map_area');
    });
});

// ─── setFilters ───────────────────────────────────────────────────────────────

describe('setFilters', () => {
    it('sets placeType filter', () => {
        const state = locationsReducer(initialState, setFilters({ placeType: 'restaurant' }));
        expect(state.filters.placeType).toBe('restaurant');
    });

    it('sets minSafetyScore filter', () => {
        const state = locationsReducer(initialState, setFilters({ minSafetyScore: 3.5 }));
        expect(state.filters.minSafetyScore).toBe(3.5);
    });

    it('sets radius filter', () => {
        const state = locationsReducer(initialState, setFilters({ radius: 5000 }));
        expect(state.filters.radius).toBe(5000);
    });

    it('merges partial update — untouched fields preserved', () => {
        const state = locationsReducer(initialState, setFilters({ placeType: 'hotel' }));
        expect(state.filters.minSafetyScore).toBeNull();
        expect(state.filters.radius).toBe(10000);
    });

    it('can set multiple filters at once', () => {
        const state = locationsReducer(
            initialState,
            setFilters({ placeType: 'gas_station', minSafetyScore: 4.0, radius: 20000 })
        );
        expect(state.filters.placeType).toBe('gas_station');
        expect(state.filters.minSafetyScore).toBe(4.0);
        expect(state.filters.radius).toBe(20000);
    });

    it('can clear placeType filter by setting null', () => {
        let state = locationsReducer(initialState, setFilters({ placeType: 'restaurant' }));
        state = locationsReducer(state, setFilters({ placeType: null }));
        expect(state.filters.placeType).toBeNull();
    });

    it('empty update preserves all defaults', () => {
        const state = locationsReducer(initialState, setFilters({}));
        expect(state.filters).toEqual({
            placeType: null,
            minSafetyScore: null,
            radius: 10000,
        });
    });
});

// ─── addLocationToNearby ──────────────────────────────────────────────────────

describe('addLocationToNearby', () => {
    it('adds a location to empty nearbyLocations', () => {
        const loc = buildLocation();
        const state = locationsReducer(initialState, addLocationToNearby(loc));
        expect(state.nearbyLocations).toHaveLength(1);
        expect(state.nearbyLocations[0].id).toBe('loc-1');
    });

    it('adds multiple distinct locations', () => {
        let state = locationsReducer(initialState, addLocationToNearby(buildLocation({ id: 'loc-1' })));
        state = locationsReducer(state, addLocationToNearby(buildLocation({ id: 'loc-2' })));
        expect(state.nearbyLocations).toHaveLength(2);
    });

    it('does NOT add duplicate locations (same id)', () => {
        const loc = buildLocation({ id: 'loc-1' });
        let state = locationsReducer(initialState, addLocationToNearby(loc));
        state = locationsReducer(state, addLocationToNearby(loc));
        expect(state.nearbyLocations).toHaveLength(1);
    });

    it('deduplication is based on id, not content', () => {
        const original = buildLocation({ id: 'loc-1', name: 'Original Name' });
        const updated = buildLocation({ id: 'loc-1', name: 'Updated Name' });
        let state = locationsReducer(initialState, addLocationToNearby(original));
        state = locationsReducer(state, addLocationToNearby(updated));
        // Original is preserved — no update on duplicate
        expect(state.nearbyLocations).toHaveLength(1);
        expect(state.nearbyLocations[0].name).toBe('Original Name');
    });
});

// ─── clearSearchResults ───────────────────────────────────────────────────────

describe('clearSearchResults', () => {
    it('clears searchResults array', () => {
        const withResults = {
            ...initialState,
            searchResults: [{ id: 'r1', name: 'Result' }] as any[],
        };
        const state = locationsReducer(withResults, clearSearchResults());
        expect(state.searchResults).toEqual([]);
    });

    it('sets showSearchResults to false', () => {
        const withVisible = { ...initialState, showSearchResults: true };
        const state = locationsReducer(withVisible, clearSearchResults());
        expect(state.showSearchResults).toBe(false);
    });

    it('clears both results AND visibility together', () => {
        const loaded = {
            ...initialState,
            searchResults: [{ id: 'r1' }] as any[],
            showSearchResults: true,
        };
        const state = locationsReducer(loaded, clearSearchResults());
        expect(state.searchResults).toEqual([]);
        expect(state.showSearchResults).toBe(false);
    });

    it('safe to call when already empty', () => {
        const state = locationsReducer(initialState, clearSearchResults());
        expect(state.searchResults).toEqual([]);
        expect(state.showSearchResults).toBe(false);
    });
});

// ─── setShowSearchResults ─────────────────────────────────────────────────────

describe('setShowSearchResults', () => {
    it('sets to true', () => {
        const state = locationsReducer(initialState, setShowSearchResults(true));
        expect(state.showSearchResults).toBe(true);
    });

    it('sets to false', () => {
        const withVisible = locationsReducer(initialState, setShowSearchResults(true));
        const state = locationsReducer(withVisible, setShowSearchResults(false));
        expect(state.showSearchResults).toBe(false);
    });

    it('does NOT clear searchResults (unlike clearSearchResults)', () => {
        const withResults = {
            ...initialState,
            searchResults: [{ id: 'r1' }] as any[],
            showSearchResults: true,
        };
        const state = locationsReducer(withResults, setShowSearchResults(false));
        expect(state.searchResults).toHaveLength(1);
    });

    it('idempotent — setting true twice stays true', () => {
        let state = locationsReducer(initialState, setShowSearchResults(true));
        state = locationsReducer(state, setShowSearchResults(true));
        expect(state.showSearchResults).toBe(true);
    });
});