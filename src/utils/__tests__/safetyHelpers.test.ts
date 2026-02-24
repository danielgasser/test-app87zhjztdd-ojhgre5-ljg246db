import { getSafetyColor, getSeverityColor, getRouteLineColor } from '../safetyHelpers';

// ─── getSafetyColor ───────────────────────────────────────────────────────────

describe('getSafetyColor', () => {
    it('returns green for scores at or above the safe threshold (4.0)', () => {
        expect(getSafetyColor(4.0)).toBe('#4CAF50');
        expect(getSafetyColor(5.0)).toBe('#4CAF50');
        expect(getSafetyColor(4.5)).toBe('#4CAF50');
    });

    it('returns yellow for scores between mixed and safe thresholds (3.0 - 3.9)', () => {
        expect(getSafetyColor(3.0)).toBe('#FFC107');
        expect(getSafetyColor(3.5)).toBe('#FFC107');
        expect(getSafetyColor(3.9)).toBe('#FFC107');
    });

    it('returns red for scores below the mixed threshold (< 3.0)', () => {
        expect(getSafetyColor(2.9)).toBe('#F44336');
        expect(getSafetyColor(1.0)).toBe('#F44336');
        expect(getSafetyColor(0)).toBe('#F44336');
    });
});

// ─── getSeverityColor ─────────────────────────────────────────────────────────

describe('getSeverityColor', () => {
    it('returns error color for high severity', () => {
        expect(getSeverityColor('high')).toBe('#EF5350');
    });

    it('returns mixedYellow for medium severity', () => {
        expect(getSeverityColor('medium')).toBe('#FFB74D');
    });

    it('returns secondary green for low severity', () => {
        expect(getSeverityColor('low')).toBe('#5FB878');
    });
});

// ─── getRouteLineColor ────────────────────────────────────────────────────────

describe('getRouteLineColor', () => {
    it('returns selected route color when no safety_analysis is present', () => {
        expect(getRouteLineColor({})).toBe('#2A5C99');
        expect(getRouteLineColor({ safety_analysis: null })).toBe('#2A5C99');
    });

    it('returns green for a safe overall route score', () => {
        const route = { safety_analysis: { overall_route_score: 4.5 } };
        expect(getRouteLineColor(route)).toBe('#4CAF50');
    });

    it('returns yellow for a mixed overall route score', () => {
        const route = { safety_analysis: { overall_route_score: 3.2 } };
        expect(getRouteLineColor(route)).toBe('#FFC107');
    });

    it('returns red for an unsafe overall route score', () => {
        const route = { safety_analysis: { overall_route_score: 1.8 } };
        expect(getRouteLineColor(route)).toBe('#F44336');
    });
});