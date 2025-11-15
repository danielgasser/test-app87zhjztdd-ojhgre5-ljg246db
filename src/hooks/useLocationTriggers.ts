// ================================================
// LOCATION TRIGGERS APP INTEGRATION
// Hook to integrate location trigger service into the app
// ================================================

import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { locationTriggerService } from '../services/locationTriggerService';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Hook to manage location trigger service lifecycle
 * Starts when user is logged in and app is active
 * Stops when user logs out or app goes to background
 */

export function useLocationTriggers() {
    const { user } = useAuth();
    const profile = useAppSelector((state) => state.user.profile);

    useEffect(() => {
        // Only start if user is logged in and has profile
        if (!user?.id || !profile) {
            return;
        }

        // Start service
        locationTriggerService.start(user.id, profile);

        // Handle app state changes
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                // App came to foreground - resume monitoring
                locationTriggerService.start(user.id, profile);
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                // App went to background - stop monitoring
                locationTriggerService.stop();
            }
        });

        // Cleanup on unmount or when user/profile changes
        return () => {
            subscription.remove();
            locationTriggerService.stop();
        };
    }, [user?.id, profile]);

    return null;
}