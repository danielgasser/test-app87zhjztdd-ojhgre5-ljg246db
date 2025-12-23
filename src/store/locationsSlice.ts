import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { supabase } from "../services/supabase";
import { Database } from "../types/database.types";

import {
  LocationWithScores,
  CreateReviewForm,
  CreateLocationForm,
  Coordinates,
  DangerZone,
  DangerZonesResponse,
  SafetyInsight
} from "../types/supabase";
import { mapMapboxPlaceType } from "../utils/placeTypeMappers";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { APP_CONFIG } from "@/config/appConfig";
import { ReactNode } from "react";
import { RootState } from ".";
import { checkProfileCompleteness } from "@/utils/profileValidation";
import { shouldShowBanner, incrementShowCount, BannerType } from "./profileBannerSlice";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";

type Review = Database["public"]["Tables"]["reviews"]["Row"];

// Helper function to get the current auth token
async function getAuthToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error("User not authenticated");
  }
  return session.access_token;
}
// NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API
interface SearchLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  source?: "database" | "mapbox";
}

interface NearbyReviewResponse {
  id: string;
  user_id: string;
  location_id: string;
  title: string;
  content: string;
  safety_rating: number;
  overall_rating: number;
  created_at: string;
  location_name: string;
  location_address: string;
  location_latitude: number;
  location_longitude: number;
  distance_meters: number;
  user_full_name: string;
  user_show_demographics: boolean;
  user_race_ethnicity: string[];
  user_gender: string;
  user_lgbtq_status: boolean;
  user_disability_status: string[];
}

interface CommunityReview {
  id: string;
  user_id: string;
  location_id: string;
  location_name: string;
  location_address: string;
  location_latitude: number;
  location_longitude: number;
  safety_rating: number;
  overall_rating: number;
  comment: string;
  created_at: string;
  user_demographics: {
    full_name: string;
    race_ethnicity: string[];
    show_demographics: boolean;
    gender: string;
    lgbtq_status: string;
  };
}


interface RouteSegment {
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  safety_score: number;
  distance_meters: number;
  duration_seconds: number;
}

interface RouteSafetyAnalysis {
  confidence_score: ReactNode;
  overall_route_score: number;
  overall_confidence?: number;
  segment_scores?: RouteSegment[];
  danger_zones_intersected?: number;
  high_risk_segments?: number;
  total_segments?: number;
  safety_summary?: {
    safe_segments: number;
    mixed_segments: number;
    unsafe_segments: number;
  };
  safety_notes: string[];
  analysis_timestamp?: string;
  route_summary?: string;
  confidence?: number;
  risk_factors?: string[];
}

export interface MLPrediction {
  predicted_safety_score: number;
  confidence: number;
  similar_users_count: number;
  based_on_locations: number;
  risk_factors: string[];
  primary_source?: 'community_reviews' | 'ml_prediction' | 'statistics';
  based_on?: {
    reviewsFromMatchingDemo: number;
    hasMLPrediction: boolean;
    hasStatisticalData: boolean;
  };
  vote_validation?: {
    total_votes: number;
    accurate_votes: number;
    inaccurate_votes: number;
    accuracy_rate: number;
  } | null;
}

// Route Planning Types
export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteRequest {
  origin: RouteCoordinate;
  destination: RouteCoordinate;
  heading?: number;
  user_demographics: {
    race_ethnicity: string;
    gender: string;
    lgbtq_status: string;
    religion: string;
    disability_status: string;
    age_range: string;
  };
  route_preferences: {
    prioritize_safety: boolean;
    avoid_evening_danger: boolean;
    max_detour_minutes: number;
    required_waypoint_types?: string[];
  };
}
export interface NavigationStep {
  instruction: string;
  distance_meters: number;
  duration_seconds: number;
  start_location: RouteCoordinate;
  end_location: RouteCoordinate;
  maneuver?: string; // e.g., "turn-left", "turn-right"
}

// Safety alert tracking for routes
export interface SafetyAlertHandled {
  review_id: string;
  handled_at: string;
  action: 'reroute_attempted' | 'user_continued';
  review_location: {
    lat: number;
    lng: number;
  };
  review_safety_rating: number;
}

// NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API
export interface SafeRoute {
  id: string;
  name: string;
  route_type: "fastest" | "safest" | "balanced";
  coordinates: RouteCoordinate[];
  route_points?: RouteCoordinate[];
  steps?: NavigationStep[];
  estimated_duration_minutes: number;
  distance_kilometers: number;
  safety_analysis: RouteSafetyAnalysis;
  created_at: string;
  databaseId?: string;
  navigationSessionId?: string;
  safetyAlertsHandled?: SafetyAlertHandled[];
  mapbox_data?: {
    duration: number;
    distance: number;
    geometry: any;
    steps?: any[];
  };
  waypoints_added?: any; // NEW: track why route was modified
}

export interface DemographicScore {
  id: string;
  location_id: string;
  demographic_type: string;
  demographic_value: string | null;
  avg_safety_score: number | null;
  avg_comfort_score: number | null;
  avg_overall_score: number | null;
  review_count: number | null;
  last_review_date: string | null;
  calculated_at: string | null;
  accurate_count?: number | null;
  inaccurate_count?: number | null;
}
// ================================
// STATE INTERFACE
// ================================

interface LocationsState {
  locations: LocationWithScores[];
  selectedLocation: LocationWithScores | null;
  nearbyLocations: LocationWithScores[];
  userReviews: Review[];
  loading: boolean;
  error: string | null;
  filters: {
    placeType: string | null;
    minSafetyScore: number | null;
    radius: number;
  };
  searchResults: SearchLocation[];
  searchLoading: boolean;
  showSearchResults: boolean;
  userLocation: { latitude: number; longitude: number } | null;
  userCountry: string | null;
  mapCenter: { latitude: number; longitude: number } | null;
  communityFeedMode: "near_me" | "map_area";
  communityReviews: CommunityReview[];
  communityLoading: boolean;
  trendingLocations: any[];
  trendingLoading: boolean;
  safetyInsights: SafetyInsight[],
  safetyInsightsLoading: boolean,
  dangerZones: DangerZone[];
  dangerZonesVisible: boolean;
  dangerZonesLoading: boolean;
  similarUsers: Array<{
    user_id: string;
    similarity_score: number;
    shared_demographics: string[];
  }>;
  similarUsersLoading: boolean;
  mlPredictions: { [locationId: string]: MLPrediction };
  mlPredictionsLoading: { [locationId: string]: boolean };
  routes: SafeRoute[];
  selectedRoute: SafeRoute | null;
  routeRequest: RouteRequest | null;
  routeLoading: boolean;
  routeError: string | null;
  routeSafetyAnalysis: RouteSafetyAnalysis | null;
  routeAlternatives: SafeRoute[];

  // Route Display State
  showRouteSegments: boolean;
  selectedSegment: RouteSegment | null;
  routePreferences: {
    avoidEveningDanger: boolean;
    maxDetourMinutes: number;
  };
  routeImprovementSummary?: {
    original_safety_score: number;
    optimized_safety_score: number;
    safety_improvement: number;
    time_added_minutes: number;
    distance_added_km: number;
    danger_zones_avoided: number;
  };
  smartRouteComparison: SmartRouteComparison | null;
  showSmartRouteComparison: boolean;
  navigationIntent: {
    targetTab: "map" | "community" | "profile";
    locationId?: string;
    action: "view_location" | "center_map" | "show_reviews";
    data?: any; // For future flexibility
  } | null;
  navigationActive: boolean;
  currentNavigationStep: number | null;
  navigationStartTime: string | null;
  navigationSessionId: string | null;
  isRerouting: boolean;
  routeHistory: RouteHistoryItem[];
  routeHistoryLoading: boolean;
  routeHistoryPage: number;
  routeHistoryHasMore: boolean;
  navigationPosition: { latitude: number; longitude: number; heading?: number } | null;
  demographicScores: { [locationId: string]: DemographicScore[] };
  demographicScoresLoading: { [locationId: string]: boolean };
}
export interface RouteImprovementSummary {
  original_safety_score: number;
  optimized_safety_score: number;
  safety_improvement: number;
  time_added_minutes: number;
  distance_added_km: number;
  danger_zones_avoided: number;
}

export interface SafeWaypoint {
  coordinate: RouteCoordinate;
  reason: string;
  safety_score: number;
}

