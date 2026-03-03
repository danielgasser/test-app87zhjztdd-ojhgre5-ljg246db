import * as Notifications from 'expo-notifications';
import { APP_CONFIG } from '@/config/appConfig';
import { FEATURES, FEATURE_DEEP_LINK_MAP, FeatureName } from '@/config/features';
import { logger } from '@/utils/logger';

// Identifier prefix used to find and cancel trial notifications
const IDENTIFIER_PREFIX = 'trial_reminder';

// Builds a deterministic identifier for a specific feature + reminder window
// e.g. "trial_reminder__advancedFilters__6h"
function buildIdentifier(feature: FeatureName, hoursBeforeExpiry: number): string {
    return `${IDENTIFIER_PREFIX}__${feature}__${hoursBeforeExpiry}h`;
}

// Builds notification title and body for single vs grouped trials
function buildContent(
    features: FeatureName[],
    hoursRemaining: number,
): { title: string; body: string } {
    const hourLabel = `${hoursRemaining}h`;

    if (features.length === 1) {
        const label = FEATURES[features[0]].label;
        return {
            title: `⏳ Trial expiring in ${hourLabel}`,
            body: `Your free access to ${label} expires soon. Upgrade to keep it.`,
        };
    }

    const firstLabel = FEATURES[features[0]].label;
    const othersCount = features.length - 1;
    return {
        title: `⏳ ${features.length} trials expiring in ${hourLabel}`,
        body: `${firstLabel} and ${othersCount} other feature${othersCount > 1 ? 's' : ''} expire soon. Upgrade to keep access.`,
    };
}

// Builds the deep link route for the notification tap.
// For grouped notifications, uses the first feature's route.
function buildDeepLink(features: FeatureName[]): string {
    const primary = features[0];
    const mapping = FEATURE_DEEP_LINK_MAP[primary];
    if (!mapping) return '/(tabs)';

    const { route, section } = mapping;
    return section ? `${route}?section=${section}` : route;
}

/**
 * Cancel all pending trial reminder notifications for a specific feature.
 * Call this when:
 *   - The user upgrades to premium
 *   - The trial is manually revoked
 */
export async function cancelTrialReminders(feature: FeatureName): Promise<void> {
    try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const toCancel = scheduled.filter((n) =>
            n.identifier.startsWith(`${IDENTIFIER_PREFIX}__${feature}__`),
        );

        await Promise.all(
            toCancel.map((n) =>
                Notifications.cancelScheduledNotificationAsync(n.identifier),
            ),
        );

        logger.info(`🔔 Cancelled ${toCancel.length} trial reminders for ${feature}`);
    } catch (error) {
        logger.error('Error cancelling trial reminders:', error);
    }
}

/**
 * Cancel ALL pending trial reminder notifications across all features.
 * Call this on user upgrade or logout.
 */
export async function cancelAllTrialReminders(): Promise<void> {
    try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const toCancel = scheduled.filter((n) =>
            n.identifier.startsWith(IDENTIFIER_PREFIX),
        );

        await Promise.all(
            toCancel.map((n) =>
                Notifications.cancelScheduledNotificationAsync(n.identifier),
            ),
        );

        logger.info(`🔔 Cancelled all ${toCancel.length} trial reminders`);
    } catch (error) {
        logger.error('Error cancelling all trial reminders:', error);
    }
}

/**
 * Schedule trial expiry reminders for a newly granted feature trial.
 *
 * Grouping: for each reminder time window (e.g. 6h before expiry), this
 * function checks if a notification is already scheduled for that window
 * (from another active trial). If so, it cancels the existing one and
 * reschedules a grouped notification listing all expiring features.
 *
 * @param feature - The feature trial just granted
 * @param expiresAt - ISO string of when the trial expires
 */
export async function scheduleTrialReminders(
    feature: FeatureName,
    expiresAt: string,
): Promise<void> {
    try {
        const expiryMs = new Date(expiresAt).getTime();
        const remindersHours = APP_CONFIG.PREMIUM.TRIAL_REMINDER_HOURS_BEFORE_EXPIRY;

        // Get all currently scheduled trial notifications to detect grouping needs
        const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
        const existingTrialNotifs = allScheduled.filter((n) =>
            n.identifier.startsWith(IDENTIFIER_PREFIX),
        );

        for (const hoursBeforeExpiry of remindersHours) {
            const triggerMs = expiryMs - hoursBeforeExpiry * 60 * 60 * 1000;

            // Skip if trigger time is already in the past
            if (triggerMs <= Date.now()) {
                logger.info(`🔔 Skipping ${hoursBeforeExpiry}h reminder for ${feature} — already past`);
                continue;
            }

            // Find other features already scheduled at this same time window
            // Match by hours label in the identifier (e.g. "__6h")
            const windowSuffix = `__${hoursBeforeExpiry}h`;
            const existingAtWindow = existingTrialNotifs.filter((n) =>
                n.identifier.endsWith(windowSuffix),
            );

            // Extract other feature names already in this window
            const otherFeatures: FeatureName[] = existingAtWindow
                .map((n) => {
                    // identifier format: trial_reminder__featureName__6h
                    const parts = n.identifier.split('__');
                    return parts[1] as FeatureName;
                })
                .filter((f) => f !== feature && f in FEATURES);

            // Cancel existing notifications at this window — we'll replace with grouped one
            await Promise.all(
                existingAtWindow.map((n) =>
                    Notifications.cancelScheduledNotificationAsync(n.identifier),
                ),
            );

            // All features for this grouped notification (existing + new)
            const groupedFeatures: FeatureName[] = [...otherFeatures, feature];
            const { title, body } = buildContent(groupedFeatures, hoursBeforeExpiry);
            const deepLink = buildDeepLink(groupedFeatures);
            const identifier = buildIdentifier(feature, hoursBeforeExpiry);

            await Notifications.scheduleNotificationAsync({
                identifier,
                content: {
                    title,
                    body,
                    sound: 'default',
                    data: {
                        type: 'trial_expiry',
                        features: groupedFeatures,
                        deepLink,
                    },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: new Date(triggerMs),
                },
            });

            logger.info(
                `🔔 Scheduled ${hoursBeforeExpiry}h trial reminder for [${groupedFeatures.join(', ')}] at ${new Date(triggerMs).toISOString()}`,
            );
        }
    } catch (error) {
        logger.error('Error scheduling trial reminders:', error);
    }
}