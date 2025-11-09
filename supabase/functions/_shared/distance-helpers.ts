/**
 * ⚠️ MIRRORED FROM: src/utils/distanceHelpers.ts
 * Keep these implementations IDENTICAL to frontend version!
 * 
 * EDGE FUNCTION DISTANCE UTILITIES
 * Deno/Edge Function version of distance calculations
 * 
 * USED BY:
 * - supabase/functions/route-safety-scorer/index.ts
 * - supabase/functions/notification-helpers.ts
 * - supabase/functions/smart-route-generator/index.ts
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
 * Format distance for display (server-side)
 * @param meters - Distance in meters
 * @returns Formatted string (e.g., "150m" or "1.2km")
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Calculate distance between coordinate objects
 * Convenience wrapper for Edge Function coordinate types
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