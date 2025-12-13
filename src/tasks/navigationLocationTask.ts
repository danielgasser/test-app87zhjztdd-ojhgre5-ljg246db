import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { store } from '@/store';
import { setNavigationPosition } from '@/store/locationsSlice';
import { logger } from '@/utils/logger';

export const NAVIGATION_LOCATION_TASK = 'navigation-location-task';

// This must be defined at the top level (outside of any component)
TaskManager.defineTask(NAVIGATION_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) {
        logger.error('[BackgroundLocation] Error:', error.message);
        return;
    }

    if (data) {
        const { locations } = data;
        const location = locations[0];

        if (location) {
            const position = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                heading: location.coords.heading || undefined,
            };

            // Dispatch to Redux store (works even in background)
            store.dispatch(setNavigationPosition(position));
        }
    }
});