/**
 * ⚠️ SOURCE OF TRUTH FOR DISTANCE CALCULATIONS
 * If you modify this, also update:
 * - supabase/functions/_shared/distance-helpers.ts (Edge Function mirror)
 * 
 * USED BY:
 * - src/components/NavigationMode.tsx
 * - app/(tabs)/index.tsx
 * - Any other frontend location calculations
 */

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Format distance for display with metric or imperial units
 * @param meters - Distance in meters
 * @param unit - Unit system ('metric' | 'imperial'), defaults to 'metric'
 * @returns Formatted string (e.g., "150m", "1.2km", "350ft", "2.5mi")
 */
export function formatDistance(meters: number, unit: 'metric' | 'imperial' = 'metric'): string {
    if (unit === 'imperial') {
        const feet = meters * 3.28084;
        const miles = meters * 0.000621371;

        // 0-528ft (0.1mi) → show feet
        if (feet < 528) {
            return `${Math.round(feet)}ft`;
        }
        // 528-5279ft (0.1-1mi) → show miles with 1 decimal
        if (feet < 5280) {
            return `${miles.toFixed(1)}mi`;
        }
        // 5280-52799ft (1-10mi) → show miles with 1 decimal
        if (miles < 10) {
            return `${miles.toFixed(1)}mi`;
        }
        // 10mi+ → show miles with no decimals
        return `${Math.round(miles)}mi`;
    }

    // Metric (default)
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    if (meters < 10000) {
        return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters / 1000)}km`;
}

/**
 * Calculate distance between two coordinate objects
 * Convenience wrapper for objects with latitude/longitude properties
 */
export function calculateDistanceBetweenPoints(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
): number {
    return calculateDistance(
        coord1.latitude,
        coord1.longitude,
        coord2.latitude,
        coord2.longitude
    );
}