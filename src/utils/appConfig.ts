// SafePath Configuration Constants
// Centralized configuration for all hardcoded values across the app

export const APP_CONFIG = {
  // Distance & Radius Settings
  DISTANCE: {
    DEFAULT_SEARCH_RADIUS_METERS: 5000,        // Default radius for nearby locations search
    DANGER_ZONE_SEARCH_RADIUS_MILES: 50,       // Default radius for danger zone search
    DANGER_ZONE_POLYGON_RADIUS_MILES: 2,       // Radius for individual danger zone polygons
    DANGER_ZONE_POLYGON_SIDES: 8,              // Number of sides for danger zone polygon (octagon)
  },

  // Safety Score Thresholds
  SAFETY_THRESHOLDS: {
    DANGER_HIGH: 2.0,                          // Score < 2 = high danger
    DANGER_MEDIUM: 2.5,                        // Score < 2.5 = medium danger
    DANGER_CUTOFF: 3.0,                        // Score < 3 = dangerous location
    SAFE_MINIMUM: 4.0,                         // Score >= 4 = safe location
    PATTERN_DETECTION_DEFAULT: 1.5,            // Default threshold for discrimination patterns
    PATTERN_DISPARITY_HIGH: 3.0,               // High severity disparity
    PATTERN_DISPARITY_MEDIUM: 2.0,             // Medium severity disparity
  },

  // Map Marker Colors & Thresholds
  MAP_MARKERS: {
    COLOR_SAFE: '#4CAF50',                     // Green for safe (4+)
    COLOR_MIXED: '#FFC107',                    // Yellow for mixed (3-3.9)
    COLOR_MEDIUM: '#FF9800',                    // Yellow for mixed (3-3.9)
    COLOR_UNSAFE: '#F44336',                   // Red for unsafe (<3)
    COLOR_NO_REVIEWS: '#2196F3',               // Blue for no reviews
    THRESHOLD_SAFE: 4.0,
    THRESHOLD_MIXED: 3.0,
  },

  // ML/Algorithm Parameters
  ML_PARAMS: {
    SIMILARITY_MIN_CONFIDENCE: 0.5,            // Minimum confidence for similar users
    SIMILAR_USERS_FETCH_LIMIT: 20,             // Max similar users to fetch
    NEUTRAL_SCORE_BASELINE: 3.5,               // Neutral score for predictions
    LOCATION_CONFIDENCE_MAX: 0.8,              // Max confidence for location predictions
    CONFIDENCE_DATA_POINTS_DIVISOR: 10,        // Divide data points by this for confidence
    MIN_REVIEWS_FOR_PATTERNS: 2,               // Minimum reviews to detect patterns
  },

  // Time-Based Categories
  TIME_CATEGORIES: {
    MORNING: 'morning',
    AFTERNOON: 'afternoon',
    EVENING: 'evening',
    NIGHT: 'night',
  },

  // Business Rules
  BUSINESS_RULES: {
    ONE_REVIEW_PER_USER_LOCATION: true,       // Enforce single review per user/location
    REQUIRE_EMAIL_CONFIRMATION: false,         // Currently disabled for dev
    MIN_DEMOGRAPHIC_GROUPS_FOR_COMPARISON: 2,  // Min groups to compare for patterns
  },

  // Heat Map Settings
  HEAT_MAP: {
    BASE_RADIUS: 800,                          // Base radius for heat map circles
    ZOOM_RADIUS_MULTIPLIER: 50,               // Multiply by zoom level
    MIN_RADIUS: 200,                           // Minimum circle radius
    MAX_RADIUS: 2000,                          // Maximum circle radius
  },

} as const;

// Type-safe access to config values
export type AppConfig = typeof APP_CONFIG;