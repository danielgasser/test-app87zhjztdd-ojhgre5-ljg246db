import {
    determineBestRouteName,
    determineRouteType,
} from '../routeHelpers';
import type { RouteSafetyAnalysis, RouteRequest } from '@/store/locationsSlice';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildSafetyAnalysis = (
    overall_route_score: number
): RouteSafetyAnalysis => ({
    overall_route_score,
    safety_notes: [],
    confidence_score: null,
});

const buildPreferences = (
    overrides: Partial<RouteRequest['route_preferences']> = {}
): RouteRequest['route_preferences'] => ({
    prioritize_safety: false,
    avoid_evening_danger: false,
    max_detour_minutes: 30,
    ...overrides,
});

// ─── determineBestRouteName ───────────────────────────────────────────────────

describe('determineBestRouteName', () => {
    describe('Safe Route (score >= 4.0)', () => {
        it('returns "Safe Route" for score of 4.0 (exact threshold)', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(4.0))).toBe('Safe Route');
        });

        it('returns "Safe Route" for score of 4.5', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(4.5))).toBe('Safe Route');
        });

        it('returns "Safe Route" for perfect score of 5.0', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(5.0))).toBe('Safe Route');
        });

        it('returns "Safe Route" for score just above threshold (4.01)', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(4.01))).toBe('Safe Route');
        });
    });

    describe('Moderate Safety Route (3.0 <= score < 4.0)', () => {
        it('returns "Moderate Safety Route" for score of 3.0 (exact threshold)', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(3.0))).toBe('Moderate Safety Route');
        });

        it('returns "Moderate Safety Route" for score of 3.5', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(3.5))).toBe('Moderate Safety Route');
        });

        it('returns "Moderate Safety Route" for score just below safe threshold (3.99)', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(3.99))).toBe('Moderate Safety Route');
        });

        it('returns "Moderate Safety Route" for score just above caution threshold (3.01)', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(3.01))).toBe('Moderate Safety Route');
        });
    });

    describe('Caution Advised Route (score < 3.0)', () => {
        it('returns "Caution Advised Route" for score just below threshold (2.99)', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(2.99))).toBe('Caution Advised Route');
        });

        it('returns "Caution Advised Route" for score of 2.0', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(2.0))).toBe('Caution Advised Route');
        });

        it('returns "Caution Advised Route" for worst score of 1.0', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(1.0))).toBe('Caution Advised Route');
        });

        it('returns "Caution Advised Route" for score of 0', () => {
            expect(determineBestRouteName(buildSafetyAnalysis(0))).toBe('Caution Advised Route');
        });
    });
});

// ─── determineRouteType ───────────────────────────────────────────────────────

describe('determineRouteType', () => {
    describe('prioritize_safety: true — always returns "safest"', () => {
        it('returns "safest" when prioritize_safety is true, regardless of high score', () => {
            expect(determineRouteType(buildSafetyAnalysis(5.0), buildPreferences({ prioritize_safety: true }))).toBe('safest');
        });

        it('returns "safest" when prioritize_safety is true with moderate score', () => {
            expect(determineRouteType(buildSafetyAnalysis(3.5), buildPreferences({ prioritize_safety: true }))).toBe('safest');
        });

        it('returns "safest" when prioritize_safety is true with low score', () => {
            expect(determineRouteType(buildSafetyAnalysis(1.0), buildPreferences({ prioritize_safety: true }))).toBe('safest');
        });

        it('prioritize_safety takes precedence over score >= 4.0', () => {
            // Even with a "safe" score, user explicitly wants safety-first routing
            expect(determineRouteType(buildSafetyAnalysis(4.5), buildPreferences({ prioritize_safety: true }))).toBe('safest');
        });
    });

    describe('prioritize_safety: false, score >= 4.0 — returns "balanced"', () => {
        it('returns "balanced" for score of 4.0 (exact threshold)', () => {
            expect(determineRouteType(buildSafetyAnalysis(4.0), buildPreferences())).toBe('balanced');
        });

        it('returns "balanced" for score of 4.5', () => {
            expect(determineRouteType(buildSafetyAnalysis(4.5), buildPreferences())).toBe('balanced');
        });

        it('returns "balanced" for perfect score of 5.0', () => {
            expect(determineRouteType(buildSafetyAnalysis(5.0), buildPreferences())).toBe('balanced');
        });

        it('returns "balanced" for score just above threshold (4.01)', () => {
            expect(determineRouteType(buildSafetyAnalysis(4.01), buildPreferences())).toBe('balanced');
        });
    });

    describe('prioritize_safety: false, score < 4.0 — returns "fastest"', () => {
        it('returns "fastest" for score just below threshold (3.99)', () => {
            expect(determineRouteType(buildSafetyAnalysis(3.99), buildPreferences())).toBe('fastest');
        });

        it('returns "fastest" for score of 3.0', () => {
            expect(determineRouteType(buildSafetyAnalysis(3.0), buildPreferences())).toBe('fastest');
        });

        it('returns "fastest" for score of 1.0', () => {
            expect(determineRouteType(buildSafetyAnalysis(1.0), buildPreferences())).toBe('fastest');
        });

        it('returns "fastest" for score of 0', () => {
            expect(determineRouteType(buildSafetyAnalysis(0), buildPreferences())).toBe('fastest');
        });
    });

    describe('other preferences do not affect route type', () => {
        it('avoid_evening_danger does not change route type', () => {
            expect(
                determineRouteType(
                    buildSafetyAnalysis(4.5),
                    buildPreferences({ avoid_evening_danger: true, prioritize_safety: false })
                )
            ).toBe('balanced');
        });

        it('max_detour_minutes does not change route type', () => {
            expect(
                determineRouteType(
                    buildSafetyAnalysis(2.0),
                    buildPreferences({ max_detour_minutes: 60, prioritize_safety: false })
                )
            ).toBe('fastest');
        });
    });
});