import {
    FEATURE_REQUIREMENTS,
    ALL_DEMOGRAPHIC_FIELDS,
    FIELD_DISPLAY_NAMES,
    type FeatureName,
} from '@/constants/profileRequirements';
import type { UserProfile } from '@/store/userSlice';

export interface ProfileCompletenessResult {
    isComplete: boolean;
    missingFields: string[];
    completionPercentage: number;
    canUseFeature: boolean;
    missingFieldsForFeature: string[];
    featureSpecificMessage?: string;
}

/**
 * Check if a field value is considered "complete"
 * Handles arrays, booleans, and "Prefer not to say" cases
 */
export function isFieldComplete(value: any): boolean {
    if (value === null || value === undefined) return false;

    // Array fields (race_ethnicity, disability_status)
    if (Array.isArray(value)) {
        return value.length > 0;
    }

    // Boolean fields (lgbtq_status) - any value (true/false) is complete
    if (typeof value === 'boolean') {
        return true;
    }

    // String fields - non-empty string is complete
    if (typeof value === 'string') {
        return value.trim().length > 0;
    }

    return false;
}

/**
 * Get user-friendly field name
 */
export function getFieldDisplayName(fieldName: string): string {
    return FIELD_DISPLAY_NAMES[fieldName] || fieldName;
}

/**
 * Get missing fields for a specific feature
 */
export function getMissingFieldsForFeature(
    profile: UserProfile | null,
    featureName: FeatureName
): string[] {
    if (!profile) return [...FEATURE_REQUIREMENTS[featureName]];

    const requiredFields = FEATURE_REQUIREMENTS[featureName];
    const missing: string[] = [];

    requiredFields.forEach((field) => {
        if (!isFieldComplete(profile[field as keyof UserProfile])) {
            missing.push(field);
        }
    });

    return missing;
}

/**
 * Calculate profile completion percentage
 */
export function calculateCompletionPercentage(profile: UserProfile | null): number {
    if (!profile) return 0;

    let completedFields = 0;
    const totalFields = ALL_DEMOGRAPHIC_FIELDS.length;

    ALL_DEMOGRAPHIC_FIELDS.forEach((field) => {
        if (isFieldComplete(profile[field as keyof UserProfile])) {
            completedFields++;
        }
    });

    return Math.round((completedFields / totalFields) * 100);
}

/**
 * Main profile completeness check function
 * Can check overall completeness or feature-specific requirements
 */
export function checkProfileCompleteness(
    userProfile: UserProfile | null,
    featureName?: FeatureName
): ProfileCompletenessResult {
    // Get all missing fields
    const allMissingFields: string[] = [];

    if (userProfile) {
        ALL_DEMOGRAPHIC_FIELDS.forEach((field) => {
            if (!isFieldComplete(userProfile[field as keyof UserProfile])) {
                allMissingFields.push(field);
            }
        });
    } else {
        allMissingFields.push(...ALL_DEMOGRAPHIC_FIELDS);
    }

    const isComplete = allMissingFields.length === 0;
    const completionPercentage = calculateCompletionPercentage(userProfile);

    // If checking a specific feature
    if (featureName) {
        const missingFieldsForFeature = getMissingFieldsForFeature(userProfile, featureName);
        const canUseFeature = missingFieldsForFeature.length === 0;

        let featureSpecificMessage: string | undefined;
        if (!canUseFeature) {
            const missingFieldNames = missingFieldsForFeature
                .map(getFieldDisplayName)
                .join(', ');
            featureSpecificMessage = `Missing: ${missingFieldNames}`;
        }

        return {
            isComplete,
            missingFields: allMissingFields,
            completionPercentage,
            canUseFeature,
            missingFieldsForFeature,
            featureSpecificMessage,
        };
    }

    // General check (no specific feature)
    return {
        isComplete,
        missingFields: allMissingFields,
        completionPercentage,
        canUseFeature: true, // Not checking a specific feature
        missingFieldsForFeature: [],
    };
}