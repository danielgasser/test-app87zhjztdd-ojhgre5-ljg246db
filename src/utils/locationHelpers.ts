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