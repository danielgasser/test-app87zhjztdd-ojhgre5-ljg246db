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
    LOCATION_CONFIDENCE_MAX: 0.8,              // Max confidence for location predictions
    CONFIDENCE_DATA_POINTS_DIVISOR: 10,        // Divide data points by this for confidence
    MIN_REVIEWS_FOR_PATTERNS: 2,               // Minimum reviews to detect patterns


    // NEW: Confidence Calculation
    CONFIDENCE_SETTINGS: {
      NEUTRAL_BASELINE: 0.15,            // 15% confidence for no-data predictions
      DATA_POINTS_DIVISOR: 15,           // Divide data sources by this for confidence
      MAX_CONFIDENCE: 0.8,               // Maximum confidence cap (80%)
      MIN_CONFIDENCE: 0.05,     // Minimum confidence floor (5%)
    },

    // NEW: Nearby Location Search
    NEARBY_SEARCH: {
      RADIUS_METERS: 1000,               // 1km radius for nearby locations
      MAX_NEARBY_LOCATIONS: 20,          // Maximum nearby locations to consider
    }
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
  PATTERN_DETECTION: {
    MIN_REVIEWS_FOR_PATTERNS: 2,          // Already in your config
    DISPARITY_THRESHOLDS: {
      HIGH_SEVERITY: 3.0,                 // High severity disparity
      MEDIUM_SEVERITY: 2.0,               // Medium severity disparity  
      LOW_SEVERITY: 1.0,                  // Low severity disparity
    },
    TIME_DISCRIMINATION_THRESHOLD: 1.5,   // Threshold for time-based patterns
    SUNDOWN_TOWN_THRESHOLD: 2.5,          // Threshold for sundown town detection
  },
  DANGER_ZONES: {
    SEARCH_RADIUS_MILES: 50,              // Already in your config
    POLYGON_RADIUS_MILES: 2,              // Already in your config  
    POLYGON_SIDES: 8,                     // Already in your config
    MIN_INCIDENTS_FOR_ZONE: 3,            // Minimum incidents to create danger zone
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
    MIN_RECOMMENDATION_SCORE: 3.5,        // Minimum score to recommend
    MAX_RECOMMENDATIONS: 10,               // Maximum recommendations to return
    PREFER_RECENT_REVIEWS: true,          // Prefer locations with recent reviews
    RECENCY_BONUS_DAYS: 30,               // Days to apply recency bonus
  },
  API_SETTINGS: {
    DEFAULT_PAGE_SIZE: 20,                // Default pagination size
    MAX_PAGE_SIZE: 100,                   // Maximum items per page
    REQUEST_TIMEOUT_MS: 5000,             // API request timeout
    RETRY_ATTEMPTS: 3,                    // Number of retry attempts
  },

  DATABASE: {
    MAX_REVIEWS_PER_USER_LOCATION: 1,     // Already enforced by business rules
    REVIEW_SOFT_DELETE: true,             // Use soft delete for reviews
    LOCATION_CACHE_TTL_MINUTES: 30,       // Location data cache time-to-live
  },

} as const;

// Type-safe access to config values
export type AppConfig = typeof APP_CONFIG;