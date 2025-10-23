/**
 * Google Places API Service
 * 
 * Provides wrapper functions for Google Places API endpoints:
 * - Autocomplete: Search suggestions as user types
 * - Place Details: Get full information about a place
 * - Nearby Search: Find places near a location
 * - Geocoding: Address <-> Coordinates conversion
 */

import { mapGooglePlaceType } from '@/utils/placeTypeMappers';
import { logger } from "@/utils/logger";


// ================================
// TYPES
// ================================

export interface PlaceAutocompleteResult {
    place_id: string;
    description: string;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
    types: string[];
}

export interface PlaceDetails {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    types: string[];
    formatted_phone_number?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
    opening_hours?: {
        open_now: boolean;
        weekday_text: string[];
    };
    photos?: Array<{
        photo_reference: string;
        height: number;
        width: number;
    }>;
    reviews?: Array<{
        author_name: string;
        rating: number;
        text: string;
        time: number;
    }>;
}

export interface NearbySearchResult {
    place_id: string;
    name: string;
    vicinity: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    types: string[];
    rating?: number;
    user_ratings_total?: number;
    opening_hours?: {
        open_now: boolean;
    };
}

export interface GeocodingResult {
    place_id: string;
    formatted_address: string;
    address_components: Array<{
        long_name: string;
        short_name: string;
        types: string[];
    }>;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    types: string[];
}

// ================================
// SESSION TOKEN MANAGEMENT
// ================================

/**
 * Session tokens for billing optimization
 * Google charges per autocomplete SESSION, not per keystroke
 * A session = autocomplete queries + place details call
 */
class SessionTokenManager {
    private currentToken: string | null = null;

    generate(): string {
        // Simple UUID v4 generator
        this.currentToken = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return this.currentToken;
    }

    get(): string {
        if (!this.currentToken) {
            return this.generate();
        }
        return this.currentToken;
    }

    clear(): void {
        this.currentToken = null;
    }
}

const sessionTokenManager = new SessionTokenManager();

// ================================
// HELPER FUNCTIONS
// ================================

function getApiKey(): string {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        throw new Error('Google Maps API key not configured');
    }
    return apiKey;
}

async function fetchGoogleApi(url: string): Promise<any> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google API status: ${data.status}`);
    }

    return data;
}

// ================================
// AUTOCOMPLETE
// ================================

export interface AutocompleteOptions {
    query: string;
    latitude?: number;
    longitude?: number;
    radius?: number;  // in meters
    types?: string;   // e.g., 'establishment', 'geocode'
    components?: string;  // e.g., 'country:us'
}

/**
 * Get place autocomplete suggestions as user types
 * Uses session tokens for billing optimization
 */
export async function getPlaceAutocomplete(
    options: AutocompleteOptions
): Promise<PlaceAutocompleteResult[]> {
    const { query, latitude, longitude, radius, types, components } = options;

    if (query.length < 2) {
        return [];
    }

    const apiKey = getApiKey();
    const sessionToken = sessionTokenManager.get();

    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
        `input=${encodeURIComponent(query)}` +
        `&key=${apiKey}` +
        `&sessiontoken=${sessionToken}`;

    // Location bias (show nearby results first)
    if (latitude && longitude) {
        url += `&location=${latitude},${longitude}`;
        if (radius) {
            url += `&radius=${radius}`;
        }
    }

    // Filter by place types
    if (types) {
        url += `&types=${types}`;
    }

    // Filter by country/region
    if (components) {
        url += `&components=${components}`;
    }

    try {
        const data = await fetchGoogleApi(url);
        return data.predictions || [];
    } catch (error) {
        logger.error('Autocomplete error:', error);
        return [];
    }
}

// ================================
// PLACE DETAILS
// ================================

export interface PlaceDetailsOptions {
    place_id: string;
    fields?: string[];  // Specific fields to retrieve (saves money)
    clearSession?: boolean;  // Whether to clear session token after this call
}

/**
 * Get detailed information about a place
 * Call this after user selects from autocomplete
 * Automatically clears session token after call (for billing)
 */
export async function getPlaceDetails(
    options: PlaceDetailsOptions
): Promise<PlaceDetails | null> {
    const { place_id, fields, clearSession = true } = options;

    const apiKey = getApiKey();
    const sessionToken = sessionTokenManager.get();

    // Default fields if not specified (optimize costs by only requesting what you need)
    const requestFields = fields || [
        'place_id',
        'name',
        'formatted_address',
        'geometry',
        'types',
        'formatted_phone_number',
        'website',
        'rating',
        'user_ratings_total',
        'opening_hours',
        'photos',
    ];

    const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${place_id}` +
        `&fields=${requestFields.join(',')}` +
        `&key=${apiKey}` +
        `&sessiontoken=${sessionToken}`;

    try {
        const data = await fetchGoogleApi(url);

        // Clear session token after getting details (completes the billing session)
        if (clearSession) {
            sessionTokenManager.clear();
        }

        return data.result || null;
    } catch (error) {
        logger.error('Place details error:', error);
        if (clearSession) {
            sessionTokenManager.clear();
        }
        return null;
    }
}

