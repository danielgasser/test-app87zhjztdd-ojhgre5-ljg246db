import { authReducer } from '../../providers/AuthProvider';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_USER = {
    id: 'user-123',
    email: 'test@safepath.app',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
} as any;

const MOCK_SESSION = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: MOCK_USER,
} as any;

const INITIAL_STATE = {
    isLoading: true,
    isAuthenticated: false,
    session: null,
    user: null,
    needsOnboarding: false,
    onboardingChecked: false,
    pendingDeepLink: null,
    termsAccepted: false,
    locationDisclosureAccepted: false,
    appleUserName: null,
};

const AUTHENTICATED_STATE = {
    ...INITIAL_STATE,
    isLoading: false,
    isAuthenticated: true,
    session: MOCK_SESSION,
    user: MOCK_USER,
    needsOnboarding: false,
    onboardingChecked: true,
    pendingDeepLink: 'safepath://location/123',
    termsAccepted: true,
    locationDisclosureAccepted: true,
    appleUserName: 'Jane Doe',
};

// ─── SET_LOADING ──────────────────────────────────────────────────────────────

describe('SET_LOADING', () => {
    it('sets isLoading to true', () => {
        const state = authReducer(INITIAL_STATE, { type: 'SET_LOADING', loading: true });
        expect(state.isLoading).toBe(true);
    });

    it('sets isLoading to false', () => {
        const state = authReducer(
            { ...INITIAL_STATE, isLoading: true },
            { type: 'SET_LOADING', loading: false }
        );
        expect(state.isLoading).toBe(false);
    });

    it('does not change other state', () => {
        const before = { ...AUTHENTICATED_STATE };
        const state = authReducer(before, { type: 'SET_LOADING', loading: false });
        expect(state.session).toBe(before.session);
        expect(state.user).toBe(before.user);
        expect(state.isAuthenticated).toBe(before.isAuthenticated);
    });
});

// ─── SET_SESSION ──────────────────────────────────────────────────────────────

describe('SET_SESSION', () => {
    it('sets isAuthenticated to true when session provided', () => {
        const state = authReducer(INITIAL_STATE, { type: 'SET_SESSION', session: MOCK_SESSION });
        expect(state.isAuthenticated).toBe(true);
    });

    it('sets isAuthenticated to false when session is null', () => {
        const state = authReducer(AUTHENTICATED_STATE, { type: 'SET_SESSION', session: null });
        expect(state.isAuthenticated).toBe(false);
    });

    it('sets session and user from session payload', () => {
        const state = authReducer(INITIAL_STATE, { type: 'SET_SESSION', session: MOCK_SESSION });
        expect(state.session).toBe(MOCK_SESSION);
        expect(state.user).toBe(MOCK_USER);
    });

    it('sets user to null when session is null', () => {
        const state = authReducer(AUTHENTICATED_STATE, { type: 'SET_SESSION', session: null });
        expect(state.user).toBeNull();
        expect(state.session).toBeNull();
    });

    it('sets isLoading to false', () => {
        const state = authReducer(
            { ...INITIAL_STATE, isLoading: true },
            { type: 'SET_SESSION', session: MOCK_SESSION }
        );
        expect(state.isLoading).toBe(false);
    });

    it('resets onboardingChecked to false', () => {
        const state = authReducer(
            { ...AUTHENTICATED_STATE, onboardingChecked: true },
            { type: 'SET_SESSION', session: MOCK_SESSION }
        );
        expect(state.onboardingChecked).toBe(false);
    });

    it('resets needsOnboarding to false', () => {
        const state = authReducer(
            { ...AUTHENTICATED_STATE, needsOnboarding: true },
            { type: 'SET_SESSION', session: MOCK_SESSION }
        );
        expect(state.needsOnboarding).toBe(false);
    });
});

// ─── SET_RECOVERY_SESSION ─────────────────────────────────────────────────────

