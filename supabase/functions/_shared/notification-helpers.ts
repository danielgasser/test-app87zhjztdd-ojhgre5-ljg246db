// ============================================
// SHARED NOTIFICATION HELPERS
// Used by multiple notification Edge Functions
// ============================================

import { APP_CONFIG } from "@/utils/appConfig";
import { EDGE_CONFIG } from "./config";



export type SeverityLevel = typeof EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS[keyof typeof EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS];

/**
 * Get severity level for a safety rating
 * @param rating - Safety rating (1.0 - 5.0)
 * @returns Severity level object or null if rating is >= 3.0
 */
export function getSeverityLevel(rating: number): SeverityLevel | null {
    if (rating >= EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.CRITICAL.min && rating <= EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.CRITICAL.max) {
        return EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.CRITICAL;
    }
    if (rating >= EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.WARNING.min && rating <= EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.WARNING.max) {
        return EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.WARNING;
    }
    if (rating >= EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.NOTICE.min && rating <= EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.NOTICE.max) {
        return EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.NOTICE;
    }
    return null;
}

/**
 * Check if review is demographically relevant to user
 * Matches on at least ONE demographic category
 * @param reviewerDemographics - Demographics of person who wrote the review
 * @param userDemographics - Demographics of user receiving notification
 * @returns true if relevant, false otherwise
 */
export function isDemographicallyRelevant(
    reviewerDemographics: any,
    userDemographics: any
): boolean {
    if (!reviewerDemographics || !userDemographics) {
        return true; // If demographics missing, show to everyone (fail open)
    }

    let matchScore = 0;
    let totalChecks = 0;

    // Race/ethnicity match
    if (reviewerDemographics.race_ethnicity && userDemographics.race_ethnicity) {
        totalChecks++;
        const intersection = reviewerDemographics.race_ethnicity.filter((r: string) =>
            userDemographics.race_ethnicity.includes(r)
        );
        if (intersection.length > 0) matchScore++;
    }

    // Gender match
    if (reviewerDemographics.gender && userDemographics.gender) {
        totalChecks++;
        if (reviewerDemographics.gender === userDemographics.gender) matchScore++;
    }

    // LGBTQ status match
    if (reviewerDemographics.lgbtq_status !== null && userDemographics.lgbtq_status !== null) {
        totalChecks++;
        if (reviewerDemographics.lgbtq_status === userDemographics.lgbtq_status) matchScore++;
    }

    // Disability status match
    if (reviewerDemographics.disability_status && userDemographics.disability_status) {
        totalChecks++;
        const intersection = reviewerDemographics.disability_status.filter((d: string) =>
            userDemographics.disability_status.includes(d)
        );
        if (intersection.length > 0) matchScore++;
    }

    // Religion match
    if (reviewerDemographics.religion && userDemographics.religion) {
        totalChecks++;
        if (reviewerDemographics.religion === userDemographics.religion) matchScore++;
    }

    // If at least one demographic matches, it's relevant
    // If no demographics were compared (totalChecks === 0), show to everyone
    return matchScore > 0 || totalChecks === 0;
}

/**
 * Check if user was recently notified about a specific location
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param locationId - Location ID
 * @param notificationType - Type of notification to check
 * @param windowHours - Time window in hours (default: 24)
 * @returns true if user was recently notified, false otherwise
 */
export async function wasRecentlyNotifiedAboutLocation(
    supabase: any,
    userId: string,
    locationId: string,
    notificationType: string,
    windowHours: number = 24
): Promise<boolean> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - windowHours);

    const { data, error } = await supabase
        .from("notification_logs")
        .select("id, metadata")
        .eq("user_id", userId)
        .eq("notification_type", notificationType)
        .gte("sent_at", cutoffTime.toISOString())
        .limit(10);

    if (error) {
        console.error("Error checking location notification log:", error);
        return false; // On error, allow notification
    }

    // Check if any of these notifications were about this specific location
    return data?.some((log: any) =>
        log.metadata?.location_id === locationId
    ) || false;
}

/**
 * Check if user was recently notified for a specific route
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param routeId - Route ID
 * @param notificationType - Type of notification
 * @param windowMinutes - Time window in minutes (default: 15)
 * @returns true if user was recently notified, false otherwise
 */
export async function wasRecentlyNotifiedForRoute(
    supabase: any,
    userId: string,
    routeId: string,
    notificationType: string,
    windowMinutes: number = 15
): Promise<boolean> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - windowMinutes);

    const { data, error } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("route_id", routeId)
        .eq("notification_type", notificationType)
        .gte("sent_at", cutoffTime.toISOString())
        .limit(1);

    if (error) {
        console.error("Error checking route notification log:", error);
        return false; // On error, allow notification
    }

    return data && data.length > 0;
}

/**
 * Log that a notification was sent
 * @param supabase - Supabase client
 * @param log - Notification log data
 */
export async function logNotification(
    supabase: any,
    log: {
        user_id: string;
        route_id: string | null;
        notification_type: string;
        sent_at: string;
        review_ids: string[];
        metadata?: any;
    }
): Promise<void> {
    const { error } = await supabase
        .from("notification_logs")
        .insert({
            user_id: log.user_id,
            route_id: log.route_id,
            notification_type: log.notification_type,
            sent_at: log.sent_at,
            review_ids: log.review_ids,
            metadata: log.metadata || {},
        });

    if (error) {
        console.error("Error logging notification:", error);
    }
}

/**
 * Calculate distance between two coordinates in meters
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * TypeScript interfaces for notifications
 */
export interface PushNotification {
    to: string;
    sound: "default";
    title: string;
    body: string;
    data?: any;
    priority?: "default" | "normal" | "high";
}

export interface UserProfile {
    id: string;
    push_token: string | null;
    notification_preferences: any;
    race_ethnicity?: string[];
    gender?: string;
    lgbtq_status?: boolean;
    disability_status?: string[];
    religion?: string;
}