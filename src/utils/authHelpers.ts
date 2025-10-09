import { Alert } from 'react-native';
import { router } from 'expo-router';

export const requireAuth = (userId: string | null | undefined, action: string): boolean => {
    if (!userId) {
        Alert.alert(
            'Login Required',
            `Please log in to ${action}`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log In', onPress: () => router.push('/(auth)/login') }
            ]
        );
        return false;
    }
    return true;
};