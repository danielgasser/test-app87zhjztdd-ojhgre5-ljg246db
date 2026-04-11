// ============================================================
// SHARED INPUT VALIDATORS
// Used by all Edge Functions to validate incoming request data.
// ============================================================

export function isValidLatitude(lat: unknown): boolean {
    return typeof lat === 'number' && isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: unknown): boolean {
    return typeof lng === 'number' && isFinite(lng) && lng >= -180 && lng <= 180;
}

export function isValidCoordinate(coord: unknown): boolean {
    if (!coord || typeof coord !== 'object') return false;
    const c = coord as Record<string, unknown>;
    return isValidLatitude(c.latitude) && isValidLongitude(c.longitude);
}

export function isValidString(value: unknown, maxLength = 200): boolean {
    return typeof value === 'string' && value.length <= maxLength;
}

export function isValidPlaceId(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    if (value.length === 0 || value.length > 500) return false;
    // Google place IDs are alphanumeric with underscores and hyphens
    return /^[a-zA-Z0-9_\-]+$/.test(value);
}

export function isValidRouteCoordinates(coords: unknown): boolean {
    if (!Array.isArray(coords)) return false;
    if (coords.length === 0 || coords.length > 50000) return false;
    return coords.every(isValidCoordinate);
}

export function isValidDemographics(demo: unknown): boolean {
    if (!demo || typeof demo !== 'object') return false;
    const d = demo as Record<string, unknown>;
    const stringFields = ['gender', 'religion', 'age_range'];
    const arrayOrStringFields = ['race_ethnicity', 'disability_status'];
    const validStrings = stringFields.every(field =>
        d[field] === undefined || d[field] === null || isValidString(d[field])
    );
    const validArrays = arrayOrStringFields.every(field => {
        const val = d[field];
        if (val === undefined || val === null) return true;
        if (Array.isArray(val)) return val.every(v => isValidString(v));
        return isValidString(val);
    });
    return validStrings && validArrays;
}

export function validationError(message: string): Response {
    return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
}