export interface SmartRouteComparison {
  original_route: SafeRoute;
  optimized_route: SafeRoute;
  improvement_summary: RouteImprovementSummary;
  waypoints_added: SafeWaypoint[];
  message: string;
}
export interface RouteHistoryItem {
  id: string;
  user_id: string;
  origin_name: string;
  destination_name: string;
  distance_km: number;
  duration_minutes: number;
  safety_score: number | null;
  navigation_started_at: string | null;
  navigation_ended_at: string | null;
  navigation_session_id: string | null;
  created_at: string;
  updated_at: string;
  route_coordinates: RouteCoordinate[];
  steps: NavigationStep[] | null;
  safety_alerts_handled: SafetyAlertHandled[] | null;
}
// ================================
// INITIAL STATE
// ================================

const initialState: LocationsState = {
  locations: [],
  selectedLocation: null,
  nearbyLocations: [],
  userReviews: [],
  loading: false,
  error: null,
  filters: {
    placeType: null,
    minSafetyScore: null,
    radius: 10000,
  },
  searchResults: [],
  searchLoading: false,
  showSearchResults: false,
  userLocation: null,
  userCountry: null,
  mapCenter: null,
  communityFeedMode: "near_me",
  communityReviews: [],
  communityLoading: false,
  trendingLocations: [],
  trendingLoading: false,
  safetyInsights: [] as SafetyInsight[],
  safetyInsightsLoading: false,
  dangerZones: [],
  dangerZonesVisible: false,
  dangerZonesLoading: false,
  similarUsers: [],
  similarUsersLoading: false,
  mlPredictions: {},
  mlPredictionsLoading: {},
  routes: [],
  selectedRoute: null,
  routeRequest: null,
  routeLoading: false,
  routeError: null,
  routeSafetyAnalysis: null,
  routeAlternatives: [],
  showRouteSegments: false,
  selectedSegment: null,
  routePreferences: {
    avoidEveningDanger: true,
    maxDetourMinutes: 3600,
  },
  smartRouteComparison: null,
  showSmartRouteComparison: false,
  navigationIntent: null,
  navigationActive: false,
  currentNavigationStep: null,
  navigationStartTime: null,
  navigationSessionId: null,
  isRerouting: false,
  routeHistory: [],
  routeHistoryLoading: false,
  routeHistoryPage: 0,
  routeHistoryHasMore: true,
  navigationPosition: null,
  demographicScores: {},
  demographicScoresLoading: {},
};


export const fetchNearbyLocations = createAsyncThunk(
  "locations/fetchNearby",
  async ({ latitude, longitude, radius }: Coordinates & { radius?: number }, { getState }) => {
    // Get user's preferred radius if not explicitly provided
    const state = getState() as any;
    const userRadiusKm = state.user.searchRadiusKm || (APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS / 1000);
    const radiusMeters = radius !== undefined ? radius : (userRadiusKm * 1000);    // Get user profile from Redux state
    const userProfile = state.user.profile;

    // Use demographic-aware function if user has profile, otherwise fallback
    if (userProfile && userProfile.race_ethnicity) {

      const { data, error } = await (supabase.rpc as any)("get_nearby_locations_for_user", {
        lat: latitude,
        lng: longitude,
        user_race_ethnicity: userProfile.race_ethnicity,
        user_gender: userProfile.gender,
        user_lgbtq_status: userProfile.lgbtq_status,
        radius_meters: radiusMeters,
      });

      if (error) throw error;
      return data || [];
    } else {
      // Fallback to standard function if no profile

      const { data, error } = await (supabase.rpc as any)("get_nearby_locations", {
        lat: latitude,
        lng: longitude,
        radius_meters: radiusMeters,
      });

      if (error) throw error;
      return data || [];
    }

  }
);

export const fetchLocationDetails = createAsyncThunk(
  "locations/fetchLocationDetails",
  async (locationId: string) => {
    const { data, error } = await (supabase.rpc as any)("get_location_with_coords", {
      location_id: locationId,
    });

    if (error) {
      logger.error("Error fetching location details:", error);
      throw error;
    }

    return Array.isArray(data) && data.length > 0 ? data[0] : data;
  }
);

export const fetchSafetyInsights = createAsyncThunk(
  "locations/fetchSafetyInsights",
  async ({
    latitude,
    longitude,
    radius = APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS,
    maxResults = 5
  }: {
    latitude?: number;
    longitude?: number;
    radius?: number;
    maxResults?: number;
  } = {}) => {
    try {
      const { data, error } = await (supabase.rpc as any)("get_safety_insights", {
        user_lat: latitude || null,
        user_lng: longitude || null,
        radius_meters: radius,
        max_results: maxResults,
      });

      if (error) {
        logger.error("Error fetching safety insights:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error("Safety insights fetch error:", error);
      throw error;
    }
  }
);

export const createLocation = createAsyncThunk(
  "locations/createLocation",
  async (locationData: CreateLocationForm) => {
    const transformedData = {
      ...locationData,
      coordinates: `POINT(${locationData.longitude} ${locationData.latitude})`
    };
    // Remove latitude/longitude fields
    const { latitude, longitude, ...dbData } = transformedData;
    const { data, error } = await supabase.from("locations").insert(dbData).select().single();

    if (error) {
      logger.error("Error creating location:", error);
      throw error;
    }

    return data;
  }
);

// ================================
// SAVE ROUTE TO DATABASE
// ================================

export const saveRouteToDatabase = createAsyncThunk(
  "locations/saveRouteToDatabase",
  async (route: {
    route_coordinates: RouteCoordinate[];
    steps?: NavigationStep[];
    origin_name: string;
    destination_name: string;
    distance_km: number;
    duration_minutes: number;
    safety_score: number;
    navigation_session_id?: string;
  }, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("routes")
        .insert({
          user_id: user.id,
          route_coordinates: route.route_coordinates as any,
          steps: route.steps ? (route.steps as any) : null,
          origin_name: route.origin_name,
          destination_name: route.destination_name,
          distance_km: route.distance_km,
          duration_minutes: route.duration_minutes,
          safety_score: route.safety_score,
          navigation_session_id: route.navigation_session_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to save route");
    }
  }
);

export const checkForActiveNavigation = createAsyncThunk(
  "locations/checkForActiveNavigation",
  async (_, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return null;

      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("user_id", user.id)
        .not("navigation_started_at", "is", null)
        .is("navigation_ended_at", null)
        .order("navigation_started_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 = no rows
        throw error;
      }

      return data || null;
    } catch (error) {
      logger.error("checkForActiveNavigation error:", error);
      return rejectWithValue(error instanceof Error ? error.message : "Failed to check active navigation");
    }
  }
);

// ================================
// HELPER: Convert DB Route to SafeRoute
// ================================

function dbRouteToSafeRoute(dbRoute: any): SafeRoute {
  return {
    id: `db_route_${dbRoute.id}`,
    name: `${dbRoute.origin_name} → ${dbRoute.destination_name}`,
    route_type: "balanced",
    coordinates: dbRoute.route_coordinates as RouteCoordinate[],
    route_points: dbRoute.route_coordinates as RouteCoordinate[],
    steps: dbRoute.steps as NavigationStep[] || undefined,
    estimated_duration_minutes: dbRoute.duration_minutes,
    distance_kilometers: dbRoute.distance_km,
    safety_analysis: {
      confidence_score: null,
      overall_route_score: dbRoute.safety_score || 3.0,
      overall_confidence: 0.5,
      safety_notes: ["Route restored from previous session"],
    },
    created_at: dbRoute.created_at,
    databaseId: dbRoute.id,
  };
}

function dbRowToRouteHistoryItem(row: any): RouteHistoryItem {
  return {
    id: row.id,
    user_id: row.user_id,
    origin_name: row.origin_name,
    destination_name: row.destination_name,
    distance_km: row.distance_km,
    duration_minutes: row.duration_minutes,
    safety_score: row.safety_score,
    navigation_started_at: row.navigation_started_at,
    navigation_ended_at: row.navigation_ended_at,
    navigation_session_id: row.navigation_session_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    route_coordinates: row.route_coordinates as RouteCoordinate[],
    steps: row.steps as NavigationStep[] | null,
    safety_alerts_handled: row.safety_alerts_handled as SafetyAlertHandled[] | null,
  };
}
// ================================
// NAVIGATION SESSION TRACKING
// ================================

export const startNavigationSession = createAsyncThunk(
  "locations/startNavigationSession",
  async (routeId: string, { rejectWithValue }) => {

    try {
      const timestamp = new Date().toISOString();
      const { data, error } = await supabase
        .from("routes")
        .update({
          navigation_started_at: new Date().toISOString(),
        })
        .eq("id", routeId)
        .select()
        .single();

      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error("No data returned");
      }
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to start navigation session");
    }
  }
);

export const endNavigationSession = createAsyncThunk(
  "locations/endNavigationSession",
  async (routeId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from("routes")
        .update({
          navigation_ended_at: new Date().toISOString(),
        })
        .eq("id", routeId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to end navigation session");
    }
  }
);

export const submitReview = createAsyncThunk(
  "locations/submitReview",
  async (reviewData: CreateReviewForm, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { time_of_day, ...dbReviewData } = reviewData;

      // Check network connectivity
      const NetInfo = (await import('@react-native-community/netinfo')).default;
      const netInfo = await NetInfo.fetch();

      if (!netInfo.isConnected) {
        // Queue for later
        const { offlineQueue } = await import('../services/offlineQueue');
        await offlineQueue.add(dbReviewData, user.id);
        return { queued: true, message: 'Review saved - will sync when online' };
      }

      // Try to submit
      const { data, error } = await supabase
        .from("reviews")
        .insert({ ...dbReviewData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      // If submission failed, queue it
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { offlineQueue } = await import('../services/offlineQueue');
        const { time_of_day, ...dbReviewData } = reviewData;
        await offlineQueue.add(dbReviewData, user.id);
        return { queued: true, message: 'Review saved - will sync when online' };
      }
      return rejectWithValue(error instanceof Error ? error.message : "Failed to submit review");
    }
  }
);

export const updateReview = createAsyncThunk(
  "locations/updateReview",
  async ({ id, ...updateData }: { id: string } & Partial<CreateReviewForm>, { rejectWithValue }) => {
    try {
      // Fetch review to check created_at
      const { data: review, error: fetchError } = await supabase
        .from("reviews")
        .select("created_at")
        .eq("id", id)
        .single();

      if (fetchError || !review) throw new Error("Review not found");
      if (!review.created_at) throw new Error("Invalid review timestamp");

      // Check 24-hour window
      const hoursSinceCreation = (Date.now() - new Date(review.created_at).getTime()) / (1000 * 60 * 60);

      if (hoursSinceCreation > APP_CONFIG.BUSINESS_RULES.REVIEW_EDIT_TIMEFRAME) {
        return rejectWithValue("Reviews can only be edited within 24 hours of creation.");
      }

      // Proceed with update
      const { data, error } = await supabase
        .from("reviews")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to update review");
    }
  }
);

export const fetchUserReviews = createAsyncThunk(
  "locations/fetchUserReviews",
  async (userId: string) => {
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        locations (
          id,
          name,
          address,
          latitude,
          longitude
        )
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching user reviews:", error);
      throw error;
    }

    return data || [];
  }
);

