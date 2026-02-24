import {
    calculateDistance,
    calculateDistanceBetweenPoints,
    formatDistance,
} from '../distanceHelpers';

// ─── calculateDistance ────────────────────────────────────────────────────────

describe('calculateDistance', () => {
    it('returns 0 when both coordinates are identical', () => {
        expect(calculateDistance(27.9506, -82.4572, 27.9506, -82.4572)).toBe(0);
    });

    it('returns approximate distance between Tampa and Orlando (~112km)', () => {
        const result = calculateDistance(27.9506, -82.4572, 28.5383, -81.3792);
        expect(result).toBeGreaterThan(110000);
        expect(result).toBeLessThan(130000);
    });

    it('returns a positive number regardless of direction of travel', () => {
        const aToB = calculateDistance(27.9506, -82.4572, 28.5383, -81.3792);
        const bToA = calculateDistance(28.5383, -81.3792, 27.9506, -82.4572);
        expect(aToB).toBeCloseTo(bToA, 0);
    });

    it('handles coordinates in the southern hemisphere', () => {
        // São Paulo, Brazil to Rio de Janeiro
        const result = calculateDistance(-23.5505, -46.6333, -22.9068, -43.1729);
        expect(result).toBeGreaterThan(350000);
        expect(result).toBeLessThan(365000);
    });
});

// ─── calculateDistanceBetweenPoints ──────────────────────────────────────────

describe('calculateDistanceBetweenPoints', () => {
    it('returns the same result as calculateDistance for the same coordinates', () => {
        const direct = calculateDistance(27.9506, -82.4572, 28.5383, -81.3792);
        const fromObjects = calculateDistanceBetweenPoints(
            { latitude: 27.9506, longitude: -82.4572 },
            { latitude: 28.5383, longitude: -81.3792 }
        );
        expect(fromObjects).toBeCloseTo(direct, 5);
    });

    it('returns 0 for identical coordinate objects', () => {
        const result = calculateDistanceBetweenPoints(
            { latitude: 27.9506, longitude: -82.4572 },
            { latitude: 27.9506, longitude: -82.4572 }
        );
        expect(result).toBe(0);
    });
});

// ─── formatDistance ───────────────────────────────────────────────────────────

describe('formatDistance', () => {
    describe('metric (default)', () => {
        it('formats distances under 1000m in meters', () => {
            expect(formatDistance(0)).toBe('0m');
            expect(formatDistance(150)).toBe('150m');
            expect(formatDistance(999)).toBe('999m');
        });

        it('formats distances between 1000m and 10000m in km with 1 decimal', () => {
            expect(formatDistance(1000)).toBe('1.0km');
            expect(formatDistance(1500)).toBe('1.5km');
            expect(formatDistance(9999)).toBe('10.0km');
        });

        it('formats distances over 10000m in whole km', () => {
            expect(formatDistance(10000)).toBe('10km');
            expect(formatDistance(15000)).toBe('15km');
        });

        it('defaults to metric when no unit is specified', () => {
            expect(formatDistance(500)).toBe('500m');
        });
    });

    describe('imperial', () => {
        it('formats distances under 528ft in feet', () => {
            expect(formatDistance(0, 'imperial')).toBe('0ft');
            expect(formatDistance(100, 'imperial')).toBe('328ft');
        });

        it('formats distances between 528ft and 5280ft in miles with 1 decimal', () => {
            // 528ft = ~160.9m, 5280ft = ~1609.3m
            expect(formatDistance(200, 'imperial')).toBe('0.1mi');
            expect(formatDistance(1000, 'imperial')).toBe('0.6mi');
        });

        it('formats distances between 1mi and 10mi in miles with 1 decimal', () => {
            expect(formatDistance(5000, 'imperial')).toBe('3.1mi');
            expect(formatDistance(15000, 'imperial')).toBe('9.3mi');
        });

        it('formats distances over 10mi in whole miles', () => {
            expect(formatDistance(20000, 'imperial')).toBe('12mi');
            expect(formatDistance(50000, 'imperial')).toBe('31mi');
        });
    });
});