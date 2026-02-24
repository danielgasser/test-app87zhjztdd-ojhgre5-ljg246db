import { validateVisitDateTime } from '../dateValidation';

// ─── Setup ────────────────────────────────────────────────────────────────────

// Pin "now" to a fixed point in time for all tests
const FIXED_NOW = new Date('2026-02-23T14:00:00.000Z');

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
});

afterEach(() => {
    jest.useRealTimers();
});

// ─── Valid dates (past) ───────────────────────────────────────────────────────

describe('valid past dates', () => {
    it('returns isValid true for a date 1 hour in the past', () => {
        const past = new Date(FIXED_NOW.getTime() - 60 * 60 * 1000);
        const result = validateVisitDateTime(past);
        expect(result.isValid).toBe(true);
    });

    it('returns the original date unchanged for a past date', () => {
        const past = new Date(FIXED_NOW.getTime() - 60 * 60 * 1000);
        const result = validateVisitDateTime(past);
        expect(result.validatedDate).toEqual(past);
    });

    it('returns no errorMessage for a valid date', () => {
        const past = new Date(FIXED_NOW.getTime() - 1000);
        const result = validateVisitDateTime(past);
        expect(result.errorMessage).toBeUndefined();
    });

    it('accepts a date 1 year in the past', () => {
        const yearAgo = new Date(FIXED_NOW.getTime() - 365 * 24 * 60 * 60 * 1000);
        const result = validateVisitDateTime(yearAgo);
        expect(result.isValid).toBe(true);
        expect(result.validatedDate).toEqual(yearAgo);
    });

    it('accepts a date 5 years in the past', () => {
        const fiveYearsAgo = new Date(FIXED_NOW.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        const result = validateVisitDateTime(fiveYearsAgo);
        expect(result.isValid).toBe(true);
    });

    it('accepts a date 1 minute in the past', () => {
        const oneMinuteAgo = new Date(FIXED_NOW.getTime() - 60 * 1000);
        const result = validateVisitDateTime(oneMinuteAgo);
        expect(result.isValid).toBe(true);
    });

    it('accepts a date 1 second in the past', () => {
        const oneSecondAgo = new Date(FIXED_NOW.getTime() - 1000);
        const result = validateVisitDateTime(oneSecondAgo);
        expect(result.isValid).toBe(true);
    });
});

// ─── Invalid dates (future) ───────────────────────────────────────────────────

describe('invalid future dates', () => {
    it('returns isValid false for a date 1 hour in the future', () => {
        const future = new Date(FIXED_NOW.getTime() + 60 * 60 * 1000);
        const result = validateVisitDateTime(future);
        expect(result.isValid).toBe(false);
    });

    it('returns isValid false for a date 1 second in the future', () => {
        const future = new Date(FIXED_NOW.getTime() + 1000);
        const result = validateVisitDateTime(future);
        expect(result.isValid).toBe(false);
    });

    it('returns isValid false for a date 1 year in the future', () => {
        const future = new Date(FIXED_NOW.getTime() + 365 * 24 * 60 * 60 * 1000);
        const result = validateVisitDateTime(future);
        expect(result.isValid).toBe(false);
    });

    it('returns the correct error message for a future date', () => {
        const future = new Date(FIXED_NOW.getTime() + 60 * 60 * 1000);
        const result = validateVisitDateTime(future);
        expect(result.errorMessage).toBe('Visit time cannot be in the future');
    });

    it('returns current time as validatedDate when future date provided', () => {
        const future = new Date(FIXED_NOW.getTime() + 60 * 60 * 1000);
        const result = validateVisitDateTime(future);
        expect(result.validatedDate).toEqual(FIXED_NOW);
    });

    it('validatedDate is always a valid Date object even on failure', () => {
        const future = new Date(FIXED_NOW.getTime() + 1000);
        const result = validateVisitDateTime(future);
        expect(result.validatedDate).toBeInstanceOf(Date);
        expect(isNaN(result.validatedDate.getTime())).toBe(false);
    });
});

// ─── Boundary: exactly now ────────────────────────────────────────────────────

describe('boundary — exactly now', () => {
    it('treats exactly-now as valid (not future)', () => {
        // new Date() inside the function equals FIXED_NOW due to fake timers
        // visitDateTime > new Date() is false when equal
        const result = validateVisitDateTime(new Date(FIXED_NOW));
        expect(result.isValid).toBe(true);
    });
});

// ─── Return shape ─────────────────────────────────────────────────────────────

describe('return shape', () => {
    it('always returns an object with isValid and validatedDate', () => {
        const past = new Date(FIXED_NOW.getTime() - 1000);
        const result = validateVisitDateTime(past);
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('validatedDate');
    });

    it('validatedDate is always a Date instance for past input', () => {
        const past = new Date(FIXED_NOW.getTime() - 1000);
        const result = validateVisitDateTime(past);
        expect(result.validatedDate).toBeInstanceOf(Date);
    });

    it('validatedDate is always a Date instance for future input', () => {
        const future = new Date(FIXED_NOW.getTime() + 1000);
        const result = validateVisitDateTime(future);
        expect(result.validatedDate).toBeInstanceOf(Date);
    });
});