describe('SET_RECOVERY_SESSION', () => {
    it('sets session and user', () => {
        const state = authReducer(INITIAL_STATE, { type: 'SET_RECOVERY_SESSION', session: MOCK_SESSION });
        expect(state.session).toBe(MOCK_SESSION);
        expect(state.user).toBe(MOCK_USER);
    });

    it('sets isAuthenticated to false even with a valid session', () => {
        const state = authReducer(INITIAL_STATE, { type: 'SET_RECOVERY_SESSION', session: MOCK_SESSION });
        expect(state.isAuthenticated).toBe(false);
    });

    it('does not reset onboardingChecked', () => {
        const state = authReducer(
            { ...AUTHENTICATED_STATE, onboardingChecked: true },
            { type: 'SET_RECOVERY_SESSION', session: MOCK_SESSION }
        );
        expect(state.onboardingChecked).toBe(true);
    });

    it('handles null session', () => {
        const state = authReducer(AUTHENTICATED_STATE, { type: 'SET_RECOVERY_SESSION', session: null });
        expect(state.session).toBeNull();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });
});

// ─── SET_ONBOARDING_STATUS ────────────────────────────────────────────────────

describe('SET_ONBOARDING_STATUS', () => {
    it('sets needsOnboarding to true', () => {
        const state = authReducer(INITIAL_STATE, { type: 'SET_ONBOARDING_STATUS', needsOnboarding: true });
        expect(state.needsOnboarding).toBe(true);
    });

    it('sets needsOnboarding to false', () => {
        const state = authReducer(
            { ...INITIAL_STATE, needsOnboarding: true },
            { type: 'SET_ONBOARDING_STATUS', needsOnboarding: false }
        );
        expect(state.needsOnboarding).toBe(false);
    });

    it('always sets onboardingChecked to true', () => {
        const state = authReducer(
            { ...INITIAL_STATE, onboardingChecked: false },
            { type: 'SET_ONBOARDING_STATUS', needsOnboarding: true }
        );
        expect(state.onboardingChecked).toBe(true);
    });

    it('does not change other state', () => {
        const state = authReducer(
            AUTHENTICATED_STATE,
            { type: 'SET_ONBOARDING_STATUS', needsOnboarding: true }
        );
        expect(state.session).toBe(AUTHENTICATED_STATE.session);
        expect(state.isAuthenticated).toBe(AUTHENTICATED_STATE.isAuthenticated);
    });
});

// ─── SET_PENDING_LINK ─────────────────────────────────────────────────────────

describe('SET_PENDING_LINK', () => {
    it('stores the deep link url', () => {
        const state = authReducer(INITIAL_STATE, {
            type: 'SET_PENDING_LINK',
            url: 'safepath://location/abc',
        });
        expect(state.pendingDeepLink).toBe('safepath://location/abc');
    });

    it('clears the deep link when url is null', () => {
        const state = authReducer(
            { ...INITIAL_STATE, pendingDeepLink: 'safepath://location/abc' },
            { type: 'SET_PENDING_LINK', url: null }
        );
        expect(state.pendingDeepLink).toBeNull();
    });

    it('does not change other state', () => {
        const state = authReducer(AUTHENTICATED_STATE, {
            type: 'SET_PENDING_LINK',
            url: 'safepath://new-link',
        });
        expect(state.session).toBe(AUTHENTICATED_STATE.session);
        expect(state.isAuthenticated).toBe(AUTHENTICATED_STATE.isAuthenticated);
    });
});

// ─── SET_LEGAL_STATUS ─────────────────────────────────────────────────────────

