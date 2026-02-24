import {
    isFieldComplete,
    calculateCompletionPercentage,
    checkProfileCompleteness,
    getMissingFieldsForFeature,
    getFieldDisplayName,
} from '../profileValidation';
import type { UserProfile } from '@/store/userSlice';

// Helper to build a minimal partial UserProfile for testing
const buildProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
    id: 'test-user',
    race_ethnicity: ['Black'],
    gender: 'female',
    lgbtq_status: false,
    religion: 'Christian',
    disability_status: ['wheelchair'],
    age_range: '25-34',
    ...overrides,
} as unknown as UserProfile);

const emptyProfile = () => buildProfile({
    race_ethnicity: [],
    gender: '',
    lgbtq_status: null as any,
    religion: '',
    disability_status: [],
    age_range: '',
});

// ─── isFieldComplete ──────────────────────────────────────────────────────────

describe('isFieldComplete', () => {
    describe('null / undefined', () => {
        it('returns false for null', () => expect(isFieldComplete(null)).toBe(false));
        it('returns false for undefined', () => expect(isFieldComplete(undefined)).toBe(false));
    });

    describe('array fields (race_ethnicity, disability_status)', () => {
        it('returns false for empty array', () => expect(isFieldComplete([])).toBe(false));
        it('returns true for single item array', () => expect(isFieldComplete(['Black'])).toBe(true));
        it('returns true for multi-item array', () => expect(isFieldComplete(['wheelchair', 'visual'])).toBe(true));
    });

    describe('boolean fields (lgbtq_status)', () => {
        it('returns true for true — explicitly LGBTQ+', () => expect(isFieldComplete(true)).toBe(true));
        it('returns true for false — explicitly not LGBTQ+', () => expect(isFieldComplete(false)).toBe(true));
        // false is a valid answer, not "unanswered"
    });

    describe('string fields (gender, religion, age_range)', () => {
        it('returns false for empty string', () => expect(isFieldComplete('')).toBe(false));
        it('returns false for whitespace-only string', () => expect(isFieldComplete('   ')).toBe(false));
        it('returns true for a normal string value', () => expect(isFieldComplete('female')).toBe(true));
        it('returns true for "Prefer not to say" — still a valid answer', () => {
            expect(isFieldComplete('Prefer not to say')).toBe(true);
        });
        it('returns true for single character string', () => expect(isFieldComplete('M')).toBe(true));
    });
});

// ─── getFieldDisplayName ──────────────────────────────────────────────────────

describe('getFieldDisplayName', () => {
    it('returns human-readable name for known fields', () => {
        expect(getFieldDisplayName('race_ethnicity')).toBe('Race/Ethnicity');
        expect(getFieldDisplayName('gender')).toBe('Gender');
        expect(getFieldDisplayName('lgbtq_status')).toBe('LGBTQ+ Status');
        expect(getFieldDisplayName('religion')).toBe('Religion');
        expect(getFieldDisplayName('disability_status')).toBe('Disability Status');
        expect(getFieldDisplayName('age_range')).toBe('Age Range');
    });

    it('returns the raw field name for unknown fields as fallback', () => {
        expect(getFieldDisplayName('unknown_field')).toBe('unknown_field');
    });
});

// ─── calculateCompletionPercentage ───────────────────────────────────────────

