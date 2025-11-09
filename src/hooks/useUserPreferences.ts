import { useAppSelector } from '@/store/hooks';
import { NotificationPreferences } from '@/store/userSlice';
import { getDefaultPreferences } from '@/utils/preferenceDefaults';

/**
 * Custom hook to access user display preferences with country-based defaults
 * @returns User's time format and distance unit preferences
 */
export function useUserPreferences() {
    const profile = useAppSelector((state) => state.user.profile);
    const userCountry = useAppSelector((state) => state.locations.userCountry);

    const prefs: NotificationPreferences = profile?.notification_preferences || {};
    const defaults = getDefaultPreferences(userCountry);

    return {
        timeFormat: prefs.time_format ?? defaults.time_format,
        distanceUnit: prefs.distance_unit ?? defaults.distance_unit,
    };
}