export const searchLocations = createAsyncThunk(
  "locations/searchLocations",
  async ({ query, latitude, longitude }: { query: string; latitude?: number; longitude?: number }, { getState }) => {
    if (query.trim().length < 2) {
      return [];
    }

    try {
      const { data: dbResults, error: dbError } = await (supabase.rpc as any)("search_locations_with_coords", {
        search_query: query,
        result_limit: 5
      });

      if (dbError) {
        logger.error("Database search error:", dbError);
      }

      const searchResults: SearchLocation[] = (dbResults || []).map((location: any) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        place_type: location.place_type,
        source: "database" as const,
      }));

      return searchResults;
    } catch (error) {
      logger.error("Search error:", error);
      throw error;
    }
  }
);

export const createLocationFromSearch = createAsyncThunk(
  "locations/createLocationFromSearch",
  async ({ searchLocation, userId }: { searchLocation: SearchLocation; userId: string }) => {
    if (searchLocation.source === "database") {
      return searchLocation.id;
    }

    // ✅ FIXED: Use the complete address data from searchLocation
    // If the marker was created from long-press, it will have city/state/country
    // If from search, we need to reverse geocode
    let city = (searchLocation as any).city;
    let state_province = (searchLocation as any).state_province;
    let country = (searchLocation as any).country;
    let postal_code = (searchLocation as any).postal_code;

    // If we don't have the address components, reverse geocode to get them
    if (!city || !state_province || !country) {
      const { getCompleteAddressFromCoordinates } = await import('@/utils/locationHelpers');
      const addressData = await getCompleteAddressFromCoordinates(
        searchLocation.latitude,
        searchLocation.longitude
      );

      if (addressData) {
        city = addressData.city;
        state_province = addressData.state_province;
        country = addressData.country;
        postal_code = addressData.postal_code;
      } else {
        // Fallback if geocoding fails
        city = 'Unknown';
        state_province = 'Unknown';
        country = 'US';
        postal_code = null;
      }
    }

    const mappedPlaceType = mapMapboxPlaceType(searchLocation.place_type || "poi");

    const locationData = {
      name: searchLocation.name,
      address: searchLocation.address,  // ✅ Use actual address
      city: city,                       // ✅ Real city
      state_province: state_province,   // ✅ Real state
      country: country,                 // ✅ Real country
      postal_code: postal_code,         // ✅ Real postal code
      coordinates: `POINT(${searchLocation.longitude} ${searchLocation.latitude})`,
      place_type: mappedPlaceType,
      tags: null,
      google_place_id: searchLocation.id.startsWith("google_") ? searchLocation.id.replace("google_", "") : null,
      created_by: userId,
      verified: false,
      active: true,
    };

    const { data, error } = await supabase
      .from("locations")
      .insert(locationData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data.id;
  }
);

export const loadCommunityFeedMode = createAsyncThunk(
  "locations/loadCommunityFeedMode",
  async () => {
    try {
      const savedMode = await AsyncStorage.getItem("communityFeedMode");
      return savedMode === "map_area" ? "map_area" : "near_me";
    } catch (error) {
      logger.error("Error loading community feed mode:", error);
      return "near_me"; // Default fallback
    }
  }
);

export const saveCommunityFeedMode = createAsyncThunk(
  "locations/saveCommunityFeedMode",
  async (mode: "near_me" | "map_area") => {
    try {
      await AsyncStorage.setItem("communityFeedMode", mode);
      return mode;
    } catch (error) {
      logger.error("Error saving community feed mode:", error);
      return mode;
    }
  }
);

export const fetchRecentReviews = createAsyncThunk(
  "locations/fetchRecentReviews",
  async ({
    limit = 10,
    latitude,
    longitude,
    radius = APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS
  }: {
    limit?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
  } = {}) => {
    try {
      // Only fetch reviews if location is provided
      if (latitude === undefined || longitude === undefined) {
        return []; // Return empty array instead of fetching all reviews
      }

      const { data, error } = await supabase.rpc("get_nearby_reviews", {
        lat: latitude,
        lng: longitude,
        radius_meters: radius,
        review_limit: limit
      });
      if (error) {
        logger.error("Error fetching nearby reviews:", error);
        throw error;
      }

      return (data || []).map(review => ({
        id: review.id,
        user_id: review.user_id,
        location_id: review.location_id,
        location_name: review.location_name,
        location_address: review.location_address,
        location_latitude: review.location_latitude,
        location_longitude: review.location_longitude,
        safety_rating: review.safety_rating,
        overall_rating: review.overall_rating,
        comment: review.content,
        created_at: review.created_at,
        helpful_count: review.helpful_count || 0,
        unhelpful_count: review.unhelpful_count || 0,
        user_demographics: {
          full_name: review.user_full_name,
          show_demographics: review.user_show_demographics,
          race_ethnicity: review.user_race_ethnicity,
          gender: review.user_gender,
          lgbtq_status: review.user_lgbtq_status,
          disability_status: review.user_disability_status,
        },
      }));
    } catch (error) {
      logger.error("Recent reviews fetch error:", error);
      throw error;
    }
  }
);

export const fetchTrendingLocations = createAsyncThunk(
  "locations/fetchTrendingLocations",
  async ({ daysWindow = APP_CONFIG.COMMUNITY.TRENDING_TIMEFRAME_DAYS, maxResults = APP_CONFIG.COMMUNITY.REVIEWS_PER_PAGE }: { daysWindow?: number; maxResults?: number } = {}) => {
    try {
      const { data, error } = await (supabase.rpc as any)("get_trending_locations", {
        days_window: daysWindow,
        max_results: maxResults,
      });

      if (error) {
        const errorMessage = `error message: ${error.message}, error code: ${error.code}, error details: ${error.details}`;
        logger.error("Error fetching trending locations:", errorMessage);

        //logger.error("Error fetching trending locations:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error("Trending locations fetch error:", error);
      throw error;
    }
  }
);
export const fetchDangerZones = createAsyncThunk(
  "locations/fetchDangerZones",
  async ({
    userId,
    latitude,
    longitude,
    radius = 10000,
    userDemographics
  }: {
    userId: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    userDemographics?: any;
  }) => {
    try {
      const token = await getAuthToken();

      const fetchBody = {
        user_id: userId,
        latitude: latitude,
        longitude: longitude,
        radius_miles: radius / 1609.34,
        user_demographics: userDemographics
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 10000); // 10s timeout

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/danger-zones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(fetchBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("🛡️ Danger zones API error:", errorText);
        return [];
      }

      const data: DangerZonesResponse = await response.json();
      return data.danger_zones || [];
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return [];
      }
      throw fetchError;
    }
  }
);

export const fetchSimilarUsers = createAsyncThunk(
  "locations/fetchSimilarUsers",
  async (userId: string, { getState, dispatch }) => {
    try {
      const state = getState() as any;
      const userProfile = state.user.profile;

      // Check if profile meets SIMILARITY requirements
      const validation = checkProfileCompleteness(userProfile, "SIMILARITY");

      // Show banner if profile incomplete AND banner should be shown

      const bannerType = "SIMILARITY_FAILED" as BannerType;
      if (!validation.canUseFeature && shouldShowBanner(state.profileBanner, bannerType)) {
        // Increment show count
        dispatch(incrementShowCount(bannerType));
      }

      // Still make the API call (graceful degradation)
      const token = await getAuthToken();

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/similarity-calculator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        logger.error("Similar users API error:", response.status);
        return [];
      }

      const data = await response.json();
      return data.similar_users || [];
    } catch (error) {
      logger.error("Error fetching similar users:", error);
      return [];
    }
  }
);