describe('calculateCompletionPercentage', () => {
    it('returns 0 for null profile', () => {
        expect(calculateCompletionPercentage(null)).toBe(0);
    });

    it('returns 0 for a profile with all fields empty', () => {
        expect(calculateCompletionPercentage(emptyProfile())).toBe(0);
    });

    it('returns 17 (1/6) with only race_ethnicity filled', () => {
        const profile = buildProfile({ ...emptyProfile(), race_ethnicity: ['Black'] });
        expect(calculateCompletionPercentage(profile)).toBe(17);
    });

    it('returns 33 (2/6) with race_ethnicity and gender filled', () => {
        const profile = buildProfile({ ...emptyProfile(), race_ethnicity: ['Black'], gender: 'female' });
        expect(calculateCompletionPercentage(profile)).toBe(33);
    });

    it('returns 50 (3/6) with race_ethnicity, gender, lgbtq_status filled', () => {
        const profile = buildProfile({
            ...emptyProfile(),
            race_ethnicity: ['Black'],
            gender: 'female',
            lgbtq_status: false,
        });
        expect(calculateCompletionPercentage(profile)).toBe(50);
    });

    it('returns 67 (4/6) with four fields filled', () => {
        const profile = buildProfile({
            ...emptyProfile(),
            race_ethnicity: ['Black'],
            gender: 'female',
            lgbtq_status: false,
            religion: 'Christian',
        });
        expect(calculateCompletionPercentage(profile)).toBe(67);
    });

    it('returns 83 (5/6) with five fields filled', () => {
        const profile = buildProfile({
            ...emptyProfile(),
            race_ethnicity: ['Black'],
            gender: 'female',
            lgbtq_status: false,
            religion: 'Christian',
            disability_status: ['wheelchair'],
        });
        expect(calculateCompletionPercentage(profile)).toBe(83);
    });

    it('returns 100 for a fully complete profile', () => {
        expect(calculateCompletionPercentage(buildProfile())).toBe(100);
    });

    it('counts lgbtq_status: false as complete (not missing)', () => {
        const profile = buildProfile({ lgbtq_status: false });
        expect(calculateCompletionPercentage(profile)).toBe(100);
    });

    it('counts empty disability_status array as incomplete', () => {
        const profile = buildProfile({ disability_status: [] });
        expect(calculateCompletionPercentage(profile)).toBe(83);
    });
});

// ─── getMissingFieldsForFeature ───────────────────────────────────────────────

describe('getMissingFieldsForFeature', () => {
    describe('null profile', () => {
        it('returns all SIMILARITY required fields', () => {
            const missing = getMissingFieldsForFeature(null, 'SIMILARITY');
            expect(missing).toContain('race_ethnicity');
            expect(missing).toContain('gender');
        });

        it('returns all RECOMMENDATIONS required fields', () => {
            const missing = getMissingFieldsForFeature(null, 'RECOMMENDATIONS');
            expect(missing).toContain('race_ethnicity');
            expect(missing).toContain('gender');
        });

        it('returns all SAFE_ROUTING required fields', () => {
            const missing = getMissingFieldsForFeature(null, 'SAFE_ROUTING');
            expect(missing).toContain('race_ethnicity');
            expect(missing).toContain('gender');
            expect(missing).toContain('lgbtq_status');
            expect(missing).toContain('religion');
            expect(missing).toContain('disability_status');
            expect(missing).toContain('age_range');
        });
    });

    describe('RECOMMENDATIONS feature (requires race_ethnicity, gender)', () => {
        it('returns empty when both required fields are present', () => {
            const profile = buildProfile({ race_ethnicity: ['Black'], gender: 'female' });
            expect(getMissingFieldsForFeature(profile, 'RECOMMENDATIONS')).toHaveLength(0);
        });

        it('returns race_ethnicity when it is empty', () => {
            const profile = buildProfile({ race_ethnicity: [] });
            const missing = getMissingFieldsForFeature(profile, 'RECOMMENDATIONS');
            expect(missing).toContain('race_ethnicity');
            expect(missing).not.toContain('gender');
        });

        it('returns gender when it is empty', () => {
            const profile = buildProfile({ gender: '' });
            const missing = getMissingFieldsForFeature(profile, 'RECOMMENDATIONS');
            expect(missing).toContain('gender');
            expect(missing).not.toContain('race_ethnicity');
        });

        it('returns both fields when both are missing', () => {
            const profile = buildProfile({ race_ethnicity: [], gender: '' });
            const missing = getMissingFieldsForFeature(profile, 'RECOMMENDATIONS');
            expect(missing).toContain('race_ethnicity');
            expect(missing).toContain('gender');
            expect(missing).toHaveLength(2);
        });
    });

    describe('SAFE_ROUTING feature (requires all 6 fields)', () => {
        it('returns empty when all fields are present', () => {
            expect(getMissingFieldsForFeature(buildProfile(), 'SAFE_ROUTING')).toHaveLength(0);
        });

        it('returns only the missing fields from a partially complete profile', () => {
            const profile = buildProfile({ religion: '', age_range: '' });
            const missing = getMissingFieldsForFeature(profile, 'SAFE_ROUTING');
            expect(missing).toContain('religion');
            expect(missing).toContain('age_range');
            expect(missing).not.toContain('race_ethnicity');
            expect(missing).not.toContain('gender');
        });

        it('treats lgbtq_status: false as complete', () => {
            const profile = buildProfile({ lgbtq_status: false });
            const missing = getMissingFieldsForFeature(profile, 'SAFE_ROUTING');
            expect(missing).not.toContain('lgbtq_status');
        });
    });
});

