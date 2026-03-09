import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { APP_CONFIG } from '@/config/appConfig';

const LOCK_HOURS = APP_CONFIG.PREMIUM.AD_REWARD_LOCK_HOURS;

// ─── Mock useAppSelector ──────────────────────────────────────────────────────

let mockTier: string = 'free';
let mockTrialRecord: Record<string, { expiresAt: string; grantedAt: string }> | null = null;

jest.mock('@/store/hooks', () => ({
    useAppSelector: (selector: (state: any) => any) =>
        selector({
            user: {
                profile: {
                    subscription_tier: mockTier,
                    trial_expires_at: mockTrialRecord,
                },
            },
        }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTrialRecord(feature: string, expiresAt: Date, grantedAt?: Date) {
    return {
        [feature]: {
            expiresAt: expiresAt.toISOString(),
            grantedAt: (grantedAt ?? new Date()).toISOString(),
        },
    };
}

function useCallHook(feature: Parameters<typeof useFeatureAccess>[0]) {
    return useFeatureAccess(feature);
}

// ─── tier-based access ────────────────────────────────────────────────────────

describe('useFeatureAccess — tier-based access', () => {
    beforeEach(() => { mockTrialRecord = null; });

    it('free user has no access to premium feature', () => {
        mockTier = 'free';
        expect(useCallHook('advancedFilters').hasAccess).toBe(false);
    });

    it('premium user has access to premium feature', () => {
        mockTier = 'premium';
        expect(useCallHook('advancedFilters').hasAccess).toBe(true);
    });

    it('premium user has no access to enterprise feature', () => {
        mockTier = 'premium';
        expect(useCallHook('exportData').hasAccess).toBe(false);
    });

    it('enterprise user has access to enterprise feature', () => {
        mockTier = 'enterprise';
        expect(useCallHook('exportData').hasAccess).toBe(true);
    });

    it('returns correct featureLabel', () => {
        mockTier = 'free';
        expect(useCallHook('advancedFilters').featureLabel).toBe('Advanced Filters');
    });

    it('returns correct requiredTier', () => {
        mockTier = 'free';
        expect(useCallHook('exportData').requiredTier).toBe('enterprise');
    });
});

// ─── trial-based access ───────────────────────────────────────────────────────

describe('useFeatureAccess — trial access', () => {
    beforeEach(() => { mockTier = 'free'; });

    it('active trial grants access', () => {
        mockTrialRecord = makeTrialRecord('advancedFilters', new Date(Date.now() + 60 * 60 * 1000));
        expect(useCallHook('advancedFilters').hasAccess).toBe(true);
    });

    it('expired trial denies access', () => {
        mockTrialRecord = makeTrialRecord('advancedFilters', new Date(Date.now() - 60 * 60 * 1000));
        expect(useCallHook('advancedFilters').hasAccess).toBe(false);
    });

    it('trial for different feature does not grant access', () => {
        mockTrialRecord = makeTrialRecord('routeHistory', new Date(Date.now() + 60 * 60 * 1000));
        expect(useCallHook('advancedFilters').hasAccess).toBe(false);
    });

    it('null trial_expires_at denies access', () => {
        mockTrialRecord = null;
        expect(useCallHook('advancedFilters').hasAccess).toBe(false);
    });

    it('premium user with expired trial still has access via tier', () => {
        mockTier = 'premium';
        mockTrialRecord = makeTrialRecord('advancedFilters', new Date(Date.now() - 60 * 60 * 1000));
        expect(useCallHook('advancedFilters').hasAccess).toBe(true);
    });
});

// ─── isInLockPeriod ───────────────────────────────────────────────────────────

describe('useFeatureAccess — isInLockPeriod', () => {
    beforeEach(() => { mockTier = 'free'; });

    it('false while trial is still active', () => {
        mockTrialRecord = makeTrialRecord('advancedFilters', new Date(Date.now() + 60 * 60 * 1000));
        expect(useCallHook('advancedFilters').isInLockPeriod).toBe(false);
    });

    it('true immediately after trial expires', () => {
        mockTrialRecord = makeTrialRecord('advancedFilters', new Date(Date.now() - 1000));
        expect(useCallHook('advancedFilters').isInLockPeriod).toBe(true);
    });

    it('true partway through the lock window', () => {
        mockTrialRecord = makeTrialRecord('advancedFilters', new Date(Date.now() - 24 * 60 * 60 * 1000));
        expect(useCallHook('advancedFilters').isInLockPeriod).toBe(true);
    });

    it('false after full lock window has passed', () => {
        mockTrialRecord = makeTrialRecord('advancedFilters', new Date(Date.now() - (LOCK_HOURS + 1) * 60 * 60 * 1000));
        expect(useCallHook('advancedFilters').isInLockPeriod).toBe(false);
    });

    it('false when no trial record exists', () => {
        mockTrialRecord = null;
        expect(useCallHook('advancedFilters').isInLockPeriod).toBe(false);
    });
});

// ─── lockExpiresAt ────────────────────────────────────────────────────────────

describe('useFeatureAccess — lockExpiresAt', () => {
    beforeEach(() => { mockTier = 'free'; });

    it('null when no trial record exists', () => {
        mockTrialRecord = null;
        expect(useCallHook('advancedFilters').lockExpiresAt).toBeNull();
    });

    it('null when feature absent from trial record', () => {
        mockTrialRecord = makeTrialRecord('routeHistory', new Date(Date.now() + 60 * 60 * 1000));
        expect(useCallHook('advancedFilters').lockExpiresAt).toBeNull();
    });

    it('set to expiresAt + LOCK_HOURS when trial is active', () => {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        mockTrialRecord = makeTrialRecord('advancedFilters', expiresAt);
        const expected = new Date(expiresAt.getTime() + LOCK_HOURS * 60 * 60 * 1000).toISOString();
        expect(useCallHook('advancedFilters').lockExpiresAt).toBe(expected);
    });

    it('still set after trial expired but within lock window', () => {
        mockTrialRecord = makeTrialRecord('advancedFilters', new Date(Date.now() - 60 * 60 * 1000));
        expect(useCallHook('advancedFilters').lockExpiresAt).not.toBeNull();
    });
});