// ================================
// NEARBY SEARCH
// ================================

export interface NearbySearchOptions {
    latitude: number;
    longitude: number;
    radius: number;  // in meters (max 50000)
    type?: string;   // e.g., 'restaurant', 'cafe'
    keyword?: string;  // search keyword
    minprice?: number;  // 0-4
    maxprice?: number;  // 0-4
    opennow?: boolean;  // only places open now
}

/**
 * Find places near a location
 * Useful for "Explore Nearby" features
 */
export async function getNearbyPlaces(
    options: NearbySearchOptions
): Promise<NearbySearchResult[]> {
    const { latitude, longitude, radius, type, keyword, minprice, maxprice, opennow } = options;

    const apiKey = getApiKey();

    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${latitude},${longitude}` +
        `&radius=${Math.min(radius, 50000)}` +  // Max 50km
        `&key=${apiKey}`;

    if (type) {
        url += `&type=${type}`;
    }

    if (keyword) {
        url += `&keyword=${encodeURIComponent(keyword)}`;
    }

    if (minprice !== undefined) {
        url += `&minprice=${minprice}`;
    }

    if (maxprice !== undefined) {
        url += `&maxprice=${maxprice}`;
    }

    if (opennow) {
        url += `&opennow=true`;
    }

    try {
        const data = await fetchGoogleApi(url);
        return data.results || [];
    } catch (error) {
        logger.error('Nearby search error:', error);
        return [];
    }
}

// ================================
// GEOCODING
// ================================

export interface ForwardGeocodeOptions {
    address: string;
    components?: string;  // e.g., 'country:us'
    bounds?: {
        southwest: { lat: number; lng: number };
        northeast: { lat: number; lng: number };
    };
}

/**
 * Convert address to coordinates (Forward Geocoding)
 */
export async function forwardGeocode(
    options: ForwardGeocodeOptions
): Promise<GeocodingResult[]> {
    const { address, components, bounds } = options;

    const apiKey = getApiKey();

    let url = `https://maps.googleapis.com/maps/api/geocode/json?` +
        `address=${encodeURIComponent(address)}` +
        `&key=${apiKey}`;

    if (components) {
        url += `&components=${components}`;
    }

    if (bounds) {
        url += `&bounds=${bounds.southwest.lat},${bounds.southwest.lng}|${bounds.northeast.lat},${bounds.northeast.lng}`;
    }

    try {
        const data = await fetchGoogleApi(url);
        return data.results || [];
    } catch (error) {
        logger.error('Forward geocoding error:', error);
        return [];
    }
}

export interface ReverseGeocodeOptions {
    latitude: number;
    longitude: number;
    result_type?: string[];  // e.g., ['street_address', 'route']
    location_type?: string[];  // e.g., ['ROOFTOP', 'RANGE_INTERPOLATED']
}

/**
 * Convert coordinates to address (Reverse Geocoding)
 */
export async function reverseGeocode(
    options: ReverseGeocodeOptions
): Promise<GeocodingResult[]> {
    const { latitude, longitude, result_type, location_type } = options;

    const apiKey = getApiKey();

    let url = `https://maps.googleapis.com/maps/api/geocode/json?` +
        `latlng=${latitude},${longitude}` +
        `&key=${apiKey}`;

    if (result_type && result_type.length > 0) {
        url += `&result_type=${result_type.join('|')}`;
    }

    if (location_type && location_type.length > 0) {
        url += `&location_type=${location_type.join('|')}`;
    }

    try {
        const data = await fetchGoogleApi(url);
        return data.results || [];
    } catch (error) {
        logger.error('Reverse geocoding error:', error);
        return [];
    }
}

// ================================
// HELPER: PHOTO URL
// ================================

/**
 * Get URL for a place photo
 * @param photoReference - from place details or nearby search
 * @param maxWidth - max width in pixels (max 1600)
 */
export function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    const apiKey = getApiKey();
    return `https://maps.googleapis.com/maps/api/place/photo?` +
        `maxwidth=${Math.min(maxWidth, 1600)}` +
        `&photo_reference=${photoReference}` +
        `&key=${apiKey}`;
}

// ================================
// EXPORTS
// ================================

export const googlePlacesService = {
    // Autocomplete
    autocomplete: getPlaceAutocomplete,

    // Place Details
    getDetails: getPlaceDetails,

    // Nearby Search
    nearbySearch: getNearbyPlaces,

    // Geocoding
    forwardGeocode,
    reverseGeocode,

    // Photos
    getPhotoUrl,

    // Session Management (if needed manually)
    session: {
        generate: () => sessionTokenManager.generate(),
        clear: () => sessionTokenManager.clear(),
    },
};