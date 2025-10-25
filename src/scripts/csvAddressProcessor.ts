/**
 * CSV Address Filling Script
 * 
 * This script demonstrates how to use getAddressFromCoordinates
 * to fill in missing addresses in your CSV import data
 */

import { getAddressFromCoordinates } from '@/utils/locationHelpers';
import { logger } from '@/utils/logger';

/**
 * Process a CSV row and fill in the address field if it's missing
 * but lat/long coordinates are present
 */
export async function fillMissingAddress(row: {
    address?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    state_province?: string;
}): Promise<string> {
    // If address already exists, use it
    if (row.address && row.address.trim()) {
        return row.address.trim();
    }

    // If no coordinates, fall back to city or state/province
    if (!row.latitude || !row.longitude) {
        logger.warn('No coordinates available for address lookup');
        return row.city || row.state_province || 'Unknown Location';
    }

    // Try to get address from coordinates
    try {
        const address = await getAddressFromCoordinates(row.latitude, row.longitude);

        if (address) {
            logger.info(`Found address from coordinates: ${address}`);
            return address;
        }

        // Fallback if geocoding fails
        logger.warn('Geocoding returned null, using fallback');
        return row.city || row.state_province || 'Unknown Location';

    } catch (error) {
        logger.error('Error in fillMissingAddress:', error);
        return row.city || row.state_province || 'Unknown Location';
    }
}

/**
 * Example usage for batch processing CSV rows
 */
export async function processCSVRows(rows: any[]): Promise<any[]> {
    const processedRows = [];

    for (const row of rows) {
        try {
            // Fill in the address field
            const address = await fillMissingAddress({
                address: row.address,
                latitude: row.latitude ? parseFloat(row.latitude) : undefined,
                longitude: row.longitude ? parseFloat(row.longitude) : undefined,
                city: row.city,
                state_province: row.state_province,
            });

            processedRows.push({
                ...row,
                address: address,
            });

            // Add a small delay to avoid hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            logger.error(`Error processing row:`, error);
            // Keep the row but use fallback address
            processedRows.push({
                ...row,
                address: row.city || row.state_province || 'Unknown Location',
            });
        }
    }

    return processedRows;
}

/**
 * Example: Process your CSV data before inserting into database
 */
export async function exampleUsage() {
    // Your CSV data loaded as array of objects
    const csvData = [
        {
            location_id: 'LOC006',
            name: 'Frenchies',
            address: '', // Empty address
            city: 'Clearwater',
            state_province: 'FL',
            latitude: null,
            longitude: null,
        },
        {
            location_id: 'LOC_SUNDOWN_001',
            name: 'Sundown Town',
            address: '', // Empty address
            city: 'Anna',
            state_province: 'Illinois',
            postal_code: '62906',
            latitude: 37.46033,
            longitude: -89.24619,
        },
    ];

    // Process the data
    const processedData = await processCSVRows(csvData);

    console.log('Processed data:', processedData);

    // Now processedData has filled-in addresses and can be inserted into database
    return processedData;
}