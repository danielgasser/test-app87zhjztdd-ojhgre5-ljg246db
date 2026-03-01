import { configureStore } from '@reduxjs/toolkit';
import premiumPromptReducer, {
    showPremiumPrompt,
    hidePremiumPrompt,
} from '../premiumPromptSlice';

// ─── Store factory ────────────────────────────────────────────────────────────

function makeStore() {
    return configureStore({
        reducer: { premiumPrompt: premiumPromptReducer },
    });
}

function getState(store: ReturnType<typeof makeStore>) {
    return store.getState().premiumPrompt;
}

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
    it('starts with visible false', () => {
        expect(getState(makeStore()).visible).toBe(false);
    });

    it('starts with feature null', () => {
        expect(getState(makeStore()).feature).toBeNull();
    });

    it('starts with description null', () => {
        expect(getState(makeStore()).description).toBeNull();
    });
});

// ─── showPremiumPrompt ────────────────────────────────────────────────────────

describe('showPremiumPrompt', () => {
    it('sets visible to true', () => {
        const store = makeStore();
        store.dispatch(showPremiumPrompt({ feature: 'saveLocations' }));
        expect(getState(store).visible).toBe(true);
    });

    it('stores the feature name', () => {
        const store = makeStore();
        store.dispatch(showPremiumPrompt({ feature: 'advancedFilters' }));
        expect(getState(store).feature).toBe('advancedFilters');
    });

    it('stores the description when provided', () => {
        const store = makeStore();
        store.dispatch(showPremiumPrompt({
            feature: 'saveLocations',
            description: 'Save your favorite spots.',
        }));
        expect(getState(store).description).toBe('Save your favorite spots.');
    });

    it('sets description to null when not provided', () => {
        const store = makeStore();
        store.dispatch(showPremiumPrompt({ feature: 'saveLocations' }));
        expect(getState(store).description).toBeNull();
    });

    it('overwrites previous prompt state', () => {
        const store = makeStore();
        store.dispatch(showPremiumPrompt({ feature: 'saveLocations', description: 'First' }));
        store.dispatch(showPremiumPrompt({ feature: 'advancedFilters', description: 'Second' }));
        expect(getState(store).feature).toBe('advancedFilters');
        expect(getState(store).description).toBe('Second');
    });
});

// ─── hidePremiumPrompt ────────────────────────────────────────────────────────

describe('hidePremiumPrompt', () => {
    it('sets visible to false', () => {
        const store = makeStore();
        store.dispatch(showPremiumPrompt({ feature: 'saveLocations' }));
        store.dispatch(hidePremiumPrompt());
        expect(getState(store).visible).toBe(false);
    });

    it('clears the feature', () => {
        const store = makeStore();
        store.dispatch(showPremiumPrompt({ feature: 'saveLocations' }));
        store.dispatch(hidePremiumPrompt());
        expect(getState(store).feature).toBeNull();
    });

    it('clears the description', () => {
        const store = makeStore();
        store.dispatch(showPremiumPrompt({ feature: 'saveLocations', description: 'Upgrade now.' }));
        store.dispatch(hidePremiumPrompt());
        expect(getState(store).description).toBeNull();
    });

    it('is safe to call when already hidden', () => {
        const store = makeStore();
        store.dispatch(hidePremiumPrompt());
        expect(getState(store)).toEqual({ visible: false, feature: null, description: null });
    });
});