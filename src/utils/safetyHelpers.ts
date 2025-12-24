/**
 * SAFETY SCORE UTILITIES
 * Centralized safety rating colors and classifications
 * 
 * USED BY:
 * - app/(tabs)/index.tsx (getRouteLineColor)
 * - app/(tabs)/community.tsx (getRatingColor)
 * - src/components/LocationDetailsModal.tsx
 */

import { theme } from "@/styles/theme";
import { APP_CONFIG } from "../config/appConfig";

/**
 * Get color for a safety score (1-5 rating)
 * @param score - Safety score from 1-5
 * @returns Color string from theme
 */
export function getSafetyColor(score: number): string {
    if (score >= APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD) {
        return APP_CONFIG.ROUTE_DISPLAY.COLORS.SAFE_ROUTE; // Green
    } else if (score >= APP_CONFIG.ROUTE_PLANNING.MIXED_ROUTE_THRESHOLD) {
        return APP_CONFIG.ROUTE_DISPLAY.COLORS.MIXED_ROUTE; // Yellow
    } else {
        return APP_CONFIG.ROUTE_DISPLAY.COLORS.UNSAFE_ROUTE; // Red
    }
}

/**
 * Get color for route based on overall safety analysis
 * @param route - Route object with safety_analysis
 * @returns Color string for route display
 */
export function getRouteLineColor(route: any): string {
    if (!route.safety_analysis) {
        return APP_CONFIG.ROUTE_DISPLAY.COLORS.SELECTED_ROUTE;
    }

    return getSafetyColor(route.safety_analysis.overall_route_score);
}

/**
 * Get severity level color
 * @param severity - 'high' | 'medium' | 'low'
 * @param theme - Theme object containing color values
 * @returns Color string
 */
export function getSeverityColor(
    severity: 'high' | 'medium' | 'low'
): string {
    switch (severity) {
        case 'high':
            return theme.colors.error;
        case 'medium':
            return theme.colors.mixedYellow;
        case 'low':
            return theme.colors.secondary;
        default:
            return theme.colors.textSecondary;
    }
}