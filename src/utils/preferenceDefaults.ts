/**
 * Get default time format and distance unit based on country code
 */

// Countries using Imperial system
const IMPERIAL_COUNTRIES = ['US', 'LR', 'MM']; // USA, Liberia, Myanmar

// Countries using 12-hour time format
const HOUR_12_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'NZ', 'IN', 'PH'];

export interface DefaultPreferences {
    time_format: '12h' | '24h';
    distance_unit: 'metric' | 'imperial';
}

/**
 * Get default preferences based on country code
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'FR')
 * @returns Default time format and distance unit for that country
 */
export function getDefaultPreferences(countryCode: string | null): DefaultPreferences {
    const normalizedCountry = countryCode?.toUpperCase() || '';

    return {
        time_format: HOUR_12_COUNTRIES.includes(normalizedCountry) ? '12h' : '24h',
        distance_unit: IMPERIAL_COUNTRIES.includes(normalizedCountry) ? 'imperial' : 'metric',
    };
}