// ─── checkProfileCompleteness ─────────────────────────────────────────────────

describe('checkProfileCompleteness', () => {
    describe('null profile', () => {
        it('returns isComplete: false', () => {
            expect(checkProfileCompleteness(null).isComplete).toBe(false);
        });

        it('returns 0% completion', () => {
            expect(checkProfileCompleteness(null).completionPercentage).toBe(0);
        });

        it('returns all 6 fields as missing', () => {
            expect(checkProfileCompleteness(null).missingFields).toHaveLength(6);
        });

        it('returns canUseFeature: true when no feature specified (general check)', () => {
            expect(checkProfileCompleteness(null).canUseFeature).toBe(true);
        });
    });

    describe('complete profile, no feature', () => {
        it('returns isComplete: true', () => {
            expect(checkProfileCompleteness(buildProfile()).isComplete).toBe(true);
        });

        it('returns 100% completion', () => {
            expect(checkProfileCompleteness(buildProfile()).completionPercentage).toBe(100);
        });

        it('returns no missing fields', () => {
            expect(checkProfileCompleteness(buildProfile()).missingFields).toHaveLength(0);
        });

        it('returns canUseFeature: true', () => {
            expect(checkProfileCompleteness(buildProfile()).canUseFeature).toBe(true);
        });
    });

    describe('with featureName — RECOMMENDATIONS', () => {
        it('canUseFeature is true when required fields are complete', () => {
            const result = checkProfileCompleteness(buildProfile(), 'RECOMMENDATIONS');
            expect(result.canUseFeature).toBe(true);
            expect(result.missingFieldsForFeature).toHaveLength(0);
            expect(result.featureSpecificMessage).toBeUndefined();
        });

        it('canUseFeature is false when race_ethnicity is missing', () => {
            const profile = buildProfile({ race_ethnicity: [] });
            const result = checkProfileCompleteness(profile, 'RECOMMENDATIONS');
            expect(result.canUseFeature).toBe(false);
        });

        it('featureSpecificMessage contains display name of missing field', () => {
            const profile = buildProfile({ race_ethnicity: [], gender: '' });
            const result = checkProfileCompleteness(profile, 'RECOMMENDATIONS');
            expect(result.featureSpecificMessage).toContain('Race/Ethnicity');
            expect(result.featureSpecificMessage).toContain('Gender');
        });

        it('featureSpecificMessage starts with "Missing:"', () => {
            const profile = buildProfile({ race_ethnicity: [] });
            const result = checkProfileCompleteness(profile, 'RECOMMENDATIONS');
            expect(result.featureSpecificMessage).toMatch(/^Missing:/);
        });
    });

    describe('with featureName — SAFE_ROUTING', () => {
        it('canUseFeature is false for an empty profile', () => {
            const result = checkProfileCompleteness(emptyProfile(), 'SAFE_ROUTING');
            expect(result.canUseFeature).toBe(false);
            expect(result.missingFieldsForFeature.length).toBeGreaterThan(0);
        });

        it('canUseFeature is true for a fully complete profile', () => {
            const result = checkProfileCompleteness(buildProfile(), 'SAFE_ROUTING');
            expect(result.canUseFeature).toBe(true);
        });
    });

    describe('isComplete vs canUseFeature independence', () => {
        it('profile can be incomplete overall but still canUseFeature for RECOMMENDATIONS', () => {
            // Has race + gender (enough for RECOMMENDATIONS) but missing religion/age_range
            const profile = buildProfile({ religion: '', age_range: '', disability_status: [] });
            const result = checkProfileCompleteness(profile, 'RECOMMENDATIONS');
            expect(result.isComplete).toBe(false);
            expect(result.canUseFeature).toBe(true);
        });

        it('profile can be overall complete but report canUseFeature based on feature fields', () => {
            const result = checkProfileCompleteness(buildProfile(), 'SAFE_ROUTING');
            expect(result.isComplete).toBe(true);
            expect(result.canUseFeature).toBe(true);
        });
    });
});