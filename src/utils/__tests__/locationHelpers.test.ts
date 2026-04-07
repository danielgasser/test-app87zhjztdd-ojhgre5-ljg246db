import { getCompleteAddressFromCoordinates } from "../locationHelpers";
import { supabase } from '@/services/supabase';

jest.mock('@/utils/logger', () => ({
    logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const mockInvoke = supabase.functions.invoke as jest.Mock;
// --- Helpers ---

/**
 * Builds a minimal but realistic Google Geocoding API response.
 * Pass in only the address components you care about for each test.
 */
function buildGeocodingResponse(components: {
    streetNumber?: string;
    route?: string;
    locality?: string;
    adminArea1?: string;   // state/province
    adminArea2?: string;   // county (fallback for city)
    country?: string;
    postalCode?: string;
    formattedAddress?: string;
}) {
    const addressComponents = [];

    if (components.streetNumber) {
        addressComponents.push({
            long_name: components.streetNumber,
            types: ['street_number'],
        });
    }
    if (components.route) {
        addressComponents.push({
            long_name: components.route,
            types: ['route'],
        });
    }
    if (components.locality) {
        addressComponents.push({
            long_name: components.locality,
            types: ['locality', 'political'],
        });
    }
    if (components.adminArea1) {
        addressComponents.push({
            long_name: components.adminArea1,
            types: ['administrative_area_level_1', 'political'],
        });
    }
    if (components.adminArea2) {
        addressComponents.push({
            long_name: components.adminArea2,
            types: ['administrative_area_level_2', 'political'],
        });
    }
    if (components.country) {
        addressComponents.push({
            long_name: components.country,
            types: ['country', 'political'],
        });
    }
    if (components.postalCode) {
        addressComponents.push({
            long_name: components.postalCode,
            types: ['postal_code'],
        });
    }

    return {
        status: 'OK',
        results: [
            {
                formatted_address: components.formattedAddress ?? '123 Main St, Tampa, FL 33601, USA',
                address_components: addressComponents,
            },
        ],
    };
}

// --- Setup / Teardown ---

beforeEach(() => {
    jest.clearAllMocks();
});

// --- Test suites ---

describe('getCompleteAddressFromCoordinates', () => {
    it('returns full address data when all components are present', async () => {
        mockInvoke.mockResolvedValueOnce({
            data: async () => buildGeocodingResponse({
                streetNumber: '123',
                route: 'Main St',
                locality: 'Tampa',
                adminArea1: 'Florida',
                country: 'United States',
                postalCode: '33601',
            }),
            error: null,

        });
        const result = await getCompleteAddressFromCoordinates(27.9506, -82.4572);

        expect(result).not.toBeNull();
        expect(result?.address).toBe('123 Main St');
        expect(result?.city).toBe('Tampa');
        expect(result?.state_province).toBe('Florida');
        expect(result?.country).toBe('United States');
        expect(result?.postal_code).toBe('33601');
    });

    it('returns real city from locality, not "Unknown"', async () => {
        mockInvoke.mockResolvedValueOnce({
            data: async () => buildGeocodingResponse({
                locality: 'Tampa',
                adminArea1: 'Florida',
                country: 'United States',
            }),
            error: null,

        });

        const result = await getCompleteAddressFromCoordinates(27.9506, -82.4572);

        expect(result?.city).toBe('Tampa');
        expect(result?.city).not.toBe('Unknown');
    });

    it('returns real state from administrative_area_level_1, not "Unknown"', async () => {
        mockInvoke.mockResolvedValueOnce({
            data: async () => buildGeocodingResponse({
                locality: 'Tampa',
                adminArea1: 'Florida',
                country: 'United States',
            }),
            error: null,

        });

        const result = await getCompleteAddressFromCoordinates(27.9506, -82.4572);

        expect(result?.state_province).toBe('Florida');
        expect(result?.state_province).not.toBe('Unknown');
    });

    it('returns route name as address when no street number is present', async () => {
        mockInvoke.mockResolvedValueOnce({
            data: async () => buildGeocodingResponse({
                route: 'Main St',
                locality: 'Tampa',
                adminArea1: 'Florida',
                country: 'United States',
            }),
            error: null,

        });

        const result = await getCompleteAddressFromCoordinates(27.9506, -82.4572);

        expect(result?.address).toBe('Main St');
    });

    it('returns locality as address when no street or route is present', async () => {
        mockInvoke.mockResolvedValueOnce({
            data: async () => buildGeocodingResponse({
                locality: 'Tampa',
                adminArea1: 'Florida',
                country: 'United States',
            }),
            error: null,

        });

        const result = await getCompleteAddressFromCoordinates(27.9506, -82.4572);

        expect(result?.address).toBe('Tampa');
    });

    it('returns null when Edge Function returns an error', async () => {
        mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('Function error') });
        const result = await getCompleteAddressFromCoordinates(27.9506, -82.4572);
        expect(result).toBeNull();
        expect(mockInvoke).toHaveBeenCalled();
    });

    it('returns null when API returns non-OK status', async () => {
        mockInvoke.mockResolvedValueOnce({
            json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
        });

        const result = await getCompleteAddressFromCoordinates(27.9506, -82.4572);

        expect(result).toBeNull();
    });

    it('returns null when fetch throws a network error', async () => {
        mockInvoke.mockRejectedValueOnce(new Error('Network request failed'));

        const result = await getCompleteAddressFromCoordinates(27.9506, -82.4572);

        expect(result).toBeNull();
    });

    it('returns null when API returns empty results array', async () => {
        mockInvoke.mockResolvedValueOnce({
            json: async () => ({ status: 'OK', results: [] }),
        });

        const result = await getCompleteAddressFromCoordinates(27.9506, -82.4572);

        expect(result).toBeNull();
    });
});