export const fetchMLPredictions = createAsyncThunk(
  "locations/fetchMLPredictions",
  async (
    payload: string | { locationId: string; latitude?: number; longitude?: number },
    { getState }
  ) => {
    // Handle both old string format and new object format
    const locationId = typeof payload === 'string' ? payload : payload.locationId;
    const latitude = typeof payload === 'object' ? payload.latitude : undefined;
    const longitude = typeof payload === 'object' ? payload.longitude : undefined;
    try {
      const state = getState() as any;
      const userProfile = state.user.profile;

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId || !userProfile) {
        throw new Error("User not authenticated or profile not loaded");
      }
      const token = await getAuthToken();

      const requestBody: any = {
        user_id: userId,
        user_demographics: {
          race_ethnicity: userProfile.race_ethnicity,
          gender: userProfile.gender,
          lgbtq_status: userProfile.lgbtq_status,
          disability_status: userProfile.disability_status,
          religion: userProfile.religion,
          age_range: userProfile.age_range,
        }
      };

      if (latitude !== undefined && longitude !== undefined) {
        requestBody.latitude = latitude;
        requestBody.longitude = longitude;
        requestBody.place_type = 'temporary_location';
        requestBody.google_place_id = locationId;
      } else {
        requestBody.location_id = locationId;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/safety-predictor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ML API failed with status: ${response.status} - ${errorText}`);
      }

      const prediction = await response.json();

      return {
        locationId,
        prediction
      };
    } catch (error) {
      logger.error("🤖 fetchMLPredictions error:", error);
      throw error;
    }
  }
);

// ================================
// ROUTE PLANNING ASYNC THUNKS
// ================================

export const calculateRouteSafety = createAsyncThunk(
  "locations/calculateRouteSafety",
  async (payload: {
    route_coordinates: RouteCoordinate[];
    user_demographics: any;
    waypoints?: RouteCoordinate[];
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke("route-safety-scorer", {
        body: payload
      });

      if (error) {
        logger.warn("❌ Route safety scorer failed, using fallback method:", error);
        throw error;
      }

      return data as RouteSafetyAnalysis;
    } catch (error) {
      // Fallback to simplified safety analysis

      const coordinates = payload.route_coordinates;
      const samplePoints = coordinates.filter((_, index) =>
        index % Math.max(1, Math.floor(coordinates.length / 5)) === 0
      );

      let totalSafety = 0;
      let validPoints = 0;
      let highRiskSegments = 0;
      const safetyNotes: string[] = [];

      // Sample a few points for basic safety analysis
      for (const point of samplePoints) {
        try {
          const token = await getAuthToken();

          const safetyResponse = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/safety-predictor`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              latitude: point.latitude,
              longitude: point.longitude,
              user_demographics: payload.user_demographics,
              place_type: "route_point"
            })
          });

          let pointSafety = 3.0;
          if (safetyResponse.ok) {
            const safetyData = await safetyResponse.json();
            pointSafety = safetyData.predicted_safety || 3.0;

            if (pointSafety < 2.5) {
              highRiskSegments++;
            }
          }

          totalSafety += pointSafety;
          validPoints++;
        } catch (pointError) {
          logger.error("Error analyzing point:", pointError);
          totalSafety += 3.0;
          validPoints++;
        }
      }

      const overallScore = validPoints > 0 ? totalSafety / validPoints : 3.0;

      if (overallScore >= 4.0) {
        safetyNotes.push("This route is generally considered safe");
      } else if (overallScore >= 3.0) {
        safetyNotes.push("This route has mixed safety characteristics");
      } else {
        safetyNotes.push("This route may have safety concerns");
      }

      if (highRiskSegments > 0) {
        safetyNotes.push(`${highRiskSegments} area(s) require extra caution`);
      }

      return {
        overall_route_score: Math.round(overallScore * 10) / 10,
        safety_notes: safetyNotes.slice(0, 3),
        confidence: Math.min(0.9, validPoints * 0.15),
        analysis_timestamp: new Date().toISOString(),
        confidence_score: null, // fallback value, adjust as needed
        overall_confidence: Math.min(0.9, validPoints * 0.15),
        segment_scores: [],
        danger_zones_intersected: 0,
        high_risk_segments: highRiskSegments,
        total_segments: validPoints,
        safety_summary: {
          safe_segments: overallScore >= 4.0 ? validPoints : 0,
          mixed_segments: overallScore >= 3.0 && overallScore < 4.0 ? validPoints : 0,
          unsafe_segments: overallScore < 3.0 ? validPoints : 0,
        },
        route_summary: "",
        risk_factors: [],
      };
    }
  }
);

export const getGoogleRoute = createAsyncThunk(
  "locations/getGoogleRoute",
  async (payload: {
    origin: RouteCoordinate;
    destination: RouteCoordinate;
    waypoints?: RouteCoordinate[];
    profile?: string;
  }) => {
    const { origin, destination, waypoints } = payload;

    const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      throw new Error("Google Maps API key not configured");
    }

    // Build waypoints string if provided
    let waypointsParam = "";
    if (waypoints && waypoints.length > 0) {
      const waypointCoords = waypoints
        .map(wp => `${wp.latitude},${wp.longitude}`)
        .join("|");
      waypointsParam = `&waypoints=${waypointCoords}`;
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${origin.latitude},${origin.longitude}` +
      `&destination=${destination.latitude},${destination.longitude}` +
      waypointsParam +
      `&alternatives=true` +
      `&key=${googleApiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("❌ Google API Error:", errorText);
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
      throw new Error(`No routes found: ${data.status}`);
    }

    // Transform Google routes to match our expected format
    const transformedRoutes = data.routes.map((route: any) => {
      // Decode polyline to get coordinates
      const detailedCoordinates: [number, number][] = [];
      route.legs.forEach((leg: any) => {
        leg.steps.forEach((step: any) => {
          // Each step has its own detailed polyline
          const stepCoords = decodePolyline(step.polyline.points);
          detailedCoordinates.push(...stepCoords);
        });
      });

      // Extract turn-by-turn steps from all legs
      const steps: NavigationStep[] = [];
      route.legs.forEach((leg: any) => {
        leg.steps.forEach((step: any) => {
          steps.push({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ""), // Strip HTML tags
            distance_meters: step.distance.value,
            duration_seconds: step.duration.value,
            start_location: {
              latitude: step.start_location.lat,
              longitude: step.start_location.lng,
            },
            end_location: {
              latitude: step.end_location.lat,
              longitude: step.end_location.lng,
            },
            maneuver: step.maneuver || undefined,
          });
        });
      });
      return {
        duration: route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0),
        distance: route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0),
        geometry: {
          coordinates: detailedCoordinates,
          type: "LineString"
        },
        steps: steps,
      };
    });
    return transformedRoutes;
  }
);

