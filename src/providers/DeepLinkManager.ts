import { Linking } from 'react-native';
import { logger } from '@/utils/logger';
import { supabase } from '@/services/supabase';

export interface DeepLinkIntent {
    type: 'password_reset' | 'oauth_callback' | 'notification' | 'welcome' | null;
    data?: Record<string, any>;
    targetRoute?: string;
}

export interface DeepLinkContext {
    url: string;
    isInitialLoad: boolean;
}

export class DeepLinkManager {
    private static instance: DeepLinkManager;
    private listeners: Set<(intent: DeepLinkIntent) => void> = new Set();

    public static getInstance(): DeepLinkManager {
        if (!DeepLinkManager.instance) {
            DeepLinkManager.instance = new DeepLinkManager();
        }
        return DeepLinkManager.instance;
    }

    /**
     * Parse a URL and extract the intent
     */
    public static parseURL(url: string): DeepLinkIntent {
        if (!url) return { type: null };

        logger.info('DeepLink: Parsing URL', { url });

        try {
            // Password reset links
            if (url.includes('type=recovery')) {
                const urlObj = new URL(url);
                const type = urlObj.searchParams.get('type');
                const accessToken = urlObj.searchParams.get('access_token');
                const refreshToken = urlObj.searchParams.get('refresh_token');

                if (type === 'recovery' && accessToken && refreshToken) {
                    return {
                        type: 'password_reset',
                        data: { accessToken, refreshToken },
                        targetRoute: '/(auth)/reset-password',
                    };
                }
            }

            // OAuth callbacks (Google, etc.)
            if (url.includes('#access_token=')) {
                const hashPart = url.split('#')[1];
                const params = new URLSearchParams(hashPart);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    return {
                        type: 'oauth_callback',
                        data: { accessToken, refreshToken },
                        targetRoute: undefined, // Will be determined after auth
                    };
                }
            }

            // Notification deep links
            if (url.includes('notification_id=')) {
                const urlObj = new URL(url);
                const notificationId = urlObj.searchParams.get('notification_id');
                const locationId = urlObj.searchParams.get('location_id');

                return {
                    type: 'notification',
                    data: { notificationId, locationId },
                    targetRoute: '/(tabs)', // Navigate to main app
                };
            }

            // App launch from universal link (non-auth)
            if (url.includes('safepath.app')) {
                return {
                    type: 'welcome',
                    targetRoute: '/welcome',
                };
            }

            return { type: null };
        } catch (error) {
            logger.error('DeepLink: Failed to parse URL:', error);
            return { type: null };
        }
    }

    /**
     * Handle password reset deep link
     */
    public static async handlePasswordReset(data: { accessToken: string; refreshToken: string }): Promise<boolean> {
        try {
            const { error } = await supabase.auth.setSession({
                access_token: data.accessToken,
                refresh_token: data.refreshToken,
            });

            if (error) {
                logger.error('Password reset session error:', error);
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Password reset failed:', error);
            return false;
        }
    }

    /**
     * Handle OAuth callback deep link
     */
    public static async handleOAuthCallback(data: { accessToken: string; refreshToken: string }): Promise<boolean> {
        try {
            const { data: sessionData, error } = await supabase.auth.setSession({
                access_token: data.accessToken,
                refresh_token: data.refreshToken,
            });

            if (error || !sessionData.session) {
                logger.error('OAuth session error:', error);
                return false;
            }

            // Session is set, AuthProvider will handle the rest
            return true;
        } catch (error) {
            logger.error('OAuth callback failed:', error);
            return false;
        }
    }

    /**
     * Get initial URL when app launches
     */
    public static async getInitialURL(): Promise<DeepLinkIntent> {
        try {
            const url = await Linking.getInitialURL();
            return DeepLinkManager.parseURL(url || '');
        } catch (error) {
            logger.error('Failed to get initial URL:', error);
            return { type: null };
        }
    }

    /**
     * Set up deep link listener
     */
    public static setupListener(callback: (intent: DeepLinkIntent) => void): () => void {
        const handleURL = ({ url }: { url: string }) => {
            const intent = DeepLinkManager.parseURL(url);
            callback(intent);
        };

        const subscription = Linking.addEventListener('url', handleURL);

        return () => {
            subscription.remove();
        };
    }
}