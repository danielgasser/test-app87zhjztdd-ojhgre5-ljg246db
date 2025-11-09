/**
 * DATE VALIDATION UTILITIES
 * Centralized date/time validation logic
 * 
 * USED BY:
 * - app/review.tsx (visit date validation)
 * - app/edit-review.tsx (visit date validation)
 */

/**
 * Validate that a date/time is not in the future
 * If it is, returns a Date object set to current time
 * @param dateTime - Date to validate
 * @returns Valid date (either original or current time if future)
 */
export function validateNotFuture(dateTime: Date): Date {
    if (dateTime > new Date()) {
        return new Date(); // Return current time if future
    }
    return dateTime;
}

/**
 * Check if combined date + time is in future
 * @param date - Date component
 * @param time - Time component (hours/minutes)
 * @returns true if the combined datetime is in future
 */
export function isCombinedDateTimeFuture(
    date: Date,
    time: { hours: number; minutes: number }
): boolean {
    const combined = new Date(date);
    combined.setHours(time.hours);
    combined.setMinutes(time.minutes);
    return combined > new Date();
}

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