// Helper function to decode Google"s polyline format
function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5]); // [longitude, latitude] format
  }

  return coordinates;
}
// NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API

export const generateSafeRoute = createAsyncThunk(
  "locations/generateSafeRoute",
  async (routeRequest: RouteRequest, { rejectWithValue, dispatch }) => {
    try {
      // Step 1: Get route from Mapbox
      const mapboxRoutes = await dispatch(getGoogleRoute({
        origin: routeRequest.origin,
        destination: routeRequest.destination,
        profile: "driving"
      })).unwrap();

      if (!mapboxRoutes || mapboxRoutes.length === 0) {
        throw new Error("No routes found from Mapbox");
      }

      const primaryRoute = mapboxRoutes[0];

      // Step 2: Convert coordinates for safety analysis
      const routeCoordinates: RouteCoordinate[] = primaryRoute.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng
        })
      );

      // Step 3: Calculate route safety
      const safetyAnalysis = await dispatch(calculateRouteSafety({
        route_coordinates: routeCoordinates,
        user_demographics: routeRequest.user_demographics
      })).unwrap();

      // Step 4: Create SafeRoute object
      const routeName = determineBestRouteName(safetyAnalysis);
      const routeType = determineRouteType(safetyAnalysis, routeRequest.route_preferences);

      const safeRoute: SafeRoute = {
        id: `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: routeName,
        route_type: routeType,
        coordinates: routeCoordinates,
        steps: primaryRoute.steps,
        route_points: routeCoordinates,
        estimated_duration_minutes: Math.round(primaryRoute.duration / 60),
        distance_kilometers: Math.round(primaryRoute.distance / 1000 * 10) / 10,
        safety_analysis: safetyAnalysis,
        created_at: new Date().toISOString(),
        mapbox_data: {
          duration: primaryRoute.duration,
          distance: primaryRoute.distance,
          geometry: primaryRoute.geometry
        }
      };

      return {
        route: safeRoute,
        mapbox_routes: mapboxRoutes
      };

    } catch (error) {
      logger.error("❌ Route generation failed:", error);
      return rejectWithValue(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);
// NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API

export const generateRouteAlternatives = createAsyncThunk(
  "locations/generateRouteAlternatives",
  async (routeRequest: RouteRequest, { rejectWithValue, dispatch }) => {
    try {
      // Get Mapbox routes (with alternatives)
      const mapboxRoutes = await dispatch(getGoogleRoute({
        origin: routeRequest.origin,
        destination: routeRequest.destination,
        profile: "driving"
      })).unwrap();

      if (!mapboxRoutes || mapboxRoutes.length <= 1) {
        return [];
      }

      const alternatives: SafeRoute[] = [];

      // Process alternative routes (skip the first one as it"s the primary)
      for (let i = 1; i < Math.min(mapboxRoutes.length, 4); i++) {
        const route = mapboxRoutes[i];

        try {
          const routeCoordinates: RouteCoordinate[] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => ({
              latitude: lat,
              longitude: lng
            })
          );

          const safetyAnalysis = await dispatch(calculateRouteSafety({
            route_coordinates: routeCoordinates,
            user_demographics: routeRequest.user_demographics
          })).unwrap();

          // Determine route characteristics
          let routeType: "fastest" | "safest" | "balanced" = "balanced";
          let routeName = `Alternative ${i}`;

          // Check if this is the fastest route
          const isFastest = mapboxRoutes.every((r: { duration: number; }, idx: number) => idx === i || r.duration >= route.duration);
          if (isFastest) {
            routeType = "fastest";
            routeName = "Fastest Route";
          }

          // Check if this is the safest route
          const isSafest = safetyAnalysis.overall_route_score >= 4.0;
          if (isSafest && routeType !== "fastest") {
            routeType = "safest";
            routeName = "Safest Route";
          }

          const safeRoute: SafeRoute = {
            id: `alt_route_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
            name: routeName,
            route_type: routeType,
            coordinates: routeCoordinates,
            steps: route.steps,
            estimated_duration_minutes: Math.round(route.duration / 60),
            distance_kilometers: Math.round(route.distance / 1000 * 10) / 10,
            safety_analysis: safetyAnalysis,
            created_at: new Date().toISOString(),
            mapbox_data: {
              duration: route.duration,
              distance: route.distance,
              geometry: route.geometry
            }
          };

          alternatives.push(safeRoute);

        } catch (error) {
          logger.error(`Error analyzing alternative route ${i}:`, error);
          // Continue with other routes even if one fails
        }
      }

      // Sort alternatives by safety score (highest first)
      alternatives.sort((a, b) =>
        b.safety_analysis.overall_route_score - a.safety_analysis.overall_route_score
      );

      return alternatives;

    } catch (error) {
      logger.error("❌ Alternative route generation failed:", error);
      return rejectWithValue(error instanceof Error ? error.message : "Failed to generate alternatives");
    }
  }
);

