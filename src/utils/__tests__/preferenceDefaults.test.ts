import { getDefaultPreferences } from '../preferenceDefaults';

describe('getDefaultPreferences', () => {

    describe('null / missing country code', () => {
        it('returns metric + 24h for null', () => {
            expect(getDefaultPreferences(null)).toEqual({ time_format: '24h', distance_unit: 'metric' });
        });

        it('returns metric + 24h for empty string', () => {
            expect(getDefaultPreferences('')).toEqual({ time_format: '24h', distance_unit: 'metric' });
        });
    });

    describe('imperial countries (US, LR, MM)', () => {
        it('US → imperial + 12h', () => {
            expect(getDefaultPreferences('US')).toEqual({ time_format: '12h', distance_unit: 'imperial' });
        });

        it('LR (Liberia) → imperial + 24h', () => {
            expect(getDefaultPreferences('LR')).toEqual({ time_format: '24h', distance_unit: 'imperial' });
        });

        it('MM (Myanmar) → imperial + 24h', () => {
            expect(getDefaultPreferences('MM')).toEqual({ time_format: '24h', distance_unit: 'imperial' });
        });
    });

    describe('12h countries (non-imperial)', () => {
        it('CA (Canada) → metric + 12h', () => {
            expect(getDefaultPreferences('CA')).toEqual({ time_format: '12h', distance_unit: 'metric' });
        });

        it('GB (UK) → metric + 12h', () => {
            expect(getDefaultPreferences('GB')).toEqual({ time_format: '12h', distance_unit: 'metric' });
        });

        it('AU (Australia) → metric + 12h', () => {
            expect(getDefaultPreferences('AU')).toEqual({ time_format: '12h', distance_unit: 'metric' });
        });

        it('NZ (New Zealand) → metric + 12h', () => {
            expect(getDefaultPreferences('NZ')).toEqual({ time_format: '12h', distance_unit: 'metric' });
        });

        it('IN (India) → metric + 12h', () => {
            expect(getDefaultPreferences('IN')).toEqual({ time_format: '12h', distance_unit: 'metric' });
        });

        it('PH (Philippines) → metric + 12h', () => {
            expect(getDefaultPreferences('PH')).toEqual({ time_format: '12h', distance_unit: 'metric' });
        });
    });

    describe('metric + 24h countries', () => {
        it('FR (France) → metric + 24h', () => {
            expect(getDefaultPreferences('FR')).toEqual({ time_format: '24h', distance_unit: 'metric' });
        });

        it('DE (Germany) → metric + 24h', () => {
            expect(getDefaultPreferences('DE')).toEqual({ time_format: '24h', distance_unit: 'metric' });
        });

        it('BR (Brazil) → metric + 24h', () => {
            expect(getDefaultPreferences('BR')).toEqual({ time_format: '24h', distance_unit: 'metric' });
        });

        it('JP (Japan) → metric + 24h', () => {
            expect(getDefaultPreferences('JP')).toEqual({ time_format: '24h', distance_unit: 'metric' });
        });
    });

    describe('case insensitivity', () => {
        it('accepts lowercase country code', () => {
            expect(getDefaultPreferences('us')).toEqual({ time_format: '12h', distance_unit: 'imperial' });
        });

        it('accepts mixed case country code', () => {
            expect(getDefaultPreferences('Us')).toEqual({ time_format: '12h', distance_unit: 'imperial' });
        });
    });

});