import { notify } from "./notificationService";
import { logger } from '@/utils/logger';

/**
 * Get the user's country code from their coordinates using reverse geocoding
 * Returns ISO 3166-1 alpha-2 country code (e.g., 'ch', 'us', 'de')
 */
export const getUserCountry = async (
    userLocation: { latitude: number; longitude: number } | null
): Promise<string> => {
    const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!googleApiKey || !userLocation) {
        return 'us';
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.latitude},${userLocation.longitude}&key=${googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results[0]) {
            const countryComponent = data.results[0].address_components.find(
                (c: any) => c.types.includes('country')
            );
            const countryCode = countryComponent?.short_name?.toLowerCase() || 'us';
            return countryCode;
        }

        return 'us';
    } catch (error) {
        logger.error('no user country found', error)
        notify.error('❌ We couldn\'t get your country:');
        return 'us';
    }
};

export const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number
): Promise<string | null> => {
    const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!googleApiKey) {
        logger.error('Google Maps API key not configured');
        return null;
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
            logger.warn('No geocoding results found for coordinates:', { latitude, longitude });
            return null;
        }

        // Try to find the best address format in order of preference:
        // 1. Street address (most specific)
        // 2. Route/street name
        // 3. Locality (neighborhood)
        // 4. City/town
        // 5. Fallback to formatted_address

        // Look for street address result
        const streetAddress = data.results.find((result: any) =>
            result.types.includes('street_address') || result.types.includes('premise')
        );

        if (streetAddress) {
            // Extract street number + route from address_components
            const streetNumber = streetAddress.address_components.find((c: any) =>
                c.types.includes('street_number')
            );
            const route = streetAddress.address_components.find((c: any) =>
                c.types.includes('route')
            );

            if (streetNumber && route) {
                return `${streetNumber.long_name} ${route.long_name}`;
            }
            if (route) {
                return route.long_name;
            }
        }

        // Look for route/neighborhood/locality
        const locality = data.results.find((result: any) =>
            result.types.includes('route') ||
            result.types.includes('neighborhood') ||
            result.types.includes('locality')
        );

        if (locality) {
            const name = locality.address_components.find((c: any) =>
                c.types.includes('route') ||
                c.types.includes('neighborhood') ||
                c.types.includes('locality')
            );
            if (name) {
                return name.long_name;
            }
        }

        // Fallback: use the first formatted_address
        return data.results[0].formatted_address;

    } catch (error) {
        logger.error('Error getting address from coordinates:', error);
        return null;
    }
};

/**
 * Get complete address details from coordinates using reverse geocoding
 * Returns all address components needed for location creation
 */
export const getCompleteAddressFromCoordinates = async (
    latitude: number,
    longitude: number
): Promise<{
    address: string;
    city: string;
    state_province: string;
    country: string;
    postal_code: string | null;
} | null> => {
    const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!googleApiKey) {
        logger.error('Google Maps API key not configured');
        return null;
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
            logger.warn('No geocoding results found for coordinates:', { latitude, longitude });
            return null;
        }

        const result = data.results[0];
        const components = result.address_components;

        // Helper to extract component by type
        const getComponent = (types: string[]) => {
            const component = components.find((c: any) =>
                types.some(type => c.types.includes(type))
            );
            return component?.long_name || null;
        };

        // Get street address
        let address = '';
        const streetNumber = getComponent(['street_number']);
        const route = getComponent(['route']);

        if (streetNumber && route) {
            address = `${streetNumber} ${route}`;
        } else if (route) {
            address = route;
        } else {
            // Fallback to locality or formatted address
            address = getComponent(['locality', 'neighborhood']) || result.formatted_address;
        }

        const city = getComponent(['locality', 'administrative_area_level_2']) || 'Unknown';
        const state_province = getComponent(['administrative_area_level_1']) || 'Unknown';
        const country = getComponent(['country']) || 'US';
        const postal_code = getComponent(['postal_code']);

        return {
            address,
            city,
            state_province,
            country,
            postal_code
        };

    } catch (error) {
        logger.error('Error getting complete address from coordinates:', error);
        return null;
    }
};