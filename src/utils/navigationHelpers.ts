/**
 * NAVIGATION HELPER UTILITIES
 *
 * USED BY:
 * - src/store/locationsSlice.ts (findCorrectStepForPosition, calculateDistanceSimple)
 */

export interface NavigationStep {
    start_location: { latitude: number; longitude: number };
    end_location: { latitude: number; longitude: number };
    instructions?: string;
    distance?: number;
    duration?: number;
    maneuver?: string;
}

/**
 * Haversine distance between two coordinates (meters)
 */
export function calculateDistanceSimple(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Find the correct navigation step index for a given GPS position.
 * Used after rerouting to resume from the right step.
 *
 * Algorithm: walks forward from step 0. Advances to the next step if the
 * user is closer to the next step's start than to the current step's end,
 * OR within 50m of the current step's end. Stops as soon as neither
 * condition is met.
 */
export function findCorrectStepForPosition(
    position: { latitude: number; longitude: number },
    steps: NavigationStep[]
): number {
    let correctStep = 0;

    for (let i = 0; i < steps.length - 1; i++) {
        const currentStepEnd = steps[i].end_location;
        const nextStepStart = steps[i + 1].start_location;

        const distToCurrentEnd = calculateDistanceSimple(
            position.latitude,
            position.longitude,
            currentStepEnd.latitude,
            currentStepEnd.longitude
        );

        const distToNextStart = calculateDistanceSimple(
            position.latitude,
            position.longitude,
            nextStepStart.latitude,
            nextStepStart.longitude
        );

        if (distToNextStart < distToCurrentEnd || distToCurrentEnd < 50) {
            correctStep = i + 1;
        } else {
            break;
        }
    }

    return correctStep;
}