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
    RECOMMENDATIONS: {
        DEFAULT_RECOMMENDATION_LIMIT: 10,
    },
    SAFETY_THRESHOLDS: {
        SAFE_MINIMUM: 4.0,
    },
    PATTERN_DETECTION: {
        COMMON_PATTERN_DEMOGRAHICS_THRESHOLD: 0.6,

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

}