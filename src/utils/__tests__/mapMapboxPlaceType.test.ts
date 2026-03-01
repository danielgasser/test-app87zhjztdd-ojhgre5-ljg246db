import { mapMapboxPlaceType } from '../../utils/placeTypeMappers';

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
    it('returns other when input is undefined', () => {
        expect(mapMapboxPlaceType(undefined)).toBe('other');
    });

    it('returns other for an unrecognised type', () => {
        expect(mapMapboxPlaceType('spaceship_pad')).toBe('other');
    });

    it('is case-insensitive', () => {
        expect(mapMapboxPlaceType('RESTAURANT')).toBe('restaurant');
        expect(mapMapboxPlaceType('Restaurant')).toBe('restaurant');
        expect(mapMapboxPlaceType('rEsTaUrAnT')).toBe('restaurant');
    });
});

// ─── Geographic / geocoding types ────────────────────────────────────────────

describe('geographic types', () => {
    const cases: [string, string][] = [
        ['address', 'address'],
        ['neighborhood', 'neighborhood'],
        ['locality', 'locality'],
        ['place', 'place'],
        ['region', 'region'],
        ['district', 'district'],
        ['postcode', 'postcode'],
        ['country', 'country'],
        ['poi', 'poi'],
    ];

    test.each(cases)('"%s" → "%s"', (input, expected) => {
        expect(mapMapboxPlaceType(input)).toBe(expected);
    });
});

// ─── Food & drink ─────────────────────────────────────────────────────────────

describe('food & drink', () => {
    const cases: [string, string][] = [
        ['restaurant', 'restaurant'],
        ['cafe', 'cafe'],
        ['bar', 'bar'],
    ];

    test.each(cases)('"%s" → "%s"', (input, expected) => {
        expect(mapMapboxPlaceType(input)).toBe(expected);
    });
});

// ─── Accommodation ────────────────────────────────────────────────────────────

describe('accommodation', () => {
    it('"hotel" maps to "lodging"', () => {
        expect(mapMapboxPlaceType('hotel')).toBe('lodging');
    });
});

// ─── Transport ────────────────────────────────────────────────────────────────

describe('transport', () => {
    const cases: [string, string][] = [
        ['gas_station', 'gas_station'],
        ['airport', 'airport'],
        ['train_station', 'train_station'],
        ['bus_station', 'bus_station'],
        ['subway_station', 'subway_station'],
    ];

    test.each(cases)('"%s" → "%s"', (input, expected) => {
        expect(mapMapboxPlaceType(input)).toBe(expected);
    });
});

// ─── Finance ──────────────────────────────────────────────────────────────────

describe('finance', () => {
    const cases: [string, string][] = [
        ['bank', 'bank'],
        ['atm', 'atm'],
    ];

    test.each(cases)('"%s" → "%s"', (input, expected) => {
        expect(mapMapboxPlaceType(input)).toBe(expected);
    });
});

// ─── Health & services ────────────────────────────────────────────────────────

describe('health & services', () => {
    const cases: [string, string][] = [
        ['hospital', 'hospital'],
        ['pharmacy', 'pharmacy'],
    ];

    test.each(cases)('"%s" → "%s"', (input, expected) => {
        expect(mapMapboxPlaceType(input)).toBe(expected);
    });
});

// ─── Education & culture ──────────────────────────────────────────────────────

describe('education & culture', () => {
    const cases: [string, string][] = [
        ['school', 'school'],
        ['university', 'university'],
        ['library', 'library'],
        ['museum', 'museum'],
    ];

    test.each(cases)('"%s" → "%s"', (input, expected) => {
        expect(mapMapboxPlaceType(input)).toBe(expected);
    });
});

// ─── Outdoors & recreation ────────────────────────────────────────────────────

describe('outdoors & recreation', () => {
    const cases: [string, string][] = [
        ['park', 'park'],
        ['shopping_mall', 'shopping_mall'],
        ['store', 'store'],
    ];

    test.each(cases)('"%s" → "%s"', (input, expected) => {
        expect(mapMapboxPlaceType(input)).toBe(expected);
    });
});

// ─── Places of worship ────────────────────────────────────────────────────────

describe('places of worship', () => {
    const cases: [string, string][] = [
        ['church', 'church'],
        ['mosque', 'mosque'],
        ['synagogue', 'synagogue'],
    ];

    test.each(cases)('"%s" → "%s"', (input, expected) => {
        expect(mapMapboxPlaceType(input)).toBe(expected);
    });
});