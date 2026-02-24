import {
    calculateDistanceSimple,
    findCorrectStepForPosition,
    NavigationStep,
} from '../navigationHelpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStep(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    overrides: Partial<NavigationStep> = {}
): NavigationStep {
    return {
        start_location: { latitude: startLat, longitude: startLng },
        end_location: { latitude: endLat, longitude: endLng },
        instructions: 'Turn right',
        distance: 100,
        duration: 30,
        ...overrides,
    };
}

// NYC area coordinates for realistic tests
const TIMES_SQUARE = { lat: 40.7580, lng: -73.9855 };
const GRAND_CENTRAL = { lat: 40.7527, lng: -73.9772 };
const PENN_STATION = { lat: 40.7506, lng: -73.9971 };
const EMPIRE_STATE = { lat: 40.7484, lng: -73.9857 };
const UNION_SQUARE = { lat: 40.7359, lng: -73.9911 };

// ─── calculateDistanceSimple ──────────────────────────────────────────────────

describe('calculateDistanceSimple', () => {
    it('returns 0 for identical coordinates', () => {
        const dist = calculateDistanceSimple(40.7580, -73.9855, 40.7580, -73.9855);
        expect(dist).toBe(0);
    });

    it('is symmetric — A→B equals B→A', () => {
        const ab = calculateDistanceSimple(
            TIMES_SQUARE.lat, TIMES_SQUARE.lng,
            GRAND_CENTRAL.lat, GRAND_CENTRAL.lng
        );
        const ba = calculateDistanceSimple(
            GRAND_CENTRAL.lat, GRAND_CENTRAL.lng,
            TIMES_SQUARE.lat, TIMES_SQUARE.lng
        );
        expect(ab).toBeCloseTo(ba, 5);
    });

    it('returns distance in meters (not km)', () => {
        // Times Square to Grand Central is ~900m
        const dist = calculateDistanceSimple(
            TIMES_SQUARE.lat, TIMES_SQUARE.lng,
            GRAND_CENTRAL.lat, GRAND_CENTRAL.lng
        );
        expect(dist).toBeGreaterThan(500);
        expect(dist).toBeLessThan(1500);
    });

    it('known distance — Times Square to Grand Central ~900m', () => {
        const dist = calculateDistanceSimple(
            TIMES_SQUARE.lat, TIMES_SQUARE.lng,
            GRAND_CENTRAL.lat, GRAND_CENTRAL.lng
        );
        expect(dist).toBeGreaterThan(800);
        expect(dist).toBeLessThan(1000);
    });

    it('handles southern hemisphere coordinates', () => {
        // Sydney Opera House to Sydney Harbour Bridge ~1.4km
        const dist = calculateDistanceSimple(
            -33.8568, 151.2153,
            -33.8523, 151.2108
        );
        expect(dist).toBeGreaterThan(500);
        expect(dist).toBeLessThan(2000);
    });

    it('handles crossing the prime meridian', () => {
        const dist = calculateDistanceSimple(51.4778, -0.0015, 51.4778, 0.0015);
        expect(dist).toBeGreaterThan(0);
        expect(dist).toBeLessThan(500);
    });

    it('handles crossing the equator', () => {
        const dist = calculateDistanceSimple(-0.5, 0, 0.5, 0);
        expect(dist).toBeGreaterThan(50000);
        expect(dist).toBeLessThan(150000);
    });

    it('returns positive value for non-identical coordinates', () => {
        const dist = calculateDistanceSimple(
            TIMES_SQUARE.lat, TIMES_SQUARE.lng,
            UNION_SQUARE.lat, UNION_SQUARE.lng
        );
        expect(dist).toBeGreaterThan(0);
    });

    it('larger separation = larger distance', () => {
        const nearby = calculateDistanceSimple(
            TIMES_SQUARE.lat, TIMES_SQUARE.lng,
            GRAND_CENTRAL.lat, GRAND_CENTRAL.lng
        );
        const farther = calculateDistanceSimple(
            TIMES_SQUARE.lat, TIMES_SQUARE.lng,
            UNION_SQUARE.lat, UNION_SQUARE.lng
        );
        expect(farther).toBeGreaterThan(nearby);
    });
});

