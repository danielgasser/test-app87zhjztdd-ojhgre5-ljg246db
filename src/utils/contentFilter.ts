import { Profanity, ProfanityOptions } from '@2toad/profanity';

const options = new ProfanityOptions();
options.wholeWord = true;

const profanity = new Profanity(options);

/**
 * Returns true if the text contains profane language.
 * Safe to call with null/undefined.
 */
export function isProfane(text: string | null | undefined): boolean {
    if (!text) return false;
    return profanity.exists(text);
}

/**
 * Throws a user-friendly error if the text contains profane language.
 * Use this at form submission boundaries.
 */
export function assertClean(text: string | null | undefined): void {
    if (isProfane(text)) {
        throw new Error(
            'Your text contains inappropriate language. Please revise before submitting.'
        );
    }
}