export const generateSmartRoute = createAsyncThunk(
  "locations/generateSmartRoute",
  async (routeRequest: RouteRequest, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.functions.invoke("smart-route-generator", {
        body: {
          origin: routeRequest.origin,
          destination: routeRequest.destination,
          heading: routeRequest.heading,
          user_demographics: routeRequest.user_demographics,
          route_preferences: routeRequest.route_preferences
        }
      });

      if (error) {
        logger.error("❌ Smart route generation failed:", error);
        throw error;
      }

      if (!data.success) {
        // Still return the data so UI can show the comparison
        return data;
      }

      // Convert the optimized route to SafeRoute format
      const optimizedCoords: RouteCoordinate[] = data.optimized_route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng
        })
      );

      const optimizedSafeRoute: SafeRoute = {
        id: `smart_route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: "Smart Safe Route",
        route_type: "safest",
        coordinates: optimizedCoords,
        route_points: optimizedCoords,
        steps: data.optimized_route.steps,
        estimated_duration_minutes: Math.round(data.optimized_route.duration / 60),
        distance_kilometers: Math.round(data.optimized_route.distance / 1000 * 10) / 10,
        safety_analysis: {
          overall_route_score: data.improvement_summary.optimized_safety_score,
          overall_confidence: data.optimized_safety?.overall_confidence ?? APP_CONFIG.ROUTE_PLANNING.FALLBACK_CONFIDENCE,
          confidence: data.optimized_safety?.overall_confidence ?? APP_CONFIG.ROUTE_PLANNING.FALLBACK_CONFIDENCE,
          segment_scores: data.optimized_safety?.segment_scores,
          danger_zones_intersected: data.optimized_safety?.danger_zones_intersected ?? 0,
          high_risk_segments: data.optimized_safety?.high_risk_segments ?? 0,
          safety_notes: data.optimized_safety?.safety_notes ?? [
            `Safety improved by ${data.improvement_summary.safety_improvement.toFixed(1)} points`,
            `Avoids ${data.improvement_summary.danger_zones_avoided} danger zone(s)`,
            `Adds ${data.improvement_summary.time_added_minutes} minutes to journey`
          ],
          safety_summary: data.optimized_safety?.safety_summary ?? {
            safe_segments: 0,
            mixed_segments: 0,
            unsafe_segments: 0
          },
          confidence_score: data.optimized_safety?.overall_confidence ?? APP_CONFIG.ROUTE_PLANNING.FALLBACK_CONFIDENCE,
          route_summary: data.message
        },
        created_at: new Date().toISOString(),
        mapbox_data: {
          duration: data.optimized_route.duration,
          distance: data.optimized_route.distance,
          geometry: data.optimized_route.geometry
        },
        waypoints_added: data.waypoints_added  // NEW: track why route was modified
      };

      // Also convert original route for comparison
      const originalCoords: RouteCoordinate[] = data.original_route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng
        })
      );

      const originalSafeRoute: SafeRoute = {
        id: `original_route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: "Fastest Route",
        route_type: "fastest",
        coordinates: originalCoords,
        route_points: originalCoords,
        steps: data.original_route.steps,
        estimated_duration_minutes: Math.round(data.original_route.duration / 60),
        distance_kilometers: Math.round(data.original_route.distance / 1000 * 10) / 10,
        safety_analysis: data.original_safety || {
          overall_route_score: data.improvement_summary.original_safety_score,
          confidence: 0.85,
          segment_scores: data.original_safety?.segment_scores,
          danger_zones_intersected: data.original_safety?.danger_zones_intersected ?? 0,
          high_risk_segments: data.original_safety?.high_risk_segments ?? 0,
          safety_notes: ["Standard fastest route - may pass through danger zones"],
          safety_summary: {
            safe_segments: 0,
            mixed_segments: 0,
            unsafe_segments: 0
          },
          confidence_score: 0.85,
          route_summary: "Fastest route without safety optimization"
        },
        created_at: new Date().toISOString(),
        mapbox_data: {
          duration: data.original_route.duration,
          distance: data.original_route.distance,
          geometry: data.original_route.geometry
        }
      };

      return {
        optimized_route: optimizedSafeRoute,
        original_route: originalSafeRoute,
        improvement_summary: data.improvement_summary,
        smart_route_data: data,
        success: data.success,
      };

    } catch (error) {
      logger.error("❌ Smart route generation error:", error);
      return rejectWithValue(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);

// Simple distance calculation (meters)
function calculateDistanceSimple(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Find correct step based on current position
function findCorrectStepForPosition(
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

    // If closer to next step start OR within 50m of current step end, advance
    if (distToNextStart < distToCurrentEnd || distToCurrentEnd < 50) {
      correctStep = i + 1;
    } else {
      break;
    }
  }

  return correctStep;
}

export const checkForReroute = createAsyncThunk(
  "locations/checkForReroute",
  async (
    currentPosition: { latitude: number; longitude: number },
    { getState, dispatch }
  ) => {

    const state = getState() as RootState;
    const { selectedRoute, routeRequest, navigationSessionId } = state.locations;

    if (!selectedRoute || !routeRequest) {
      logger.info('REROUTE_ABORTED', { reason: 'missing route or request' });
      return;
    }
    dispatch(setRerouting(true));

    // Show alert
    notify.info(
      "Finding a new & safer route...",
      "Recalculating Route"
    );
    try {
      // Create new route request from current position to original destination
      const newRouteRequest: RouteRequest = {
        ...routeRequest,
        origin: {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
        },
        heading: state.locations.navigationPosition?.heading,
        // Keep the same destination
      };

      // Try smart route first (safer route)
      try {
        const result = await dispatch(generateSmartRoute(newRouteRequest)).unwrap();
        if (result.success && result.optimized_route) {
          // Always use the new route when rerouting (starts from current position)
          const routeWithDbId = {
            ...result.optimized_route,
            route_points: result.optimized_route.coordinates,
            databaseId: selectedRoute.databaseId,
            navigationSessionId: selectedRoute.navigationSessionId,
          };

          dispatch(setSelectedRoute(routeWithDbId));
          const correctStep = result.optimized_route.steps
            ? findCorrectStepForPosition(currentPosition, result.optimized_route.steps)
            : 0;
          dispatch(updateNavigationProgress(correctStep));

          dispatch(setRouteRequest({
            ...routeRequest,
            origin: {
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
            }
          }));

          // Show appropriate message based on improvement
          const hasImprovement =
            result.improvement_summary.safety_improvement > 0 ||
            result.improvement_summary.danger_zones_avoided > 0;

          if (hasImprovement) {
            notify.info(
              `Safer route found! Avoiding ${result.improvement_summary.danger_zones_avoided} danger zone(s).`,
              "Route Updated"
            );
          } else {
            notify.info(
              "Route recalculated from your current position.",
              "Route Updated"
            );
          }
        } else {
          // Smart route generation failed
          throw new Error("Smart route generation failed");
        }
      } catch (smartRouteError) {
        // Fallback to basic route generation
        logger.error('SMART_ROUTE_FAILED', {
          error: smartRouteError instanceof Error ? smartRouteError.message : String(smartRouteError)
        });

        const errorMessage =
          smartRouteError instanceof Error
            ? smartRouteError.message
            : String(smartRouteError);

        if (errorMessage.includes("No safer alternative available")) {
          // Don't try fallback - inform user directly
          notify.confirm(
            "No Safer Route Available",
            "There's no way to avoid this danger zone. You can continue with caution or stop navigation.",
            [
              {
                text: "Continue Current Route",
                style: "cancel",
                onPress: () => { },
              },
              {
                text: "Stop Navigation",
                style: "destructive",
                onPress: () => dispatch(endNavigation()),
              },
            ],
            "warning"
          );
          return;
        }

        // For other errors, try fallback to basic route generation
        const basicResult = await dispatch(
          generateSafeRoute(newRouteRequest)
        ).unwrap();

        if (basicResult.route) {
          // Update in-memory route only (no DB save during reroute)
          const routeWithDbId = {
            ...basicResult.route,
            route_points: basicResult.route.coordinates,
            databaseId: selectedRoute.databaseId,
            navigationSessionId: selectedRoute.navigationSessionId,
          };

          dispatch(setSelectedRoute(routeWithDbId));
          const correctStep = basicResult.route.steps
            ? findCorrectStepForPosition(currentPosition, basicResult.route.steps)
            : 0;
          dispatch(updateNavigationProgress(correctStep));

          dispatch(setRouteRequest({
            ...routeRequest,
            origin: {
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
            }
          }));

          // Only notify if route actually changed significantly
          const oldDistance = selectedRoute.distance_kilometers || 0;
          const newDistance = basicResult.route.distance_kilometers || 0;
          const distanceDiff = Math.abs(newDistance - oldDistance);

          if (distanceDiff >= 0.5) {
            notify.success(
              "New route calculated from your current position",
              "Route Updated"
            );
          }

          setTimeout(() => {
            // @ts-ignore
            dispatch(setRerouting(false));
          }, 10000);
        }
      } finally {
        setTimeout(() => {
          dispatch(setRerouting(false));
        }, 3000);
      }
    } catch (error) {
      // @ts-ignore
      dispatch(setRerouting(false));
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage === "NO_ALTERNATIVE_ROUTE") {
        // No safer route exists - give user clear options
        notify.confirm(
          "No Safer Route Available",
          "There are no safer alternative routes in this area. You can continue with your current route or cancel navigation.",
          [
            {
              text: "Continue Current Route",
              style: "cancel",
              onPress: () => { },
            },
            {
              text: "Stop Navigation",
              style: "destructive",
              onPress: () => dispatch(endNavigation()),
            },
          ],
          "warning"
        );
      } else {
        // Other routing errors
        logger.error("❌ Rerouting failed:", error);
        notify.confirm(
          "Rerouting Failed",
          "Could not calculate new route. Please try planning again.",
          [
            {
              text: "Stop Navigation",
              style: "destructive",
              onPress: () => dispatch(endNavigation()),
            },
            {
              text: "Continue",
              style: "cancel",
              onPress: () => { },
            },
          ]
        );
      }
    }
  }
);

export const fetchUserRouteHistory = createAsyncThunk(
  "locations/fetchUserRouteHistory",
  async ({ userId, page = 0, pageSize = 5 }: { userId: string; page?: number; pageSize?: number }) => {
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;

    const routes = (data || []).map(dbRowToRouteHistoryItem);
    return { routes, page, hasMore: (data?.length || 0) === pageSize };
  }
);

export const deleteRouteFromHistory = createAsyncThunk(
  "locations/deleteRouteFromHistory",
  async (routeId: string) => {
    const { error } = await supabase
      .from("routes")
      .delete()
      .eq("id", routeId);

    if (error) throw error;
    return routeId;
  }
);

export const saveFinalRoute = createAsyncThunk(
  "locations/saveFinalRoute",
  async (
    {
      routeId,
      actualPath
    }: {
      routeId: string;
      actualPath: Array<{ latitude: number; longitude: number }>;
    },
    { getState }
  ) => {
    const { data, error } = await supabase
      .from("routes")
      .update({
        actual_path_traveled: actualPath,
        navigation_ended_at: new Date().toISOString(),
      })
      .eq("id", routeId)
      .select()
      .single();

    if (error) {
      logger.error("Error saving final route:", error);
      throw error;
    }

    return data;
  }
);

export const fetchDemographicScores = createAsyncThunk(
  "locations/fetchDemographicScores",
  async (locationId: string) => {
    const { data, error } = await supabase
      .from("safety_scores")
      .select("*")
      .eq("location_id", locationId)
      .order("demographic_type");

    if (error) {
      logger.error("Error fetching demographic scores:", error);
      throw error;
    }

    return { locationId, scores: data || [] };
  }
);

