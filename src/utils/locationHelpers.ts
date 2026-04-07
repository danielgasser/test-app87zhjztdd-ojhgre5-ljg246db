import { notify } from "./notificationService";
import { logger } from '@/utils/logger';
import i18n from '@/i18n';
import { supabase } from "@/services/supabase";
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
    try {
        const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
            body: { type: 'reverse_geocode', latitude, longitude },
        });
        console.log('invoke function is mock?', jest.isMockFunction(supabase.functions.invoke));

        if (error || !data?.results || data.results.length === 0) {
            logger.warn('No geocoding results found for coordinates:', { latitude, longitude });
            return null;
        }

        const result = data.results[0];
        const components = result.address_components;

        const getComponent = (type: string) =>
            components.find((c: any) => c.types.includes(type))?.long_name || '';
        const getShortComponent = (type: string) =>
            components.find((c: any) => c.types.includes(type))?.short_name || '';

        const streetNumber = getComponent('street_number');
        const route = getComponent('route');
        const address = streetNumber && route
            ? `${streetNumber} ${route}`
            : route || result.formatted_address;

        const city = getComponent('locality') ||
            getComponent('administrative_area_level_2') ||
            getComponent('sublocality');

        const state_province = getComponent('administrative_area_level_1');
        const country = getShortComponent('country') || 'US';
        const postal_code = getComponent('postal_code') || null;

        return { address, city, state_province, country, postal_code };

    } catch (error) {
        logger.error('Error getting complete address from coordinates:', error);
        return null;
    }
};