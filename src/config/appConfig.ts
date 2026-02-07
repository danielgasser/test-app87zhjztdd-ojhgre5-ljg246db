// TruGuide Configuration Constants
// Centralized configuration for all hardcoded values across the app

export const APP_CONFIG = {
  // Distance & Radius Settings
  DISTANCE: {
    DEFAULT_SEARCH_RADIUS_METERS: 5000,        // Default radius for nearby locations search
    DANGER_ZONE_SEARCH_RADIUS_MILES: 50,       // Default radius for danger zone search
    DANGER_ZONE_POLYGON_RADIUS_MILES: 2,       // Radius for individual danger zone polygons
    DANGER_ZONE_POLYGON_SIDES: 8,              // Number of sides for danger zone polygon (octagon)
    DANGER_ZONES_MAX_RADIUS_METERS: 100000,
    // Search radius options (in kilometers)
    SEARCH_RADIUS_OPTIONS: [
      { label: '100 km', value: 100, description: 'Regional' },
      { label: '1000 km', value: 1000, description: 'Country-wide' },
      { label: '∞', value: 999999, description: 'Global' },
    ],

    MIN_SEARCH_RADIUS_KM: 1,
    MAX_SEARCH_RADIUS_KM: 999999,
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
    REVIEW_EDIT_TIMEFRAME: 24,                // Time window a user can edit their review in hours        
    REQUIRE_EMAIL_CONFIRMATION: true,         // Currently disabled for dev
    MIN_DEMOGRAPHIC_GROUPS_FOR_COMPARISON: 2,  // Min groups to compare for patterns
  },

  RECOMMENDATIONS: {
    MIN_RECOMMENDATION_SCORE: 3.5,        // Minimum score to recommend
    MAX_RECOMMENDATIONS: 10,               // Maximum recommendations to return
    PREFER_RECENT_REVIEWS: true,          // Prefer locations with recent reviews
    RECENCY_BONUS_DAYS: 30,               // Days to apply recency bonus
  },

  COMMUNITY: {
    FEED_RADIUS_METERS: 50000,            // 50km radius for community feed
    REVIEWS_PER_PAGE: 5,                  // Pagination size for reviews
    TRENDING_TIMEFRAME_DAYS: 7,           // Days to consider for trending locations
    TRENDING_MIN_REVIEWS: 5,              // Minimum reviews to be considered trending
    LOCATIONS_ALERT: {
      CHECK_INTERVAL_MS: 30000,              // Check every 30 seconds
      NOTIFICATION_RADIUS_METERS: 200,       // Notify within 200m
      MIN_RATING_THRESHOLD: 4.0,             // Only notify for ≥4.0★
      RATE_LIMIT_HOURS: 12,
    }
  },

  PROFILE_COMPLETION: {
    // Mandatory fields for onboarding (3 required)
    MANDATORY_FIELDS: ['race_ethnicity', 'gender', 'lgbtq_status'],
    // Feature-specific requirements
    FEATURE_REQUIREMENTS: {
      SIMILARITY: ['race_ethnicity', 'gender'],
      RECOMMENDATIONS: ['race_ethnicity', 'gender'],
      SAFE_ROUTING: ['race_ethnicity', 'gender', 'lgbtq_status', 'religion', 'disability_status', 'age_range'],
    },
    // Allow "Prefer not to say" option
    ALLOW_PREFER_NOT_TO_SAY: true,
    ALL_DEMOGRAPHIC_FIELDS: [
      'race_ethnicity',
      'gender',
      'lgbtq_status',
      'religion',
      'disability_status',
      'age_range',
    ] as const,
    // Banner behavior
    BANNERS: {
      COOLDOWN_HOURS: 24,              // Hours after "Maybe Later" before showing again
      MAX_SHOWS_PER_FEATURE: 3,        // Max times to show banner per feature
      SHOW_ON_FIRST_USE: true,         // Show immediately on first feature use
      PERSIST_DISMISSALS: true,        // Save to AsyncStorage
      BANNER_TYPES: {
        // Must be all caps!
        INCOMPLETE_PROFILE_GENERAL: 'INCOMPLETE_PROFILE_GENERAL',
        RECOMMENDATIONS_INCOMPLETE: 'RECOMMENDATIONS_INCOMPLETE',
        ROUTING_INCOMPLETE: 'ROUTING_INCOMPLETE',
        SIMILARITY_FAILED: 'SIMILARITY_FAILED',
      }
    },
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

  ROUTE_PLANNING: {
    // Route Segmentation
    SEGMENT_LENGTH_METERS: 1000,                    // Divide routes into 1km segments for safety scoring
    SCORING_RADIUS_METERS: 500,                     // Radius around each segment to find nearby locations
    MAX_NEARBY_LOCATIONS: 20,                       // Maximum locations to consider per segment

    // Route Generation
    MAX_ALTERNATIVE_ROUTES: 5,                      // Maximum alternative routes to generate
    MAX_DETOUR_MULTIPLIER: 1.5,                     // Max detour: 1.5x fastest route time

    // Route Safety Thresholds
    SAFE_ROUTE_THRESHOLD: 4.0,                      // Overall route score >= 4.0 considered safe
    MIXED_ROUTE_THRESHOLD: 3.0,                     // Overall route score >= 3.0 considered mixed
    UNSAFE_ROUTE_THRESHOLD: 2.0,                    // Overall route score < 2.0 considered unsafe

    // Danger Zone Penalties for Route Scoring
    DANGER_ZONE_PENALTIES: {
      HIGH_DANGER: 2.0,                             // Heavy penalty for high danger zones
      MEDIUM_DANGER: 1.0,                           // Medium penalty
      LOW_DANGER: 0.5,                              // Light penalty
    },

    // Time-Based Safety Adjustments
    TIME_BASED_PENALTIES: {
      EVENING_MULTIPLIER: 1.2,                      // 20% higher danger in evening
      NIGHT_MULTIPLIER: 1.5,                        // 50% higher danger at night
      EVENING_START_HOUR: 18,                       // 6 PM
      NIGHT_START_HOUR: 22,                         // 10 PM
    },

    // Route Recommendations
    MIN_CONFIDENCE_FOR_RECOMMENDATIONS: 0.6,        // Minimum confidence to make route suggestions
    MAX_UNSAFE_SEGMENT_PERCENTAGE: 30,              // Max % of unsafe segments before recommending alternative

    // Performance & Caching
    ROUTE_CACHE_TTL_MINUTES: 15,                     // Cache route calculations for 15 minutes
    MAX_CONCURRENT_ROUTE_REQUESTS: 3,                // Limit concurrent external API requests
    REQUEST_TIMEOUT_MS: 10000,                       // 10 second timeout for route requests
    // Route Confidence Thresholds
    LOW_CONFIDENCE_THRESHOLD: 0.6,        // Show warning banner when confidence < 0.6
    FALLBACK_CONFIDENCE: 0.3,             // Default confidence when no data available
    MIN_CONFIDENCE_BASELINE: 0.15,      // Minimum confidence floor
    DAILY_SEARCH_LIMIT: 10,                     // Free tier daily search limit
  },

  // Route Display & UI Configuration
  ROUTE_DISPLAY: {
    // Route Line Colors
    COLORS: {
      SAFE_ROUTE: '#4CAF50',                         // Green for safe routes
      MIXED_ROUTE: '#FFC107',                        // Yellow for mixed safety routes  
      UNSAFE_ROUTE: '#F44336',                       // Red for unsafe routes
      SELECTED_ROUTE: '#2A5C99',                     // Purple for selected route
      ALTERNATIVE_ROUTE: '#757575',                  // Gray for alternative routes
    },

    // Route Line Styling
    LINE_WIDTH: {
      SELECTED: 8,                                   // Width of selected route line
      ALTERNATIVE: 7,                                // Width of alternative route lines
      SEGMENT_HIGHLIGHT: 10,                          // Width when highlighting specific segment
    },

    // Route Markers
    MARKERS: {
      START_COLOR: '#2E7D32',                        // Start point marker color
      END_COLOR: '#C62828',                          // End point marker color
      WAYPOINT_COLOR: '#1976D2',                     // Waypoint marker color
      DANGER_WARNING_COLOR: '#FF5722',               // Danger zone warning marker color
    },

    // Animation & Interaction
    ANIMATION_DURATION_MS: 300,                      // Route selection animation duration
    SEGMENT_HOVER_DELAY_MS: 200,                     // Delay before showing segment details on hover
  },

  // Navigation Configuration
  NAVIGATION: {
    // Real-time Navigation
    LOCATION_UPDATE_INTERVAL_MS: 1000,               // GPS location update frequency
    ROUTE_RECALCULATION_THRESHOLD_METERS: 100,      // Distance off-route before recalculating
    AHEAD_WARNING_DISTANCE_METERS: 2000,            // Distance to warn about upcoming dangers (2km)
    OVERALL_ROUTE_SCORE: 3.0,

    // Safety Alerts
    SAFETY_ALERTS: {
      DANGER_ZONE_WARNING_DISTANCE: 1000,           // Warn 1km before entering danger zone
      LOW_SAFETY_AREA_WARNING_DISTANCE: 500,        // Warn 500m before low safety area
      ALTERNATIVE_ROUTE_SUGGESTION_THRESHOLD: 2.5,   // Suggest alternatives when route score < 2.5
    },

    // Voice Navigation
    VOICE_INSTRUCTIONS: {
      ENABLED_BY_DEFAULT: true,                      // Enable voice instructions by default
      INCLUDE_SAFETY_WARNINGS: true,                 // Include safety context in voice instructions
      LANGUAGE: 'en',                                // Default voice instruction language
    },
  },

  // External API Rate Limiting
  API_RATE_LIMITS: {
    MAPBOX_DIRECTIONS_PER_HOUR: 2000,                // Conservative rate limit for Mapbox Directions API
    MAPBOX_DIRECTIONS_PER_MINUTE: 60,                // Per-minute rate limit
    SAFETY_SCORER_PER_HOUR: 1000,                    // Rate limit for our safety scoring function
    DANGER_ZONES_PER_HOUR: 2000,                     // Rate limit for danger zone lookups
  },

  // Development & Testing
  DEVELOPMENT: {
    ENABLE_ROUTE_DEBUG_LOGS: true,                   // Enable detailed route calculation logging
    MOCK_EXTERNAL_APIs: false,                       // Use mock data instead of external APIs (testing)
    BYPASS_RATE_LIMITS: false,                       // Bypass rate limits in development
    SHOW_SEGMENT_BOUNDARIES: false,                  // Visualize route segments on map (debug)
  },
  DEBUG: {
    // List of emails that can access the debug screen
    AUTHORIZED_EMAILS: [
      'daniel@danielg.online',  // Replace with your email
      '',  // Add your business partner's email
    ] as string[],
  },

} as const;

// Type-safe access to config values
export type AppConfig = typeof APP_CONFIG;