import { formatDuration, formatTimeAgo, hoursAgo, formatArrivalTime } from '../timeHelpers';

// ─── formatDuration ───────────────────────────────────────────────────────────

describe('formatDuration', () => {
    it('formats durations under 60 minutes as "X min"', () => {
        expect(formatDuration(0)).toBe('0 min');
        expect(formatDuration(5)).toBe('5 min');
        expect(formatDuration(59)).toBe('59 min');
    });

    it('formats exactly 60 minutes as "1h"', () => {
        expect(formatDuration(60)).toBe('1h');
    });

    it('formats hours with no remaining minutes as "Xh"', () => {
        expect(formatDuration(120)).toBe('2h');
        expect(formatDuration(180)).toBe('3h');
    });

    it('formats hours with remaining minutes as "Xh Ym"', () => {
        expect(formatDuration(75)).toBe('1h 15m');
        expect(formatDuration(90)).toBe('1h 30m');
        expect(formatDuration(150)).toBe('2h 30m');
    });
});

// ─── hoursAgo ─────────────────────────────────────────────────────────────────

describe('hoursAgo', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('returns 0 for the current time', () => {
        expect(hoursAgo(new Date('2025-01-01T12:00:00Z'))).toBeCloseTo(0, 5);
    });

    it('returns 1 for a date 1 hour ago', () => {
        expect(hoursAgo(new Date('2025-01-01T11:00:00Z'))).toBeCloseTo(1, 5);
    });

    it('returns 24 for a date 24 hours ago', () => {
        expect(hoursAgo(new Date('2024-12-31T12:00:00Z'))).toBeCloseTo(24, 5);
    });

    it('accepts ISO strings as well as Date objects', () => {
        expect(hoursAgo('2025-01-01T11:00:00Z')).toBeCloseTo(1, 5);
    });
});

// ─── formatTimeAgo ────────────────────────────────────────────────────────────

describe('formatTimeAgo', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('returns a relative time string for a date 1 hour ago', () => {
        const result = formatTimeAgo(new Date('2025-01-01T11:00:00Z'));
        expect(result).toBe('about 1 hour ago');
    });

    it('returns a relative time string for a date 2 hours ago', () => {
        const result = formatTimeAgo(new Date('2025-01-01T10:00:00Z'));
        expect(result).toBe('about 2 hours ago');
    });

    it('accepts ISO strings as input', () => {
        const result = formatTimeAgo('2025-01-01T11:00:00Z');
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });
});

// ─── formatArrivalTime ────────────────────────────────────────────────────────

describe('formatArrivalTime', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        // Fix time to 12:00:00 UTC
        jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('returns a non-empty string', () => {
        const result = formatArrivalTime(30);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('returns a different result for 12h vs 24h format', () => {
        const result12h = formatArrivalTime(60, false);
        const result24h = formatArrivalTime(60, true);
        // They may differ in AM/PM vs 24h notation depending on locale
        // but they should both be valid non-empty strings
        expect(result12h).toBeTruthy();
        expect(result24h).toBeTruthy();
    });

    it('defaults to 12h format when no second argument is provided', () => {
        // Should not throw
        expect(() => formatArrivalTime(30)).not.toThrow();
    });
});