// ─── findCorrectStepForPosition ───────────────────────────────────────────────

describe('findCorrectStepForPosition', () => {

    // ── Single step ────────────────────────────────────────────────────────────

    describe('single step route', () => {
        it('returns 0 for a one-step route — nothing to advance to', () => {
            const steps = [
                makeStep(
                    TIMES_SQUARE.lat, TIMES_SQUARE.lng,
                    GRAND_CENTRAL.lat, GRAND_CENTRAL.lng
                ),
            ];
            const result = findCorrectStepForPosition(
                { latitude: TIMES_SQUARE.lat, longitude: TIMES_SQUARE.lng },
                steps
            );
            expect(result).toBe(0);
        });
    });

    // ── Two step route ─────────────────────────────────────────────────────────

    describe('two step route', () => {
        // Step 0: Times Square → Grand Central
        // Step 1: Grand Central → Penn Station
        const steps = [
            makeStep(
                TIMES_SQUARE.lat, TIMES_SQUARE.lng,
                GRAND_CENTRAL.lat, GRAND_CENTRAL.lng
            ),
            makeStep(
                GRAND_CENTRAL.lat, GRAND_CENTRAL.lng,
                PENN_STATION.lat, PENN_STATION.lng
            ),
        ];

        it('returns 0 when position is at route start', () => {
            const result = findCorrectStepForPosition(
                { latitude: TIMES_SQUARE.lat, longitude: TIMES_SQUARE.lng },
                steps
            );
            expect(result).toBe(0);
        });

        it('returns 1 when position is at step 0 end (Grand Central)', () => {
            const result = findCorrectStepForPosition(
                { latitude: GRAND_CENTRAL.lat, longitude: GRAND_CENTRAL.lng },
                steps
            );
            expect(result).toBe(1);
        });

        it('returns 0 when position is midway through step 0', () => {
            const midLat = (TIMES_SQUARE.lat + GRAND_CENTRAL.lat) / 2;
            const midLng = (TIMES_SQUARE.lng + GRAND_CENTRAL.lng) / 2;
            const result = findCorrectStepForPosition(
                { latitude: midLat, longitude: midLng },
                steps
            );
            expect(result).toBe(0);
        });
    });

    // ── Three step route ───────────────────────────────────────────────────────

    describe('three step route', () => {
        // Step 0: Times Square → Grand Central
        // Step 1: Grand Central → Empire State
        // Step 2: Empire State → Penn Station
        const steps = [
            makeStep(
                TIMES_SQUARE.lat, TIMES_SQUARE.lng,
                GRAND_CENTRAL.lat, GRAND_CENTRAL.lng
            ),
            makeStep(
                GRAND_CENTRAL.lat, GRAND_CENTRAL.lng,
                EMPIRE_STATE.lat, EMPIRE_STATE.lng
            ),
            makeStep(
                EMPIRE_STATE.lat, EMPIRE_STATE.lng,
                PENN_STATION.lat, PENN_STATION.lng
            ),
        ];

        it('returns 0 at route start', () => {
            const result = findCorrectStepForPosition(
                { latitude: TIMES_SQUARE.lat, longitude: TIMES_SQUARE.lng },
                steps
            );
            expect(result).toBe(0);
        });

        it('returns 1 when position is at Grand Central (step 0 end)', () => {
            const result = findCorrectStepForPosition(
                { latitude: GRAND_CENTRAL.lat, longitude: GRAND_CENTRAL.lng },
                steps
            );
            expect(result).toBe(1);
        });

        it('returns 0 when position is midway through step 0', () => {
            const midLat = (TIMES_SQUARE.lat + GRAND_CENTRAL.lat) / 2;
            const midLng = (TIMES_SQUARE.lng + GRAND_CENTRAL.lng) / 2;
            const result = findCorrectStepForPosition(
                { latitude: midLat, longitude: midLng },
                steps
            );
            expect(result).toBe(0);
        });

        it('returns 0 when far from any transition point', () => {
            // Well within step 0, far from Grand Central
            const result = findCorrectStepForPosition(
                { latitude: TIMES_SQUARE.lat + 0.001, longitude: TIMES_SQUARE.lng },
                steps
            );
            expect(result).toBe(0);
        });
    });

    // ── 50m threshold behaviour ────────────────────────────────────────────────

    describe('50m threshold — advance when within 50m of step end', () => {
        it('advances step when position is within 50m of current step end', () => {
            // Two steps far apart so proximity wins over distance comparison
            const steps = [
                makeStep(0, 0, 0.0004, 0),   // step 0 ends ~44m north of origin
                makeStep(0.0004, 0, 1, 0),   // step 1 goes far away
            ];

            // Position very close to step 0 end (~10m away)
            const result = findCorrectStepForPosition(
                { latitude: 0.00039, longitude: 0 },
                steps
            );
            expect(result).toBe(1);
        });

        it('does not advance when position is well beyond 50m from step end', () => {
            // Step 0 ends far away, step 1 starts even farther
            const steps = [
                makeStep(0, 0, 1, 0),    // step 0 ends ~111km away
                makeStep(1, 0, 2, 0),    // step 1 ends even farther
            ];

            // Position at origin — far from both ends
            const result = findCorrectStepForPosition(
                { latitude: 0, longitude: 0 },
                steps
            );
            expect(result).toBe(0);
        });
    });

    // ── Return value bounds ────────────────────────────────────────────────────

    describe('return value bounds', () => {
        it('never returns a negative step', () => {
            const steps = [
                makeStep(0, 0, 1, 0),
                makeStep(1, 0, 2, 0),
            ];
            const result = findCorrectStepForPosition({ latitude: 0, longitude: 0 }, steps);
            expect(result).toBeGreaterThanOrEqual(0);
        });

        it('never returns a step index beyond steps.length - 1', () => {
            const steps = [
                makeStep(0, 0, 1, 0),
                makeStep(1, 0, 2, 0),
                makeStep(2, 0, 3, 0),
            ];
            // Position at the very end of the route
            const result = findCorrectStepForPosition({ latitude: 3, longitude: 0 }, steps);
            expect(result).toBeLessThan(steps.length);
        });

        it('always returns an integer', () => {
            const steps = [
                makeStep(TIMES_SQUARE.lat, TIMES_SQUARE.lng, GRAND_CENTRAL.lat, GRAND_CENTRAL.lng),
                makeStep(GRAND_CENTRAL.lat, GRAND_CENTRAL.lng, PENN_STATION.lat, PENN_STATION.lng),
            ];
            const result = findCorrectStepForPosition(
                { latitude: TIMES_SQUARE.lat, longitude: TIMES_SQUARE.lng },
                steps
            );
            expect(Number.isInteger(result)).toBe(true);
        });
    });

    // ── Early-exit (break) behaviour ───────────────────────────────────────────

    describe('early exit — stops at first non-advancing step', () => {
        it('stops advancing after first step that does not meet criteria', () => {
            // Step 0 end and step 1 start are at Grand Central
            // Step 1 end is at Empire State
            // Step 2 start is at Penn Station (far from position)
            // Position is at Grand Central — should advance to step 1 but not step 2
            const steps = [
                makeStep(
                    TIMES_SQUARE.lat, TIMES_SQUARE.lng,
                    GRAND_CENTRAL.lat, GRAND_CENTRAL.lng
                ),
                makeStep(
                    GRAND_CENTRAL.lat, GRAND_CENTRAL.lng,
                    EMPIRE_STATE.lat, EMPIRE_STATE.lng
                ),
                makeStep(
                    EMPIRE_STATE.lat, EMPIRE_STATE.lng,
                    PENN_STATION.lat, PENN_STATION.lng
                ),
            ];

            // At Grand Central: closer to step 1 start than step 0 end → advance to 1
            // At step 1: not close to Empire State end → stop at 1
            const result = findCorrectStepForPosition(
                { latitude: GRAND_CENTRAL.lat, longitude: GRAND_CENTRAL.lng },
                steps
            );
            expect(result).toBe(1);
        });
    });
});