describe('SET_LEGAL_STATUS', () => {
    it('sets both flags to true', () => {
        const state = authReducer(INITIAL_STATE, {
            type: 'SET_LEGAL_STATUS',
            termsAccepted: true,
            locationDisclosureAccepted: true,
        });
        expect(state.termsAccepted).toBe(true);
        expect(state.locationDisclosureAccepted).toBe(true);
    });

    it('sets both flags to false', () => {
        const state = authReducer(AUTHENTICATED_STATE, {
            type: 'SET_LEGAL_STATUS',
            termsAccepted: false,
            locationDisclosureAccepted: false,
        });
        expect(state.termsAccepted).toBe(false);
        expect(state.locationDisclosureAccepted).toBe(false);
    });

    it('can set flags independently', () => {
        const state = authReducer(INITIAL_STATE, {
            type: 'SET_LEGAL_STATUS',
            termsAccepted: true,
            locationDisclosureAccepted: false,
        });
        expect(state.termsAccepted).toBe(true);
        expect(state.locationDisclosureAccepted).toBe(false);
    });

    it('does not change other state', () => {
        const state = authReducer(AUTHENTICATED_STATE, {
            type: 'SET_LEGAL_STATUS',
            termsAccepted: false,
            locationDisclosureAccepted: false,
        });
        expect(state.session).toBe(AUTHENTICATED_STATE.session);
        expect(state.user).toBe(AUTHENTICATED_STATE.user);
    });
});

// ─── SIGN_OUT ─────────────────────────────────────────────────────────────────

describe('SIGN_OUT', () => {
    it('clears session and user', () => {
        const state = authReducer(AUTHENTICATED_STATE, { type: 'SIGN_OUT' });
        expect(state.session).toBeNull();
        expect(state.user).toBeNull();
    });

    it('sets isAuthenticated to false', () => {
        const state = authReducer(AUTHENTICATED_STATE, { type: 'SIGN_OUT' });
        expect(state.isAuthenticated).toBe(false);
    });

    it('sets isLoading to false', () => {
        const state = authReducer(
            { ...AUTHENTICATED_STATE, isLoading: true },
            { type: 'SIGN_OUT' }
        );
        expect(state.isLoading).toBe(false);
    });

    it('resets all onboarding state', () => {
        const state = authReducer(AUTHENTICATED_STATE, { type: 'SIGN_OUT' });
        expect(state.needsOnboarding).toBe(false);
        expect(state.onboardingChecked).toBe(false);
    });

    it('clears pending deep link', () => {
        const state = authReducer(AUTHENTICATED_STATE, { type: 'SIGN_OUT' });
        expect(state.pendingDeepLink).toBeNull();
    });

    it('resets legal acceptance flags', () => {
        const state = authReducer(AUTHENTICATED_STATE, { type: 'SIGN_OUT' });
        expect(state.termsAccepted).toBe(false);
        expect(state.locationDisclosureAccepted).toBe(false);
    });

    it('produces a completely clean state regardless of prior state', () => {
        const state = authReducer(AUTHENTICATED_STATE, { type: 'SIGN_OUT' });
        expect(state).toEqual({
            isLoading: false,
            isAuthenticated: false,
            session: null,
            user: null,
            needsOnboarding: false,
            onboardingChecked: false,
            pendingDeepLink: null,
            termsAccepted: false,
            locationDisclosureAccepted: false,
        });
    });
});

// ─── SET_APPLE_NAME ───────────────────────────────────────────────────────────

describe('SET_APPLE_NAME', () => {
    it('stores the apple user name', () => {
        const state = authReducer(INITIAL_STATE, { type: 'SET_APPLE_NAME', name: 'Jane Doe' });
        expect(state.appleUserName).toBe('Jane Doe');
    });

    it('clears the apple user name when null', () => {
        const state = authReducer(
            { ...INITIAL_STATE, appleUserName: 'Jane Doe' },
            { type: 'SET_APPLE_NAME', name: null }
        );
        expect(state.appleUserName).toBeNull();
    });

    it('does not change other state', () => {
        const state = authReducer(AUTHENTICATED_STATE, { type: 'SET_APPLE_NAME', name: 'New Name' });
        expect(state.session).toBe(AUTHENTICATED_STATE.session);
        expect(state.isAuthenticated).toBe(AUTHENTICATED_STATE.isAuthenticated);
        expect(state.pendingDeepLink).toBe(AUTHENTICATED_STATE.pendingDeepLink);
    });
});