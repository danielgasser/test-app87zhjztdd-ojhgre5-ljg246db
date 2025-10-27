import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { notify } from './notificationService';

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