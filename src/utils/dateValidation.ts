/**
 * DATE VALIDATION UTILITIES
 * Centralized date/time validation logic
 * 
 * USED BY:
 * - app/review.tsx (visit date validation)
 * - app/edit-review.tsx (visit date validation)
 */

/**
 * Validate and sanitize a visit datetime
 * Returns current time if provided datetime is in future
 * @param visitDateTime - Proposed visit date/time
 * @returns Validated datetime (current time if future detected)
 */
export function validateVisitDateTime(visitDateTime: Date): {
    isValid: boolean;
    validatedDate: Date;
    errorMessage?: string;
} {
    if (visitDateTime > new Date()) {
        return {
            isValid: false,
            validatedDate: new Date(),
            errorMessage: 'Visit time cannot be in the future'
        };
    }

    return {
        isValid: true,
        validatedDate: visitDateTime
    };
}