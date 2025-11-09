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

/**
 * Format duration in minutes to human-readable format
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "5 min", "1h 15m", "2h 30m")
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${Math.round(minutes)} min`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (mins === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${mins}m`;
}

/**
 * Calculate and format arrival time based on duration
 * @param durationMinutes - Duration in minutes from now
 * @param use24Hour - Use 24-hour format (true) or 12-hour format (false), defaults to false
 * @returns Formatted arrival time (e.g., "3:45 PM" or "15:45")
 */
export function formatArrivalTime(durationMinutes: number, use24Hour: boolean = false): string {
    const now = new Date();
    const arrival = new Date(now.getTime() + durationMinutes * 60000);

    return arrival.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !use24Hour // Invert: use24Hour=true means hour12=false
    });
}