// ================================
// HELPER FUNCTIONS
// ================================

function determineBestRouteName(safetyAnalysis: RouteSafetyAnalysis): string {
  const { overall_route_score } = safetyAnalysis;

  if (overall_route_score >= 4.0) {
    return "Safe Route";
  } else if (overall_route_score >= 3.0) {
    return "Moderate Safety Route";
  } else {
    return "Caution Advised Route";
  }
}

function determineRouteType(
  safetyAnalysis: RouteSafetyAnalysis,
  preferences: RouteRequest["route_preferences"]
): "fastest" | "safest" | "balanced" {
  if (preferences.prioritize_safety) {
    return "safest";
  } else if (safetyAnalysis.overall_route_score >= 4.0) {
    return "balanced";
  } else {
    return "fastest";
  }
}

// ================================
// SLICE DEFINITION
// ================================

const locationsSlice = createSlice({
  name: "locations",
  initialState,
  reducers: {
    clearSelectedLocation: (state) => {
      state.selectedLocation = null;
    },
    setSelectedRoute: (state, action: PayloadAction<SafeRoute | null>) => {
      if (!action.payload?.navigationSessionId) {
        console.trace('🟣 MISSING navigationSessionId - call stack:');
      }
      state.selectedRoute = action.payload;
    },

    setRouteRequest: (state, action: PayloadAction<RouteRequest | null>) => {
      if (action.payload === null) {
        console.trace('📝 Setting to NULL - call stack:');
      }
      state.routeRequest = action.payload;
    },

    toggleRouteSegments: (state) => {
      state.showRouteSegments = !state.showRouteSegments;
    },

    setSelectedSegment: (state, action: PayloadAction<RouteSegment | null>) => {
      state.selectedSegment = action.payload;
    },

    updateRoutePreferences: (state, action: PayloadAction<Partial<typeof state.routePreferences>>) => {
      state.routePreferences = { ...state.routePreferences, ...action.payload };
    },
    setSmartRouteComparison: (state, action: PayloadAction<SmartRouteComparison | null>) => {
      state.smartRouteComparison = action.payload;
      state.showSmartRouteComparison = action.payload !== null;
    },

    toggleSmartRouteComparison: (state) => {
      state.showSmartRouteComparison = !state.showSmartRouteComparison;
    },
    clearRoutes: (state) => {
      state.routes = [];
      state.selectedRoute = null;
      state.routeAlternatives = [];
      state.routeSafetyAnalysis = null;
      state.routeError = null;
      state.smartRouteComparison = null;
      state.showSmartRouteComparison = false;
    },

    setSelectedLocation: (state, action: PayloadAction<LocationWithScores | null>) => {
      state.selectedLocation = action.payload;
    },

    setMapCenter: (state, action: PayloadAction<{ latitude: number; longitude: number } | null>) => {
      state.mapCenter = action.payload;
    },

    setCommunityFeedMode: (state, action: PayloadAction<"near_me" | "map_area">) => {
      state.communityFeedMode = action.payload;
    },

    setFilters: (state, action: PayloadAction<Partial<LocationsState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearError: (state) => {
      state.error = null;
    },
    addReviewToFeed: (state, action: PayloadAction<any>) => {
      // Prepend new review to the beginning of the community feed
      state.communityReviews.unshift(action.payload);
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.showSearchResults = false;
    },

    setShowSearchResults: (state, action: PayloadAction<boolean>) => {
      state.showSearchResults = action.payload;
    },

    setUserLocation: (state, action: PayloadAction<{ latitude: number; longitude: number } | null>) => {
      state.userLocation = action.payload;
    },
    setUserCountry: (state, action: PayloadAction<string | null>) => {
      state.userCountry = action.payload;
    },
    addLocationToNearby: (state, action: PayloadAction<LocationWithScores>) => {
      if (!state.nearbyLocations.find((loc: LocationWithScores) => loc.id === action.payload.id)) {
        state.nearbyLocations.push(action.payload);
      }
    },

    toggleDangerZones: (state) => {
      state.dangerZonesVisible = !state.dangerZonesVisible;
      // Clear zones when toggling OFF so next toggle ON refetches
      if (!state.dangerZonesVisible) {
        state.dangerZones = [];
      }
    },
    setDangerZonesVisible: (state, action: PayloadAction<boolean>) => {
      state.dangerZonesVisible = action.payload;
    },
    setNavigationIntent: (state, action: PayloadAction<LocationsState["navigationIntent"]>) => {
      state.navigationIntent = action.payload;
    },

    clearNavigationIntent: (state) => {
      state.navigationIntent = null;
    },
    // Navigation actions
    startNavigation: (state) => {
      state.navigationActive = true;
      state.currentNavigationStep = 0;
      state.navigationStartTime = new Date().toISOString();
      state.isRerouting = false;
    },

    endNavigation: (state) => {
      state.navigationActive = false;
      state.currentNavigationStep = null;
      state.navigationStartTime = null;
    },

    updateNavigationProgress: (state, action: PayloadAction<number>) => {
      state.currentNavigationStep = action.payload;
    },
    // Safety alert dismissal tracking
    setRerouting: (state, action: PayloadAction<boolean>) => {
      state.isRerouting = action.payload;
    },
    setNavigationSessionId: (state, action: PayloadAction<string | null>) => {
      if (action.payload === null) {
        console.trace('🔵 Setting to NULL - call stack:');
      }
      state.navigationSessionId = action.payload;
    },
    setNavigationPosition: (state, action: PayloadAction<{ latitude: number; longitude: number; heading?: number } | null>) => {
      state.navigationPosition = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      // Fetch Nearby Locations
      .addCase(fetchNearbyLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNearbyLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.nearbyLocations = action.payload;
      })
      .addCase(fetchNearbyLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch nearby locations";
      })

      // Safety Insights
      .addCase(fetchSafetyInsights.pending, (state) => {
        state.safetyInsightsLoading = true;
      })
      .addCase(fetchSafetyInsights.fulfilled, (state, action) => {
        state.safetyInsightsLoading = false;
        state.safetyInsights = action.payload as any;
      })
      .addCase(fetchSafetyInsights.rejected, (state, action) => {
        state.safetyInsightsLoading = false;
        state.error = action.error.message || "Failed to fetch safety insights";
      })

      // Fetch Location Details
      .addCase(fetchLocationDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocationDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedLocation = action.payload;
      })
      .addCase(fetchLocationDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch location details";
      })

      // Create Location
      .addCase(createLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations.push(action.payload as any);
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create location";
      })
      .addCase(saveRouteToDatabase.fulfilled, (state, action) => {
        // Add the database ID to the selected route
        if (state.selectedRoute) {
          state.selectedRoute.databaseId = action.payload.id;
        }
        if (state.smartRouteComparison?.optimized_route) {
          state.smartRouteComparison.optimized_route.databaseId = action.payload.id;
        }
        console.info("✅ Route saved to database:", action.payload.id);
      })
      .addCase(saveRouteToDatabase.pending, (state) => {
        console.info("⏳ Saving route to database...");
      })
      .addCase(saveRouteToDatabase.rejected, (state, action) => {
        console.error("❌ Failed to save route to database:", action.payload);
        notify.error("Failed to save route: " + action.payload);
      })
      // Submit Review
      .addCase(submitReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.loading = false;
        // Check if this was queued or actually submitted
        if (action.payload && !('queued' in action.payload)) {
          state.userReviews.unshift(action.payload as any);
        }
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to submit review";
      })

      // Update Review
      .addCase(updateReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReview.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.userReviews.findIndex(review => review.id === action.payload.id);
        if (index !== -1) {
          state.userReviews[index] = action.payload as any;
        }
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update review";
      })

      // Fetch User Reviews
      .addCase(fetchUserReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.userReviews = action.payload as any;
      })
      .addCase(fetchUserReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch user reviews";
      })

      // Search Locations
      .addCase(searchLocations.pending, (state) => {
        state.searchLoading = true;
      })
      .addCase(searchLocations.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload;
        state.showSearchResults = action.payload.length > 0;
      })
      .addCase(searchLocations.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.error.message || "Search failed";
      })

      // Create Location from Search
      .addCase(createLocationFromSearch.pending, (state) => {
        state.loading = true;
      })
      .addCase(createLocationFromSearch.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(createLocationFromSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create location";
      })

      // Load community feed mode
      .addCase(loadCommunityFeedMode.fulfilled, (state, action) => {
        state.communityFeedMode = action.payload;
      })

      // Save community feed mode
      .addCase(saveCommunityFeedMode.fulfilled, (state, action) => {
        state.communityFeedMode = action.payload;
      })

      // Recent Reviews
      .addCase(fetchRecentReviews.pending, (state) => {
        state.communityLoading = true;
        state.error = null;
      })
      .addCase(fetchRecentReviews.fulfilled, (state, action) => {
        state.communityLoading = false;
        state.communityReviews = action.payload as any;
      })
      .addCase(fetchRecentReviews.rejected, (state, action) => {
        state.communityLoading = false;
        state.error = action.error.message || "Failed to fetch community reviews";
      })

      // Trending Locations
      .addCase(fetchTrendingLocations.pending, (state) => {
        state.trendingLoading = true;
        state.error = null;
      })
      .addCase(fetchTrendingLocations.fulfilled, (state, action) => {
        state.trendingLoading = false;
        state.trendingLocations = action.payload as any;
      })
      .addCase(fetchTrendingLocations.rejected, (state, action) => {
        state.trendingLoading = false;
        state.error = action.error.message || "Failed to fetch trending locations";
      })

      // Danger Zones
      .addCase(fetchDangerZones.pending, (state) => {
        state.dangerZonesLoading = true;
      })
      .addCase(fetchDangerZones.fulfilled, (state, action) => {
        state.dangerZonesLoading = false;
        state.dangerZones = action.payload;
      })
      .addCase(fetchDangerZones.rejected, (state, action) => {
        state.dangerZonesLoading = false;
        state.dangerZones = [];
      })

      // Similar Users
      .addCase(fetchSimilarUsers.pending, (state) => {
        state.similarUsersLoading = true;
      })
      .addCase(fetchSimilarUsers.fulfilled, (state, action) => {
        state.similarUsersLoading = false;
        state.similarUsers = action.payload;
      })
      .addCase(fetchSimilarUsers.rejected, (state) => {
        state.similarUsersLoading = false;
        state.error = "Failed to fetch similar users";
      })

      // ML Predictions
      .addCase(fetchMLPredictions.pending, (state, action) => {
        const locationId = typeof action.meta.arg === 'string'
          ? action.meta.arg
          : action.meta.arg.locationId;
        state.mlPredictionsLoading[locationId] = true;
      })
      .addCase(fetchMLPredictions.fulfilled, (state, action) => {
        if (action.payload) {
          const { locationId, prediction } = action.payload;
          state.mlPredictions[locationId] = prediction;
          state.mlPredictionsLoading[locationId] = false;
        }
      })
      .addCase(fetchMLPredictions.rejected, (state, action) => {
        const locationId = typeof action.meta.arg === 'string'
          ? action.meta.arg
          : action.meta.arg.locationId;
        state.mlPredictionsLoading[locationId] = false;
      })

      // Route Safety Calculation
      .addCase(calculateRouteSafety.pending, (state) => {
        state.routeLoading = true;
        state.routeError = null;
      })
      .addCase(calculateRouteSafety.fulfilled, (state, action) => {
        state.routeLoading = false;
        state.routeSafetyAnalysis = action.payload;
      })
      .addCase(calculateRouteSafety.rejected, (state, action) => {
        state.routeLoading = false;
        state.routeError = action.error.message || "Failed to calculate route safety";
      })

      // Get Mapbox Route
      .addCase(getGoogleRoute.pending, (state) => {
        state.routeLoading = true;
        state.routeError = null;
      })
      .addCase(getGoogleRoute.fulfilled, (state) => {
        state.routeLoading = false;
      })
      .addCase(getGoogleRoute.rejected, (state, action) => {
        state.routeLoading = false;
        state.routeError = action.error.message || "Failed to get route from Mapbox";
      })

      // Generate Safe Route
      .addCase(generateSafeRoute.pending, (state) => {
        state.routeLoading = true;
        state.routeError = null;
      })
      .addCase(generateSafeRoute.fulfilled, (state, action) => {
        state.routeLoading = false;
        if (!state.navigationActive) {
          state.selectedRoute = action.payload.route;
          state.routes = [action.payload.route];
        }
        state.routeSafetyAnalysis = action.payload.route.safety_analysis;
      })
      .addCase(generateSafeRoute.rejected, (state, action) => {
        state.routeLoading = false;
        state.routeError = action.payload as string || "Failed to generate safe route";
      })

      // Generate Route Alternatives
      .addCase(generateRouteAlternatives.pending, (state) => {
        // Don"t show loading for alternatives
      })
      .addCase(generateRouteAlternatives.fulfilled, (state, action) => {
        state.routeAlternatives = action.payload;
      })
      .addCase(generateRouteAlternatives.rejected, (state, action) => {
        logger.error("Failed to generate alternatives:", action.payload);
      })

      // Generate Smart Route
      .addCase(generateSmartRoute.pending, (state) => {
        state.routeLoading = true;
        state.routeError = null;
      })
      .addCase(generateSmartRoute.fulfilled, (state, action) => {
        state.routeLoading = false;

        const result = action.payload;

        // Check if we have a valid smart route result
        if (result && result.optimized_route && result.original_route) {

          // Only auto-set route if NOT actively navigating
          // During navigation, checkForReroute handles route setting
          if (!state.navigationActive) {
            state.selectedRoute = result.optimized_route;
            state.routes = [result.optimized_route];
          }
          // Store the full comparison data
          state.smartRouteComparison = {
            original_route: result.original_route,
            optimized_route: result.optimized_route,
            improvement_summary: result.improvement_summary,
            waypoints_added: result.smart_route_data?.waypoints_added || [],
            message: result.smart_route_data?.message || "Route optimized for safety"
          };

          // Show comparison UI
          state.showSmartRouteComparison = true;

        } else {
          // Smart routing didn't improve or failed
          state.smartRouteComparison = null;
          state.showSmartRouteComparison = false;

          // If we have an original route, use it as the selected route
          if (result && result.original_route) {
            if (!state.navigationActive) {
              state.selectedRoute = result.original_route;
              state.routes = [result.original_route];
            }
          }
        }
      })
      .addCase(generateSmartRoute.rejected, (state, action) => {
        state.routeLoading = false;
        state.routeError = action.payload as string || "Failed to generate smart route";
      })
      // Route History
      .addCase(fetchUserRouteHistory.pending, (state) => {
        state.routeHistoryLoading = true;
      })
      .addCase(fetchUserRouteHistory.fulfilled, (state, action) => {
        state.routeHistoryLoading = false;
        if (action.payload.page === 0) {
          state.routeHistory = action.payload.routes;
        } else {
          state.routeHistory = [...state.routeHistory, ...action.payload.routes];
        }
        state.routeHistoryPage = action.payload.page;
        state.routeHistoryHasMore = action.payload.hasMore;
      })
      .addCase(fetchUserRouteHistory.rejected, (state) => {
        state.routeHistoryLoading = false;
      })
      .addCase(deleteRouteFromHistory.fulfilled, (state, action) => {
        state.routeHistory = state.routeHistory.filter(r => r.id !== action.payload);
      })
      // Demographic Scores
      .addCase(fetchDemographicScores.pending, (state, action) => {
        state.demographicScoresLoading[action.meta.arg] = true;
      })
      .addCase(fetchDemographicScores.fulfilled, (state, action) => {
        state.demographicScoresLoading[action.payload.locationId] = false;
        state.demographicScores[action.payload.locationId] = action.payload.scores;
      })
      .addCase(fetchDemographicScores.rejected, (state, action) => {
        state.demographicScoresLoading[action.meta.arg] = false;
      })
  },
});

// ================================
// EXPORTS
// ================================

export const {
  clearSelectedLocation,
  setSelectedLocation,
  setFilters,
  clearError,
  addReviewToFeed,
  clearSearchResults,
  setShowSearchResults,
  setUserLocation,
  setUserCountry,
  addLocationToNearby,
  setMapCenter,
  setCommunityFeedMode,
  toggleDangerZones,
  setDangerZonesVisible,
  setSelectedRoute,
  setRouteRequest,
  toggleRouteSegments,
  setSelectedSegment,
  updateRoutePreferences,
  clearRoutes,
  setSmartRouteComparison,
  toggleSmartRouteComparison,
  setNavigationIntent,
  clearNavigationIntent,
  startNavigation,
  endNavigation,
  updateNavigationProgress,
  setRerouting,
  setNavigationSessionId,
  setNavigationPosition,
} = locationsSlice.actions;

export default locationsSlice.reducer;