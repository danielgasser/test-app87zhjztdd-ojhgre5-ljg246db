import { router } from 'expo-router';
import { notify } from './notificationService';

export const requireAuth = (userId: string | null | undefined, action: string): boolean => {
    if (!userId) {
        notify.confirm(
            'Login Required',
            `Please log in to ${action}`,
            [
                { text: 'Cancel', style: 'cancel', onPress: () => { } },
                { text: 'Log In', onPress: () => router.push('/(auth)/login') }
            ]
        );
        return false;
    }
    return true;
};