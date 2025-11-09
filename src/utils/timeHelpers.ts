/**
 * TIME FORMATTING UTILITIES
 * Centralized time/date formatting functions
 * 
 * USED BY:
 * - app/_layout.tsx
 * - app/(tabs)/community.tsx
 * - src/components/LocationDetailsModal.tsx
 */

import { formatDistanceToNow } from 'date-fns';

/**
 * Format a date/time as relative time ago (e.g., "2 hours ago")
 * @param date - Date object or ISO string
 * @returns Formatted relative time string
 */
export function formatTimeAgo(date: Date | string): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Check if a date/time is in the future
 * @param date - Date to check
 * @returns true if date is in the future
 */
export function isInFuture(date: Date): boolean {
    return date > new Date();
}

/**
 * Calculate hours between a past date and now
 * @param pastDate - Past date to calculate from
 * @returns Number of hours elapsed
 */
export function hoursAgo(pastDate: Date | string): number {
    const past = new Date(pastDate);
    return (Date.now() - past.getTime()) / (1000 * 60 * 60);
}