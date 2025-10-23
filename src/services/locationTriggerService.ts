// ================================================
// LOCATION TRIGGER SERVICE
// Monitors user location and sends notifications for nearby highly-rated spots
// ================================================

import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { calculateDistance } from '../utils/distanceCalculator';
import { APP_CONFIG } from '@/utils/appConfig';

// ============================================
// TYPES
// ============================================

interface UserProfile {
    id: string;
    race_ethnicity?: string[] | null;
    gender?: string | null;
    lgbtq_status?: boolean | null;
    disability_status?: string[] | null;
    religion?: string | null;
    notification_preferences?: Record<string, any> | null;

}

interface NearbyLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    avg_safety_score: number;
    demographic_safety_score?: number;
    place_type: string;
}

interface NotificationLog {
    location_id: string;
    notified_at: Date;
}

// ============================================
// STATE MANAGEMENT
// ============================================

class LocationTriggerService {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isMonitoring: boolean = false;
    private notificationLog: Map<string, Date> = new Map();
    private currentUserId: string | null = null;
    private currentUserProfile: UserProfile | null = null;

    /**
     * Start monitoring user location for nearby highly-rated spots
     */
    async start(userId: string, userProfile: UserProfile): Promise<void> {
        if (this.isMonitoring) {
            return;
        }

        // Check if user has enabled this feature
        if (!userProfile.notification_preferences?.location_triggers) {
            return;
        }

        // Request notification permissions
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            if (newStatus !== 'granted') {
                return;
            }
        }

        // Check location permission
        const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
        if (locationStatus !== 'granted') {
            return;
        }

        this.currentUserId = userId;
        this.currentUserProfile = userProfile;
        this.isMonitoring = true;

        // Start checking location
        this.intervalId = setInterval(() => {
            this.checkNearbyLocations();
        }, APP_CONFIG.COMMUNITY.LOCATIONS_ALERT.CHECK_INTERVAL_MS);

        // Run immediately on start
        this.checkNearbyLocations();
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isMonitoring = false;
        this.currentUserId = null;
        this.currentUserProfile = null;
    }

    /**
     * Check for nearby highly-rated locations
     */
    private async checkNearbyLocations(): Promise<void> {
        if (!this.currentUserId || !this.currentUserProfile) {
            return;
        }

        try {
            // Get current location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = location.coords;


            // Query nearby locations from database
            const { data: nearbyLocations, error } = await supabase.rpc(
                'get_nearby_locations_for_user',
                {
                    lat: latitude,
                    lng: longitude,
                    user_race_ethnicity: this.currentUserProfile.race_ethnicity || [],
                    user_gender: this.currentUserProfile.gender || '',
                    user_lgbtq_status: this.currentUserProfile.lgbtq_status || false,
                    radius_meters: APP_CONFIG.COMMUNITY.LOCATIONS_ALERT.NOTIFICATION_RADIUS_METERS,
                }
            );

            if (error) {
                console.error('❌ Error fetching nearby locations:', error);
                return;
            }

            if (!nearbyLocations || nearbyLocations.length === 0) {
                return;
            }
            // Filter and notify
            for (const loc of nearbyLocations) {
                await this.considerLocationForNotification(loc, latitude, longitude);
            }
        } catch (error) {
            console.error('❌ Error checking nearby locations:', error);
        }
    }

    /**
     * Check if a location should trigger a notification
     */
    private async considerLocationForNotification(
        location: NearbyLocation,
        userLat: number,
        userLon: number
    ): Promise<void> {
        // Check rating threshold
        const rating = location.demographic_safety_score || location.avg_safety_score;
        if (!rating || rating < APP_CONFIG.COMMUNITY.LOCATIONS_ALERT.MIN_RATING_THRESHOLD) {
            return;
        }

        // Check if already notified recently
        if (this.wasRecentlyNotified(location.id)) {
            return;
        }

        // Calculate exact distance
        const distance = calculateDistance(
            userLat,
            userLon,
            location.latitude,
            location.longitude
        );

        if (distance > APP_CONFIG.COMMUNITY.LOCATIONS_ALERT.NOTIFICATION_RADIUS_METERS) {
            return;
        }

        // Send notification
        await this.sendLocationNotification(location, Math.round(distance));

        // Log this notification
        this.logNotification(location.id);
    }

    /**
     * Send local push notification
     */
    private async sendLocationNotification(
        location: NearbyLocation,
        distance: number
    ): Promise<void> {
        const rating = location.demographic_safety_score || location.avg_safety_score;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `📍 ${location.name} nearby`,
                    body: `Highly rated (${rating.toFixed(1)}★) - ${distance}m away`,
                    sound: 'default',
                    data: {
                        type: 'location_trigger',
                        locationId: location.id,
                        locationName: location.name,
                        rating: rating,
                        distance: distance,
                    },
                },
                trigger: null, // Send immediately
            });

            // Log to database for analytics
            if (this.currentUserId) {
                await supabase.from('notification_logs').insert({
                    user_id: this.currentUserId,
                    route_id: null,
                    notification_type: 'location_trigger',
                    sent_at: new Date().toISOString(),
                    review_ids: [],
                    metadata: {
                        location_id: location.id,
                        location_name: location.name,
                        rating: rating,
                        distance: distance,
                    },
                });
            }
        } catch (error) {
            console.error('❌ Error sending notification:', error);
        }
    }

    /**
     * Check if user was recently notified about this location
     */
    private wasRecentlyNotified(locationId: string): boolean {
        const lastNotified = this.notificationLog.get(locationId);
        if (!lastNotified) {
            return false;
        }

        const hoursSinceNotification =
            (Date.now() - lastNotified.getTime()) / (1000 * 60 * 60);

        return hoursSinceNotification < APP_CONFIG.COMMUNITY.LOCATIONS_ALERT.RATE_LIMIT_HOURS;
    }

    /**
     * Log that we notified about this location
     */
    private logNotification(locationId: string): void {
        this.notificationLog.set(locationId, new Date());

        // Clean up old entries (> 24 hours)
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const [id, date] of this.notificationLog.entries()) {
            if (date.getTime() < cutoff) {
                this.notificationLog.delete(id);
            }
        }
    }

    /**
     * Get monitoring status
     */
    isActive(): boolean {
        return this.isMonitoring;
    }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const locationTriggerService = new LocationTriggerService();