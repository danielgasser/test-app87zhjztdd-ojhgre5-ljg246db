import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAppSelector } from '@/store/hooks';

export function useAdminGuard() {
    const profile = useAppSelector((state) => state.user.profile);
    const loading = useAppSelector((state) => state.user.loading);

    const isAdmin = profile?.role === 'admin';

    useEffect(() => {
        // Wait until profile is loaded before deciding
        if (!loading && profile !== undefined && !isAdmin) {
            router.replace('/(tabs)');
        }
    }, [loading, profile, isAdmin]);

    return { isAdmin, loading };
}