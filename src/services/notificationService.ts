import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

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
            console.log('Push notifications only work on physical devices');
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
            console.log('Permission not granted for push notifications');
            return null;
        }

        // Get push token
        try {
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
            });

            console.log('Push token:', tokenData.data);
            return tokenData.data;
        } catch (error) {
            console.error('Error getting push token:', error);
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
                console.error('Error saving push token:', error);
            } else {
                console.log('Push token saved successfully');
            }
        } catch (error) {
            console.error('Error in savePushToken:', error);
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
                console.error('Error removing push token:', error);
            }
        } catch (error) {
            console.error('Error in removePushToken:', error);
        }
    },
};