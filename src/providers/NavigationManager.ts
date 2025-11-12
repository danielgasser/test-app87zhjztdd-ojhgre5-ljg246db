import { store } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import {
    checkForActiveNavigation,
    startNavigationSession,
    endNavigationSession,
    setSelectedRoute,
    startNavigation,
    endNavigation,
    SafeRoute,
    RouteCoordinate,
    setRouteRequest,
    setNavigationSessionId,
    calculateRouteSafety
} from '@/store/locationsSlice';
import { notify } from '@/utils/notificationService';
import { logger } from '@/utils/logger';
import { formatTimeAgo, hoursAgo } from '@/utils/timeHelpers';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

export function useNavigationManager() {
    const dispatch = useAppDispatch();
    const router = useRouter();

    const handleContinueNavigation = useCallback(async (activeRoute: any) => {
        try {
            // Validate route coordinates structure
            if (
                !Array.isArray(activeRoute.route_coordinates) ||
                activeRoute.route_coordinates.length === 0 ||
                !activeRoute.route_coordinates.every(
                    (coord: any) =>
                        typeof coord === "object" &&
                        coord !== null &&
                        typeof coord.latitude === "number" &&
                        typeof coord.longitude === "number"
                )
            ) {
                notify.error("Invalid route data format");
                return;
            }

            const routeCoords = activeRoute.route_coordinates as unknown as RouteCoordinate[];
            notify.info("Recalculating route safety...");

            const state = store.getState();
            const userProfile = state.user.profile;

            if (!userProfile) {
                notify.error("Profile required to calculate route safety");
                return;
            }

            const safetyAnalysis = await dispatch(
                calculateRouteSafety({
                    route_coordinates: routeCoords,
                    user_demographics: {
                        race_ethnicity: userProfile.race_ethnicity?.[0] || "",
                        gender: userProfile.gender || "",
                        lgbtq_status: String(userProfile.lgbtq_status ?? ""),
                        religion: userProfile.religion || "",
                        disability_status: userProfile.disability_status?.[0] || "",
                        age_range: userProfile.age_range || "",
                    },
                })
            ).unwrap();

            const safeRoute: SafeRoute = {
                id: `db_route_${activeRoute.id}`,
                name: `${activeRoute.origin_name} → ${activeRoute.destination_name}`,
                route_type: "balanced",
                coordinates: routeCoords,
                route_points: routeCoords,
                estimated_duration_minutes: activeRoute.duration_minutes,
                distance_kilometers: activeRoute.distance_km,
                safety_analysis: safetyAnalysis,
                created_at: activeRoute.created_at,
                databaseId: activeRoute.id,
            };

            const origin = routeCoords[0];
            const destination = routeCoords[routeCoords.length - 1];

            // Restore the route request for rerouting
            dispatch(
                setRouteRequest({
                    origin: {
                        latitude: origin.latitude,
                        longitude: origin.longitude,
                    },
                    destination: {
                        latitude: destination.latitude,
                        longitude: destination.longitude,
                    },
                    user_demographics: {
                        race_ethnicity: userProfile.race_ethnicity?.[0] || "",
                        gender: userProfile.gender || "",
                        lgbtq_status: String(userProfile.lgbtq_status ?? ""),
                        religion: userProfile.religion || "",
                        disability_status: userProfile.disability_status?.[0] || "",
                        age_range: userProfile.age_range || "",
                    },
                    route_preferences: {
                        prioritize_safety: true,
                        avoid_evening_danger: false,
                        max_detour_minutes: 15,
                    },
                })
            );

            // Restore navigation session ID
            if (activeRoute.navigation_session_id) {
                dispatch(setNavigationSessionId(activeRoute.navigation_session_id));
            }

            dispatch(setSelectedRoute(safeRoute));
            await dispatch(startNavigationSession(activeRoute.id));
            dispatch(startNavigation());
            router.push("/(tabs)");
        } catch (error) {
            logger.error("Failed to restore navigation", { error });
            notify.error("Failed to restore route. Please try again.");
        }
    }, [dispatch, router]);

    const checkForUnfinishedNavigation = useCallback(async () => {
        try {
            const activeRoute = await dispatch(checkForActiveNavigation()).unwrap();

            if (!activeRoute) {
                return; // No active navigation found
            }

            // Check if user is currently navigating
            const state = store.getState();
            const isCurrentlyNavigating = state.locations.navigationActive;

            if (isCurrentlyNavigating) {
                return; // User is already navigating, do nothing
            }

            if (!activeRoute.navigation_started_at) {
                logger.error("Active route missing start time");
                return;
            }

            // User has unfinished route but not currently navigating - ask them
            const routeTime = new Date(activeRoute.navigation_started_at);
            const timeAgo = formatTimeAgo(routeTime);
            const hoursSinceStart = hoursAgo(routeTime);

            // Auto-cleanup routes older than 24 hours
            if (hoursSinceStart > 24) {
                await dispatch(endNavigationSession(activeRoute.id));
                dispatch(endNavigation());
                return;
            }

            // Show confirmation dialog
            notify.confirm(
                "Unfinished Route",
                `You have a route from ${timeAgo}. Would you like to continue?`,
                [
                    {
                        text: "Discard",
                        style: "destructive",
                        onPress: async () => {
                            await dispatch(endNavigationSession(activeRoute.id));
                        },
                    },
                    {
                        text: "Not Now",
                        style: "cancel",
                        onPress: () => { },
                    },
                    {
                        text: "Continue",
                        onPress: () => {
                            handleContinueNavigation(activeRoute);
                        },
                    },
                ]
            );
        } catch (error) {
            logger.error("Error checking active navigation", { error });
        }
    }, [dispatch, handleContinueNavigation]);

    return {
        checkForUnfinishedNavigation,
        handleContinueNavigation,
    };
}