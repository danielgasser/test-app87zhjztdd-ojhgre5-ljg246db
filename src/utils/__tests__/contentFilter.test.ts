jest.unmock('@2toad/profanity');
import { isProfane, assertClean } from '../contentFilter';
import { notify } from '../../__mocks__/utils/notificationService';
const mockNotifyError = notify.error as jest.Mock;

describe('isProfane', () => {
    it('returns false for clean text', () => {
        expect(isProfane('This place was great!')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isProfane('')).toBe(false);
    });

    it('returns false for null', () => {
        expect(isProfane(null as any)).toBe(false);
    });

    it('returns false for undefined', () => {
        expect(isProfane(undefined as any)).toBe(false);
    });

    it('returns true for a profane word', () => {
        expect(isProfane('This is bullshit')).toBe(true);
    });

    it('is case-insensitive', () => {
        expect(isProfane('BULLSHIT')).toBe(true);
    });
});

describe('assertClean', () => {
    it('does not throw for clean text', () => {
        expect(() => assertClean('Nice location')).not.toThrow();
    });

    it('throws for profane text', () => {
        expect(() => assertClean('This is bullshit')).toThrow();
    });

    it('thrown error message contains a user-friendly message', () => {
        expect(() => assertClean('This is bullshit')).toThrow(
            'Your text contains inappropriate language. Please revise before submitting.'
        );
    });

    it('does not throw for empty string', () => {
        expect(() => assertClean('')).not.toThrow();
    });
});

describe("contentFilter integration — filtering logic", () => {
    it("clean text is not profane", () => {
        expect(isProfane("Nice place")).toBe(false);
    });

    it("profane text is detected", () => {
        expect(isProfane("This is bullshit")).toBe(true);
    });

    it("notify.error is a jest mock (auto-mock wired correctly)", () => {
        notify.error("test");
        expect(mockNotifyError).toHaveBeenCalledWith("test");
    });
});