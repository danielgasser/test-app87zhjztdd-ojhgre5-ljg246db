// ================================================
// LOCATION TRIGGER SERVICE
// Monitors user location and sends notifications for nearby highly-rated spots
// ================================================

import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { calculateDistance } from '../utils/distanceCalculator';

// ============================================
// CONFIGURATION
// ============================================

const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
const NOTIFICATION_RADIUS_METERS = 200; // Notify within 200m
const MIN_RATING_THRESHOLD = 4.0; // Only notify for highly-rated spots (≥4.0)
const RATE_LIMIT_HOURS = 12; // Don't notify about same location twice in 12 hours

// ============================================
// TYPES
// ============================================

interface UserProfile {
    id: string;
    race_ethnicity?: string[];
    gender?: string;
    lgbtq_status?: boolean;
    disability_status?: string[];
    religion?: string;
    notification_preferences?: {
        location_triggers?: boolean;
    };
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
            console.log('📍 Location trigger service already running');
            return;
        }

        // Check if user has enabled this feature
        if (!userProfile.notification_preferences?.location_triggers) {
            console.log('📍 Location triggers disabled by user');
            return;
        }

        // Request notification permissions
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            if (newStatus !== 'granted') {
                console.log('❌ Notification permissions not granted');
                return;
            }
        }

        // Check location permission
        const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
        if (locationStatus !== 'granted') {
            console.log('❌ Location permissions not granted');
            return;
        }

        this.currentUserId = userId;
        this.currentUserProfile = userProfile;
        this.isMonitoring = true;

        console.log('✅ Location trigger service started');

        // Start checking location
        this.intervalId = setInterval(() => {
            this.checkNearbyLocations();
        }, CHECK_INTERVAL_MS);

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
        console.log('🛑 Location trigger service stopped');
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

            console.log(`📍 Checking nearby locations at (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);

            // Query nearby locations from database
            const { data: nearbyLocations, error } = await supabase.rpc(
                'get_nearby_locations_for_user',
                {
                    lat: latitude,
                    lng: longitude,
                    user_race_ethnicity: this.currentUserProfile.race_ethnicity || [],
                    user_gender: this.currentUserProfile.gender || '',
                    user_lgbtq_status: this.currentUserProfile.lgbtq_status || false,
                    radius_meters: NOTIFICATION_RADIUS_METERS,
                }
            );

            if (error) {
                console.error('❌ Error fetching nearby locations:', error);
                return;
            }

            if (!nearbyLocations || nearbyLocations.length === 0) {
                console.log('📍 No nearby locations found');
                return;
            }

            console.log(`📍 Found ${nearbyLocations.length} nearby locations`);

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
        if (!rating || rating < MIN_RATING_THRESHOLD) {
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

        if (distance > NOTIFICATION_RADIUS_METERS) {
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

        console.log(`🔔 Sending notification for ${location.name} (${rating}★ - ${distance}m away)`);

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

        return hoursSinceNotification < RATE_LIMIT_HOURS;
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