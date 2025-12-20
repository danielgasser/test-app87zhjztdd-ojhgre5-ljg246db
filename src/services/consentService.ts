import { supabase } from "./supabase";
import { logger } from "@/utils/logger";

export type ConsentType = "terms" | "privacy_policy" | "location_disclosure";

interface RecordConsentResponse {
    success: boolean;
    consent_id?: string;
    timestamp?: string;
    error?: string;
}

/**
 * Record user consent to iubenda Consent Database
 * @param consentType - Type of consent being recorded
 * @param accepted - Whether the user accepted or declined
 * @returns Response from the consent recording API
 */
export async function recordConsent(
    consentType: ConsentType,
    accepted: boolean
): Promise<RecordConsentResponse> {
    try {
        const { data, error } = await supabase.functions.invoke("record-consent-iubenda", {
            body: {
                consent_type: consentType,
                accepted,
            },
        });

        if (error) {
            logger.error("Failed to record consent:", error);
            return {
                success: false,
                error: error.message,
            };
        }

        logger.info(`Consent recorded: ${consentType} = ${accepted}`, data);
        return data as RecordConsentResponse;
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        logger.error("Error recording consent:", errorMessage);
        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Record acceptance of both terms and privacy policy
 * Called from legal-acceptance screen
 */
export async function recordLegalAcceptance(): Promise<{
    termsResult: RecordConsentResponse;
    privacyResult: RecordConsentResponse;
}> {
    const [termsResult, privacyResult] = await Promise.all([
        recordConsent("terms", true),
        recordConsent("privacy_policy", true),
    ]);

    return { termsResult, privacyResult };
}

/**
 * Record acceptance of location disclosure
 * Called from location-disclosure screen
 */
export async function recordLocationDisclosureAcceptance(): Promise<RecordConsentResponse> {
    return recordConsent("location_disclosure", true);
}