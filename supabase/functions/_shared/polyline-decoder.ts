/**
 * GOOGLE POLYLINE DECODER
 * Decodes Google Maps encoded polyline strings to coordinate arrays
 * 
 * USED BY:
 * - supabase/functions/smart-route-generator/index.ts
 * - Any Edge Function that processes Google Maps routes
 * 
 * Algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

/**
 * Decode Google's encoded polyline format to coordinate array
 * @param encoded - Encoded polyline string from Google Maps API
 * @returns Array of [longitude, latitude] coordinate pairs
 */
export function decodePolyline(encoded: string): [number, number][] {
    const coordinates: [number, number][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        // Decode latitude
        let shift = 0;
        let result = 0;
        let byte;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += deltaLat;

        // Decode longitude
        shift = 0;
        result = 0;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += deltaLng;

        // Google format is lat/lng but we return lng/lat for GeoJSON compatibility
        coordinates.push([lng / 1e5, lat / 1e5]);
    }

    return coordinates;
}

/**
 * Decode polyline to latitude-first coordinate pairs
 * Useful when you need [lat, lng] instead of [lng, lat]
 * @param encoded - Encoded polyline string
 * @returns Array of [latitude, longitude] coordinate pairs
 */
export function decodePolylineLatLng(encoded: string): [number, number][] {
    const lngLatCoords = decodePolyline(encoded);
    return lngLatCoords.map(([lng, lat]) => [lat, lng]);
}