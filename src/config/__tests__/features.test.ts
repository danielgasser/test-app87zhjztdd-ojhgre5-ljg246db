import {
    hasFeatureAccess,
    getAvailableFeatures,
    getLockedFeatures,
} from '../features';

// ─── hasFeatureAccess ─────────────────────────────────────────────────────────

describe('hasFeatureAccess', () => {
    describe('free tier', () => {
        it('cannot access premium features', () => {
            expect(hasFeatureAccess('free', 'routeHistory')).toBe(false);
            expect(hasFeatureAccess('free', 'advancedFilters')).toBe(false);
            expect(hasFeatureAccess('free', 'adFree')).toBe(false);
        });

        it('cannot access enterprise features', () => {
            expect(hasFeatureAccess('free', 'exportData')).toBe(false);
            expect(hasFeatureAccess('free', 'apiAccess')).toBe(false);
        });
    });

    describe('premium tier', () => {
        it('can access premium features', () => {
            expect(hasFeatureAccess('premium', 'routeHistory')).toBe(true);
            expect(hasFeatureAccess('premium', 'advancedFilters')).toBe(true);
            expect(hasFeatureAccess('premium', 'adFree')).toBe(true);
        });

        it('cannot access enterprise features', () => {
            expect(hasFeatureAccess('premium', 'exportData')).toBe(false);
            expect(hasFeatureAccess('premium', 'apiAccess')).toBe(false);
            expect(hasFeatureAccess('premium', 'teamManagement')).toBe(false);
        });
    });

    describe('enterprise tier', () => {
        it('can access premium features', () => {
            expect(hasFeatureAccess('enterprise', 'routeHistory')).toBe(true);
            expect(hasFeatureAccess('enterprise', 'advancedFilters')).toBe(true);
        });

        it('can access enterprise features', () => {
            expect(hasFeatureAccess('enterprise', 'exportData')).toBe(true);
            expect(hasFeatureAccess('enterprise', 'apiAccess')).toBe(true);
            expect(hasFeatureAccess('enterprise', 'teamManagement')).toBe(true);
        });
    });
});

// ─── getAvailableFeatures ─────────────────────────────────────────────────────

describe('getAvailableFeatures', () => {
    it('returns empty array for free tier', () => {
        expect(getAvailableFeatures('free')).toHaveLength(0);
    });

    it('returns all premium features for premium tier', () => {
        const available = getAvailableFeatures('premium');
        expect(available).toContain('routeHistory');
        expect(available).toContain('advancedFilters');
        expect(available).toContain('adFree');
        expect(available).not.toContain('exportData');
        expect(available).not.toContain('apiAccess');
    });

    it('returns all features for enterprise tier', () => {
        const available = getAvailableFeatures('enterprise');
        expect(available).toContain('routeHistory');
        expect(available).toContain('exportData');
        expect(available).toContain('apiAccess');
        expect(available).toContain('teamManagement');
    });
});

// ─── getLockedFeatures ────────────────────────────────────────────────────────

describe('getLockedFeatures', () => {
    it('returns all features as locked for free tier', () => {
        const locked = getLockedFeatures('free');
        expect(locked).toContain('routeHistory');
        expect(locked).toContain('exportData');
        expect(locked.length).toBeGreaterThan(0);
    });

    it('returns only enterprise features as locked for premium tier', () => {
        const locked = getLockedFeatures('premium');
        expect(locked).toContain('exportData');
        expect(locked).toContain('apiAccess');
        expect(locked).toContain('teamManagement');
        expect(locked).not.toContain('routeHistory');
        expect(locked).not.toContain('advancedFilters');
    });

    it('returns empty array for enterprise tier', () => {
        expect(getLockedFeatures('enterprise')).toHaveLength(0);
    });

    it('available and locked features together equal all features', () => {
        const available = getAvailableFeatures('premium');
        const locked = getLockedFeatures('premium');
        const total = available.length + locked.length;
        const allFeatures = getAvailableFeatures('enterprise');
        expect(total).toBe(allFeatures.length);
    });
});