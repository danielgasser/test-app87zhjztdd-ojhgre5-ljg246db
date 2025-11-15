import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';
import { logger } from "@/utils/logger";


// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const notificationService = {
    /**
     * Request notification permissions and get push token
     */
    async registerForPushNotifications(): Promise<string | null> {
        // Check if device is physical (push notifications don't work on simulators)
        if (!Device.isDevice) {
            logger.error('Push notifications only work on physical devices');
            return null;
        }

        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return null;
        }

        // Get push token
        try {
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
            });

            return tokenData.data;
        } catch (error) {
            logger.error('Error getting push token:', error);
            return null;
        }
    },

    /**
     * Save push token to database for current user
     */
    async savePushToken(userId: string, pushToken: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    push_token: pushToken,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) {
                logger.error('Error saving push token:', error);
            }
        } catch (error) {
            logger.error('Error in savePushToken:', error);
        }
    },

    /**
     * Remove push token from database (e.g., on logout)
     */
    async removePushToken(userId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    push_token: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) {
                logger.error('Error removing push token:', error);
            }
        } catch (error) {
            logger.error('Error in removePushToken:', error);
        }
    },
    /**
     * Set up notification tap handler
     * Call this once when app starts
     */
    setupNotificationResponseHandler(router: any): void {
        // Listen for notification taps
        Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;

            logger.info('📲 Notification tapped:', data);

            // Handle different notification types
            if (data.type === 'route_safety_alert' && data.locationId) {
                // Navigate to location details
                router.push(`/(tabs)?openLocationId=${data.locationId}&refresh=${Date.now()}`);
            } else if (data.type === 'location_safety_change' && data.locationId) {
                // Navigate to location details
                router.push(`/(tabs)?openLocationId=${data.locationId}&refresh=${Date.now()}`);
            }
            // Add more notification types as needed
        });
    },
};
