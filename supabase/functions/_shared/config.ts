export const EDGE_CONFIG = {
    ML_PARAMS: {
        SIMILAR_USERS_FETCH_LIMIT: 20,
        NEUTRAL_SCORE_BASELINE: 3.5,               // Neutral score for predictions
        CONFIDENCE_SETTINGS: {
            MIN_CONFIDENCE_THRESHOLD: 0.5,
            RATING_DIVISOR: 3,
        },
        PREDICTION_WEIGHTS: {
            PLACE_TYPE_OVERALL: 0.3,           // 30% weight for place type averages
            DEMOGRAPHIC_MATCHES: 0.7,          // 70% weight for demographic-specific scores
            NEARBY_OVERALL: 0.2,               // 20% weight for nearby location averages  
            NEARBY_DEMOGRAPHIC: 0.4,           // 40% weight for nearby demographic matches
        },
    },
    SAFETY_THRESHOLDS: {
        SAFE_MINIMUM: 4.0,
    },
    PATTERN_DETECTION: {
        COMMON_PATTERN_DEMOGRAPHICS_THRESHOLD: 0.6,
        MIN_REVIEWS_FOR_PATTERNS: 2,          // Already in your config
        DISPARITY_THRESHOLDS: {
            HIGH_SEVERITY: 3.0,                 // High severity disparity
            MEDIUM_SEVERITY: 2.0,               // Medium severity disparity  
            LOW_SEVERITY: 1.0,                  // Low severity disparity
        },
        TIME_DISCRIMINATION_THRESHOLD: 1.5,   // Threshold for time-based patterns
        SUNDOWN_TOWN_THRESHOLD: 2.5,          // Threshold for sundown town detection
    },
    SIMILARITY_CALCULATION: {
        DEMOGRAPHIC_WEIGHTS: {
            RACE_ETHNICITY: 0.3,                // Weight for race/ethnicity matching
            GENDER: 0.25,                       // Weight for gender matching  
            LGBTQ_STATUS: 0.2,                  // Weight for LGBTQ status matching
            RELIGION: 0.15,                     // Weight for religion matching
            DISABILITY: 0.1,                    // Weight for disability status matching
            AGE_RANGE: 0.05,
        },
        MIN_SIMILARITY_SCORE: 0.5,            // Minimum similarity to consider users similar
        MAX_SIMILAR_USERS: 20,                // Maximum similar users to return
    },
    DANGER_ZONES: {
        SEARCH_RADIUS_MILES: 50,              // Already in your config
        POLYGON_RADIUS_MILES: 2,              // Already in your config  
        POLYGON_SIDES: 8,                     // Already in your config
        MIN_INCIDENTS_FOR_ZONE: 3,       // Minimum incidents to create danger zone
        SEVERITY_MULTIPLIERS: {
            HIGH: 2.0,                          // High severity incident weight
            MEDIUM: 1.5,                        // Medium severity incident weight
            LOW: 1.0,                           // Low severity incident weight
        }
    },
    RECOMMENDATIONS: {
        SCORING_WEIGHTS: {
            SAFETY_SCORE: 0.4,                  // 40% weight for safety ratings
            COMFORT_SCORE: 0.3,                 // 30% weight for comfort ratings
            ACCESSIBILITY_SCORE: 0.2,           // 20% weight for accessibility
            OVERALL_SCORE: 0.1,                 // 10% weight for overall rating
        },
    },
    NAVIGATION: {
        NOTIFICATIONS: {
            RATE_LIMIT_WINDOW_MINUTES: 10,
            BATCH_WINDOW_SECONDS: 30
        }
    }

}