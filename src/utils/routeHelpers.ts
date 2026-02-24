import type { RouteRequest, RouteSafetyAnalysis } from '@/store/locationsSlice';

/**
 * Determine a human-readable route name based on safety score
 * Thresholds match APP_CONFIG.ROUTE_PLANNING safe/mixed route thresholds (4.0 / 3.0)
 */
export function determineBestRouteName(safetyAnalysis: RouteSafetyAnalysis): string {
    const { overall_route_score } = safetyAnalysis;

    if (overall_route_score >= 4.0) {
        return 'Safe Route';
    } else if (overall_route_score >= 3.0) {
        return 'Moderate Safety Route';
    } else {
        return 'Caution Advised Route';
    }
}

/**
 * Determine route type based on safety score and user preferences
 */
export function determineRouteType(
    safetyAnalysis: RouteSafetyAnalysis,
    preferences: RouteRequest['route_preferences']
): 'fastest' | 'safest' | 'balanced' {
    if (preferences.prioritize_safety) {
        return 'safest';
    } else if (safetyAnalysis.overall_route_score >= 4.0) {
        return 'balanced';
    } else {
        return 'fastest';
    }
}