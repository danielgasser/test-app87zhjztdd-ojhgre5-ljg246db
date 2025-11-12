import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';
import { AuthState } from './AuthProvider';
import { DeepLinkIntent } from './DeepLinkManager';

export interface RoutingContext {
    authState: AuthState;
    deepLinkIntent?: DeepLinkIntent;
    isFirstLaunch?: boolean;
}

export type AppRoute =
    | '/welcome'
    | '/(auth)/login'
    | '/(auth)/reset-password'
    | '/onboarding'
    | '/(tabs)'
    | null; // null means no routing needed

export class RouteManager {
    /**
     * Main routing decision function - THE ONLY PLACE that decides where to route
     */
    public static determineRoute(context: RoutingContext): AppRoute {
        const { authState, deepLinkIntent, isFirstLaunch } = context;

        logger.info('RouteManager: Determining route with context', {
            isAuthenticated: authState.isAuthenticated,
            needsOnboarding: authState.needsOnboarding,
            isLoading: authState.isLoading,
            deepLinkType: deepLinkIntent?.type,
            isFirstLaunch,
        });

        // 1. DEEP LINKS ALWAYS WIN (highest priority)
        if (deepLinkIntent?.type) {
            switch (deepLinkIntent.type) {
                case 'password_reset':
                    return '/(auth)/reset-password';

                case 'oauth_callback':
                    // OAuth handled by AuthProvider, route based on resulting auth state
                    if (!authState.isAuthenticated) {
                        return '/(auth)/login'; // OAuth failed
                    }
                    if (authState.needsOnboarding) {
                        return '/onboarding'; // New user needs onboarding
                    }
                    return '/(tabs)'; // Existing user goes to app

                case 'notification':
                    // Notification links require authentication
                    if (!authState.isAuthenticated) {
                        return '/(auth)/login'; // Login first, then handle notification
                    }
                    return '/(tabs)'; // Go to app (notification will be handled there)

                case 'welcome':
                    return '/welcome'; // Universal link to welcome page

                default:
                    break;
            }
        }

        // 2. AUTH-BASED ROUTING (second priority)
        if (!authState.isAuthenticated) {
            return '/(auth)/login'; // Not authenticated -> login
        }

        if (authState.needsOnboarding) {
            return '/onboarding'; // Authenticated but needs onboarding
        }

        // 3. FIRST LAUNCH (only for authenticated users)
        if (isFirstLaunch === true) {
            return '/welcome'; // First time opening app
        }

        // 4. DEFAULT (authenticated, onboarded, not first launch)
        return '/(tabs)'; // Main app
    }

    /**
     * Check if this is the first launch
     */
    public static async checkFirstLaunch(): Promise<boolean> {
        try {
            const hasLaunched = await AsyncStorage.getItem('hasLaunched');
            const isFirstLaunch = hasLaunched === null;

            if (isFirstLaunch) {
                await AsyncStorage.setItem('hasLaunched', 'true');
            }

            return isFirstLaunch;
        } catch (error) {
            logger.error('RouteManager: Failed to check first launch', { error });
            return false; // Default to not first launch on error
        }
    }

    /**
     * Validate that a route is safe to navigate to
     */
    public static validateRoute(route: AppRoute, authState: AuthState): boolean {
        if (!route) return true; // null route is always valid

        // Protected routes require authentication
        const protectedRoutes = ['/onboarding', '/(tabs)'];
        if (protectedRoutes.includes(route) && !authState.isAuthenticated) {
            logger.warn('RouteManager: Attempted to route to protected route while unauthenticated', { route });
            return false;
        }

        return true;
    }

    /**
     * Log routing decision for debugging
     */
    public static logRouting(context: RoutingContext, targetRoute: AppRoute): void {
        const { authState, deepLinkIntent, isFirstLaunch } = context;

        logger.info('RouteManager: Routing decision', {
            input: {
                authenticated: authState.isAuthenticated,
                needsOnboarding: authState.needsOnboarding,
                deepLink: deepLinkIntent?.type || 'none',
                firstLaunch: isFirstLaunch,
            },
            output: {
                targetRoute: targetRoute || 'no-routing',
            },
        });
    }
}