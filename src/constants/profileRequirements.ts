import { APP_CONFIG } from '@/utils/appConfig';

/**
 * Profile field requirements for different features
 */
export const FEATURE_REQUIREMENTS = APP_CONFIG.PROFILE_COMPLETION.FEATURE_REQUIREMENTS;

/**
 * All demographic fields - imported from central config
 */
export const ALL_DEMOGRAPHIC_FIELDS = APP_CONFIG.PROFILE_COMPLETION.ALL_DEMOGRAPHIC_FIELDS;

/**
 * Field display names for user-facing messages
 */
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
    race_ethnicity: 'Race/Ethnicity',
    gender: 'Gender',
    lgbtq_status: 'LGBTQ+ Status',
    religion: 'Religion',
    disability_status: 'Disability Status',
    age_range: 'Age Range',
};

export type DemographicField = typeof ALL_DEMOGRAPHIC_FIELDS[number];
export type FeatureName = keyof typeof FEATURE_REQUIREMENTS;