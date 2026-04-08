import i18n from "@/i18n";
import { notify } from "./notificationService";
import { logger } from '@/utils/logger';
import { supabase } from '@/services/supabase';
/**
 * Get the user's country code from their coordinates using reverse geocoding
 * Returns ISO 3166-1 alpha-2 country code (e.g., 'ch', 'us', 'de')
 */
export const getUserCountry = async (
    userLocation: { latitude: number; longitude: number } | null
): Promise<string> => {
    if (!userLocation) return 'us';

    try {
        const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
            body: { type: 'reverse_geocode', latitude: userLocation.latitude, longitude: userLocation.longitude },
        });
        if (error || !data?.results?.[0]) return 'us';
        const countryComponent = data.results[0].address_components.find(
            (c: any) => c.types.includes('country')
        );
        return countryComponent?.short_name?.toLowerCase() || 'us';
    } catch (error) {
        logger.error('no user country found', error);
        notify.error(i18n.t('location.country_not_found') + ': ');
        return 'us';
    }

};

/**
 * Get street address from coordinates using reverse geocoding
 * Returns the best available address (street address > locality > city)
 * 
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Formatted address string or null if unable to geocode
 * 
 * @example
 * const address = await getAddressFromCoordinates(47.3769, 8.5417);
 * // Returns: "Bahnhofstrasse 1" or "Zürich" or "Zurich, Switzerland"
 */
export const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number
): Promise<string | null> => {
    try {
        const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
            body: { type: 'reverse_geocode', latitude, longitude },
        });

        if (error || !data?.results || data.results.length === 0) {
            logger.warn('No geocoding results found for coordinates:', { latitude, longitude });
            return null;
        }

        const streetAddress = data.results.find((result: any) =>
            result.types.includes('street_address') || result.types.includes('premise')
        );

        if (streetAddress) {
            const streetNumber = streetAddress.address_components.find((c: any) =>
                c.types.includes('street_number')
            );
            const route = streetAddress.address_components.find((c: any) =>
                c.types.includes('route')
            );
            if (streetNumber && route) return `${streetNumber.long_name} ${route.long_name}`;
            if (route) return route.long_name;
        }

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
            if (name) return name.long_name;
        }

        return data.results[0].formatted_address;

    } catch (error) {
        logger.error('Error getting address from coordinates:', error);
        return null;
    }

};