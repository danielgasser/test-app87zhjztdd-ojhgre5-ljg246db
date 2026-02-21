import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { notify } from './notificationService';
import { Alert } from 'react-native';
import { logger } from '@sentry/react-native';

export const clearAllSessions = async () => {
    try {
        // Clear Supabase session key from SecureStore
        await SecureStore.deleteItemAsync('supabase.auth.token');

        // Clear AsyncStorage
        await AsyncStorage.clear();

        // Force sign out
        await supabase.auth.signOut({ scope: 'local' });

        notify.success('Session cleared! Restart app.');
        return true;
    } catch (error) {
        console.error('Clear session error:', error);
        notify.error('Failed to clear session');
        return false;
    }
};

export const nukeEverything = async () => {
    try {
        // Delete all possible Supabase keys
        const possibleKeys = [
            "supabase.auth.token",
            `sb-${process.env.EXPO_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]
            }-auth-token`,
            "supabase-auth-token",
        ];

        for (const key of possibleKeys) {
            try {
                await SecureStore.deleteItemAsync(key);
            } catch (e) { }
        }

        await AsyncStorage.clear();
        Alert.alert("CLEARED! Force close app now (swipe up), then reopen");
    } catch (error) {
        logger.error(`${error}`);
    }
};