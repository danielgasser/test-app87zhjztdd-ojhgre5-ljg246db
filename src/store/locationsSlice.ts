import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../services/supabase';
import { Database } from '../types/database.types';

import {
  LocationWithScores,
  CreateReviewForm,
  CreateLocationForm,
  Coordinates,
  DangerZone,
  DangerZonesResponse
} from '../types/supabase';
import { mapMapboxPlaceType } from '../utils/placeTypeMappers';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { APP_CONFIG } from '@/utils/appConfig';
import { ReactNode } from 'react';

type Review = Database['public']['Tables']['reviews']['Row'];
// ================================
// INTERFACES AND TYPES
// ================================

// Helper function to get the current auth token
async function getAuthToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('User not authenticated');
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
  source?: 'database' | 'mapbox';
}

export interface HeatMapPoint {
  latitude: number;
  longitude: number;
  weight: number;
  safety_score: number;
}

interface CommunityReview {
  id: string;
  user_id: string;
  location_id: string;
  location_name: string;
  safety_rating: number;
  overall_rating: number;
  comment: string;
  created_at: string;
  user_demographics: {
    race_ethnicity: string[];
    gender: string;
    lgbtq_status: string;
  };
}

interface MLPrediction {
  predicted_safety_score: number;
  confidence: number;
  similar_users_count: number;
  based_on_locations: number;
  risk_factors: string[];
}

// Route Planning Types
export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteRequest {
  origin: RouteCoordinate;
  destination: RouteCoordinate;
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

// NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API
export interface SafeRoute {
  id: string;
  name: string;
  route_type: 'fastest' | 'safest' | 'balanced';
  coordinates: RouteCoordinate[];
  estimated_duration_minutes: number;
  distance_kilometers: number;
  safety_analysis: RouteSafetyAnalysis;
  created_at: string;
  mapbox_data?: {
    duration: number;
    distance: number;
    geometry: any;
  };
  waypoints_added?: any; // NEW: track why route was modified
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
  communityFeedMode: 'near_me' | 'map_area';
  heatMapData: HeatMapPoint[];
  heatMapVisible: boolean;
  heatMapLoading: boolean;
  communityReviews: CommunityReview[];
  communityLoading: boolean;
  trendingLocations: any[];
  trendingLoading: boolean;
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
    safetyPriority: 'speed_focused' | 'balanced' | 'safety_focused';
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
    targetTab: 'map' | 'community' | 'profile';
    locationId?: string;
    action: 'view_location' | 'center_map' | 'show_reviews';
    data?: any; // For future flexibility
  } | null;
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
  communityFeedMode: 'near_me',
  heatMapData: [],
  heatMapVisible: false,
  heatMapLoading: false,
  communityReviews: [],
  communityLoading: false,
  trendingLocations: [],
  trendingLoading: false,
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
    safetyPriority: 'balanced',
    avoidEveningDanger: true,
    maxDetourMinutes: 15,
  },
  smartRouteComparison: null,
  showSmartRouteComparison: false,
  navigationIntent: null,
};


export const fetchNearbyLocations = createAsyncThunk(
  'locations/fetchNearby',
  async ({ latitude, longitude, radius = APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS }: Coordinates & { radius?: number }, { getState }) => {
    // Get user profile from Redux state
    const state = getState() as any;
    const userProfile = state.user.profile;

    // Use demographic-aware function if user has profile, otherwise fallback
    if (userProfile && userProfile.race_ethnicity) {

      const { data, error } = await (supabase.rpc as any)('get_nearby_locations_for_user', {
        lat: latitude,
        lng: longitude,
        user_race_ethnicity: userProfile.race_ethnicity,
        user_gender: userProfile.gender,
        user_lgbtq_status: userProfile.lgbtq_status,
        radius_meters: radius,
      });

      if (error) throw error;
      return data || [];
    } else {
      // Fallback to standard function if no profile

      const { data, error } = await (supabase.rpc as any)('get_nearby_locations', {
        lat: latitude,
        lng: longitude,
        radius_meters: radius,
      });

      if (error) throw error;
      return data || [];
    }
  }
);

export const fetchLocationDetails = createAsyncThunk(
  'locations/fetchLocationDetails',
  async (locationId: string) => {
    const { data, error } = await (supabase.rpc as any)('get_location_with_coords', {
      location_id: locationId,
    });

    if (error) {
      console.error('Error fetching location details:', error);
      throw error;
    }

    return Array.isArray(data) && data.length > 0 ? data[0] : data;
  }
);

export const createLocation = createAsyncThunk(
  'locations/createLocation',
  async (locationData: CreateLocationForm) => {
    const transformedData = {
      ...locationData,
      coordinates: `POINT(${locationData.longitude} ${locationData.latitude})`
    };
    // Remove latitude/longitude fields
    const { latitude, longitude, ...dbData } = transformedData;
    const { data, error } = await supabase.from('locations').insert(dbData).select().single();

    if (error) {
      console.error('Error creating location:', error);
      throw error;
    }

    return data;
  }
);

export const submitReview = createAsyncThunk(
  'locations/submitReview',
  async (reviewData: CreateReviewForm) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { time_of_day, ...dbReviewData } = reviewData;

    const { data, error } = await supabase.from('reviews').insert({
      ...dbReviewData,
      user_id: user.id
    }).select().single();

    if (error) {
      console.error('Error submitting review:', error);
      throw error;
    }

    return data;
  }
);

export const updateReview = createAsyncThunk(
  'locations/updateReview',
  async ({ id, ...updateData }: { id: string } & Partial<CreateReviewForm>) => {
    const { data, error } = await supabase.from('reviews').update(updateData).eq('id', id).select().single();

    if (error) {
      console.error('Error updating review:', error);
      throw error;
    }

    return data;
  }
);

export const fetchUserReviews = createAsyncThunk(
  'locations/fetchUserReviews',
  async (userId: string) => {
    const { data, error } = await supabase
      .from('reviews')
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
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user reviews:', error);
      throw error;
    }

    return data || [];
  }
);

export const searchLocations = createAsyncThunk(
  'locations/searchLocations',
  async ({ query, latitude, longitude }: { query: string; latitude?: number; longitude?: number }, { getState }) => {
    if (query.trim().length < 2) {
      return [];
    }

    try {
      const { data: dbResults, error: dbError } = await (supabase.rpc as any)('search_locations_with_coords', {
        search_query: query,
        result_limit: 5
      });

      if (dbError) {
        console.error('Database search error:', dbError);
      }

      const searchResults: SearchLocation[] = (dbResults || []).map((location: any) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        place_type: location.place_type,
        source: 'database' as const,
      }));

      const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (googleApiKey && searchResults.length < 5) {
        const state = getState() as any;
        const userCountry = state.locations.userCountry || 'us';
        try {
          let googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleApiKey}&region=${userCountry}&components=country:${userCountry}`;

          if (latitude && longitude) {
            googleUrl += `&location=${latitude},${longitude}`;
          }

          const googleResponse = await fetch(googleUrl);
          const googleData = await googleResponse.json();

          if (googleData.status === 'OK' && googleData.results) {
            googleData.results.slice(0, 5 - searchResults.length).forEach((result: any) => {
              let name = result.formatted_address.split(',')[0];
              const addressComponents = result.address_components;
              if (addressComponents && addressComponents.length > 0) {
                // Priority: locality > administrative_area_level_1 > country
                const locality = addressComponents.find((c: any) => c.types.includes('locality'));
                const adminArea = addressComponents.find((c: any) => c.types.includes('administrative_area_level_1'));
                const country = addressComponents.find((c: any) => c.types.includes('country'));

                name = locality?.long_name || adminArea?.long_name || country?.long_name || name;
              }
              // NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API
              searchResults.push({
                id: result.place_id,
                name: result.address_components?.[0]?.long_name || result.formatted_address.split(',')[0],
                address: result.formatted_address,
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
                place_type: result.types?.[0] || "location",
                source: 'mapbox' as const,
              });
            });
          }
        } catch (error) {
          console.error('Google Maps geocoding error:', error);
        }
      }

      return searchResults;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
);

export const createLocationFromSearch = createAsyncThunk(
  'locations/createLocationFromSearch',
  async ({ searchLocation, userId }: { searchLocation: SearchLocation; userId: string }) => {
    if (searchLocation.source === 'database') {
      return searchLocation.id;
    }

    const [city, stateProvince, country] = searchLocation.address.split(',').map(s => s.trim());
    const mappedPlaceType = mapMapboxPlaceType(searchLocation.place_type || 'poi');

    const locationData = {
      name: searchLocation.name,
      address: city,
      city: city,
      state_province: stateProvince,
      country: country,
      postal_code: null,
      coordinates: `POINT(${searchLocation.longitude} ${searchLocation.latitude})`,
      place_type: mappedPlaceType,
      tags: null,
      google_place_id: searchLocation.id.startsWith('google_') ? searchLocation.id.replace('google_', '') : null, created_by: userId,
      verified: false,
      active: true,
    };

    const { data, error } = await supabase
      .from('locations')
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
  'locations/loadCommunityFeedMode',
  async () => {
    try {
      const savedMode = await AsyncStorage.getItem('communityFeedMode');
      return savedMode === 'map_area' ? 'map_area' : 'near_me';
    } catch (error) {
      console.error('Error loading community feed mode:', error);
      return 'near_me'; // Default fallback
    }
  }
);

export const saveCommunityFeedMode = createAsyncThunk(
  'locations/saveCommunityFeedMode',
  async (mode: 'near_me' | 'map_area') => {
    try {
      await AsyncStorage.setItem('communityFeedMode', mode);
      return mode;
    } catch (error) {
      console.error('Error saving community feed mode:', error);
      return mode;
    }
  }
);

export const fetchHeatMapData = createAsyncThunk(
  'locations/fetchHeatMapData',
  async ({
    latitude,
    longitude,
    radius = APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS,
    userProfile
  }: {
    latitude: number;
    longitude: number;
    radius?: number;
    userProfile?: any;
  }) => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_heatmap_data', {
        center_lat: latitude,
        center_lng: longitude,
        radius_meters: radius,
        user_race_ethnicity: userProfile?.race_ethnicity || null,
        user_gender: userProfile?.gender || null,
        user_lgbtq_status: userProfile?.lgbtq_status || null,
        user_disability_status: userProfile?.disability_status || null,
        user_religion: userProfile?.religion || null,
        user_age_range: userProfile?.age_range || null,
      });
      if (error) {
        console.error('Error fetching heat map data:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }
      if (!data || data.length === 0) {
        return [];
      }

      const heatMapPoints: HeatMapPoint[] = data.map((location: any) => ({
        latitude: location.latitude,
        longitude: location.longitude,
        weight: Math.max(0.1, Math.min(1.0, (location.safety_score || 3) / 5)),
        safety_score: location.safety_score || 3,
      }));

      return heatMapPoints;
    } catch (error) {
      console.error('Heat map data fetch error:', error);
      return [];
    }
  }
);

export const fetchRecentReviews = createAsyncThunk(
  'locations/fetchRecentReviews',
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
        console.log('No location provided for community reviews');
        return []; // Return empty array instead of fetching all reviews
      }

      const { data, error } = await supabase.rpc('get_nearby_reviews', {
        lat: latitude,
        lng: longitude,
        radius_meters: radius,
        review_limit: limit
      });
      if (error) {
        console.error('Error fetching nearby reviews:', error);
        throw error;
      }

      return (data || []).map(review => ({
        id: review.id,
        user_id: review.user_id,
        location_id: review.location_id,
        title: review.title,
        location_name: review.location_name,
        location_address: review.location_address,
        safety_rating: review.safety_rating,
        overall_rating: review.overall_rating,
        content: review.content,
        created_at: review.created_at,
        distance_meters: review.distance_meters,
      }));
    } catch (error) {
      console.error('Recent reviews fetch error:', error);
      throw error;
    }
  }
);

export const fetchTrendingLocations = createAsyncThunk(
  'locations/fetchTrendingLocations',
  async ({ daysWindow = APP_CONFIG.COMMUNITY.TRENDING_TIMEFRAME_DAYS, maxResults = APP_CONFIG.COMMUNITY.REVIEWS_PER_PAGE }: { daysWindow?: number; maxResults?: number } = {}) => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_trending_locations', {
        days_window: daysWindow,
        max_results: maxResults,
      });

      if (error) {
        console.error('Error fetching trending locations:', error.message, error.code, error.details);

        //console.error('Error fetching trending locations:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Trending locations fetch error:', error);
      throw error;
    }
  }
);
export const fetchDangerZones = createAsyncThunk(
  'locations/fetchDangerZones',
  async ({
    userId,
    radius = 10000,
    userDemographics
  }: {
    userId: string;
    radius?: number;
    userDemographics?: any;
  }) => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/danger-zones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId,
          radius_miles: radius / 1609.34,
          user_demographics: userDemographics
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🛡️ Danger zones API error:', response.status, errorText);
        return [];
      }

      const data: DangerZonesResponse = await response.json();
      return data.danger_zones || [];
    } catch (error) {
      console.error('Error fetching danger zones:', error);
      return [];
    }
  }
);

export const fetchSimilarUsers = createAsyncThunk(
  'locations/fetchSimilarUsers',
  async (userId: string) => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/similarity-calculator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        console.error('Similar users API error:', response.status);
        return [];
      }

      const data = await response.json();
      return data.similar_users || [];
    } catch (error) {
      console.error('Error fetching similar users:', error);
      return [];
    }
  }
);

export const fetchMLPredictions = createAsyncThunk(
  'locations/fetchMLPredictions',
  async (locationId: string, { getState }) => {
    try {
      const state = getState() as any;
      const userId = state.auth.user?.id;
      const userProfile = state.user.profile;

      if (!userId || !userProfile) {
        throw new Error('User not authenticated or profile not loaded');
      }
      const token = await getAuthToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/safety-predictor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            location_id: locationId,
            user_id: userId,
            user_demographics: {
              race_ethnicity: userProfile.race_ethnicity,
              gender: userProfile.gender,
              lgbtq_status: userProfile.lgbtq_status,
              disability_status: userProfile.disability_status,
              religion: userProfile.religion,
              age_range: userProfile.age_range,
            }
          }),
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
      console.error('🤖 fetchMLPredictions error:', error);
      throw error;
    }
  }
);

// ================================
// ROUTE PLANNING ASYNC THUNKS
// ================================

export const calculateRouteSafety = createAsyncThunk(
  'locations/calculateRouteSafety',
  async (payload: {
    route_coordinates: RouteCoordinate[];
    user_demographics: any;
    waypoints?: RouteCoordinate[];
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('route-safety-scorer', {
        body: payload
      });

      if (error) {
        console.warn('❌ Route safety scorer failed, using fallback method:', error);
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
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              latitude: point.latitude,
              longitude: point.longitude,
              user_demographics: payload.user_demographics,
              place_type: 'route_point'
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
          console.error('Error analyzing point:', pointError);
          totalSafety += 3.0;
          validPoints++;
        }
      }

      const overallScore = validPoints > 0 ? totalSafety / validPoints : 3.0;

      if (overallScore >= 4.0) {
        safetyNotes.push('This route is generally considered safe');
      } else if (overallScore >= 3.0) {
        safetyNotes.push('This route has mixed safety characteristics');
      } else {
        safetyNotes.push('This route may have safety concerns');
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
        route_summary: '',
        risk_factors: [],
      };
    }
  }
);

export const getGoogleRoute = createAsyncThunk(
  'locations/getGoogleRoute',
  async (payload: {
    origin: RouteCoordinate;
    destination: RouteCoordinate;
    waypoints?: RouteCoordinate[];
    profile?: string;
  }) => {
    const { origin, destination, waypoints } = payload;

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    // Build waypoints string if provided
    let waypointsParam = '';
    if (waypoints && waypoints.length > 0) {
      const waypointCoords = waypoints
        .map(wp => `${wp.latitude},${wp.longitude}`)
        .join('|');
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
      console.error('❌ Google API Error:', response.status, errorText);
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      throw new Error(`No routes found: ${data.status}`);
    }

    // Transform Google routes to match our expected format
    const transformedRoutes = data.routes.map((route: any) => {
      // Decode polyline to get coordinates
      const coordinates = decodePolyline(route.overview_polyline.points);

      return {
        duration: route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0),
        distance: route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0),
        geometry: {
          coordinates: coordinates,
          type: 'LineString'
        }
      };
    });

    return transformedRoutes;
  }
);

// Helper function to decode Google's polyline format
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
  'locations/generateSafeRoute',
  async (routeRequest: RouteRequest, { rejectWithValue, dispatch }) => {
    try {
      // Step 1: Get route from Mapbox
      const mapboxRoutes = await dispatch(getGoogleRoute({
        origin: routeRequest.origin,
        destination: routeRequest.destination,
        profile: 'driving'
      })).unwrap();

      if (!mapboxRoutes || mapboxRoutes.length === 0) {
        throw new Error('No routes found from Mapbox');
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
      console.error('❌ Route generation failed:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
);
// NOTE: Despite the "mapbox" naming, this actually uses Google Geocoding API

export const generateRouteAlternatives = createAsyncThunk(
  'locations/generateRouteAlternatives',
  async (routeRequest: RouteRequest, { rejectWithValue, dispatch }) => {
    try {
      // Get Mapbox routes (with alternatives)
      const mapboxRoutes = await dispatch(getGoogleRoute({
        origin: routeRequest.origin,
        destination: routeRequest.destination,
        profile: 'driving'
      })).unwrap();

      if (!mapboxRoutes || mapboxRoutes.length <= 1) {
        console.log('⚠️ No alternative routes available from Mapbox');
        return [];
      }

      const alternatives: SafeRoute[] = [];

      // Process alternative routes (skip the first one as it's the primary)
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
          let routeType: 'fastest' | 'safest' | 'balanced' = 'balanced';
          let routeName = `Alternative ${i}`;

          // Check if this is the fastest route
          const isFastest = mapboxRoutes.every((r: { duration: number; }, idx: number) => idx === i || r.duration >= route.duration);
          if (isFastest) {
            routeType = 'fastest';
            routeName = 'Fastest Route';
          }

          // Check if this is the safest route
          const isSafest = safetyAnalysis.overall_route_score >= 4.0;
          if (isSafest && routeType !== 'fastest') {
            routeType = 'safest';
            routeName = 'Safest Route';
          }

          const safeRoute: SafeRoute = {
            id: `alt_route_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
            name: routeName,
            route_type: routeType,
            coordinates: routeCoordinates,
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
          console.error(`Error analyzing alternative route ${i}:`, error);
          // Continue with other routes even if one fails
        }
      }

      // Sort alternatives by safety score (highest first)
      alternatives.sort((a, b) =>
        b.safety_analysis.overall_route_score - a.safety_analysis.overall_route_score
      );

      return alternatives;

    } catch (error) {
      console.error('❌ Alternative route generation failed:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to generate alternatives');
    }
  }
);

export const generateSmartRoute = createAsyncThunk(
  'locations/generateSmartRoute',
  async (routeRequest: RouteRequest, { rejectWithValue }) => {
    try {
      // Call the NEW smart-route-generator edge function
      const { data, error } = await supabase.functions.invoke('smart-route-generator', {
        body: {
          origin: routeRequest.origin,
          destination: routeRequest.destination,
          user_demographics: routeRequest.user_demographics,
          route_preferences: routeRequest.route_preferences
        }
      });

      if (error) {
        console.error('❌ Smart route generation failed:', error);
        throw error;
      }

      if (!data.success) {
        console.log('⚠️ Smart route not better than original:', data.message);
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
        name: 'Smart Safe Route',
        route_type: 'safest',
        coordinates: optimizedCoords,
        estimated_duration_minutes: Math.round(data.optimized_route.duration / 60),
        distance_kilometers: Math.round(data.optimized_route.distance / 1000 * 10) / 10,
        safety_analysis: {
          overall_route_score: data.improvement_summary.optimized_safety_score,
          confidence: 0.85,
          danger_zones_intersected: 0, // Update from actual data if available
          high_risk_segments: 0,
          safety_notes: [
            `Safety improved by ${data.improvement_summary.safety_improvement.toFixed(1)} points`,
            `Avoids ${data.improvement_summary.danger_zones_avoided} danger zone(s)`,
            `Adds ${data.improvement_summary.time_added_minutes} minutes to journey`
          ],
          safety_summary: {
            safe_segments: 0,
            mixed_segments: 0,
            unsafe_segments: 0
          },
          confidence_score: 0.85,
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
        name: 'Fastest Route',
        route_type: 'fastest',
        coordinates: originalCoords,
        estimated_duration_minutes: Math.round(data.original_route.duration / 60),
        distance_kilometers: Math.round(data.original_route.distance / 1000 * 10) / 10,
        safety_analysis: {
          overall_route_score: data.improvement_summary.original_safety_score,
          confidence: 0.85,
          safety_notes: ['Standard fastest route - may pass through danger zones'],
          safety_summary: {
            safe_segments: 0,
            mixed_segments: 0,
            unsafe_segments: 0
          },
          confidence_score: 0.85,
          route_summary: 'Fastest route without safety optimization'
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
        smart_route_data: data
      };

    } catch (error) {
      console.error('❌ Smart route generation error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
);
// ================================
// HELPER FUNCTIONS
// ================================

function determineBestRouteName(safetyAnalysis: RouteSafetyAnalysis): string {
  const { overall_route_score } = safetyAnalysis;

  if (overall_route_score >= 4.0) {
    return 'Safe Route';
  } else if (overall_route_score >= 3.0) {
    return 'Moderate Safety Route';
  } else {
    return 'Caution Advised Route';
  }
}

function determineRouteType(
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

// ================================
// SLICE DEFINITION
// ================================

const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    setSelectedRoute: (state, action: PayloadAction<SafeRoute | null>) => {
      state.selectedRoute = action.payload;
    },

    setRouteRequest: (state, action: PayloadAction<RouteRequest | null>) => {
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
      state.routeRequest = null;
      state.smartRouteComparison = null;
      state.showSmartRouteComparison = false;
    },

    setSelectedLocation: (state, action: PayloadAction<LocationWithScores | null>) => {
      state.selectedLocation = action.payload;
    },

    setMapCenter: (state, action: PayloadAction<{ latitude: number; longitude: number } | null>) => {
      state.mapCenter = action.payload;
    },

    setCommunityFeedMode: (state, action: PayloadAction<'near_me' | 'map_area'>) => {
      state.communityFeedMode = action.payload;
    },

    setFilters: (state, action: PayloadAction<Partial<LocationsState['filters']>>) => {
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

    toggleHeatMap: (state) => {
      state.heatMapVisible = !state.heatMapVisible;
    },

    setHeatMapVisible: (state, action: PayloadAction<boolean>) => {
      state.heatMapVisible = action.payload;
    },

    toggleDangerZones: (state) => {
      state.dangerZonesVisible = !state.dangerZonesVisible;
    },

    setDangerZonesVisible: (state, action: PayloadAction<boolean>) => {
      state.dangerZonesVisible = action.payload;
    },
    setNavigationIntent: (state, action: PayloadAction<LocationsState['navigationIntent']>) => {
      state.navigationIntent = action.payload;
    },

    clearNavigationIntent: (state) => {
      state.navigationIntent = null;
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
        state.error = action.error.message || 'Failed to fetch nearby locations';
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
        state.error = action.error.message || 'Failed to fetch location details';
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
        state.error = action.error.message || 'Failed to create location';
      })

      // Submit Review
      .addCase(submitReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.loading = false;
        state.userReviews.unshift(action.payload as any);
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to submit review';
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
        state.error = action.error.message || 'Failed to update review';
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
        state.error = action.error.message || 'Failed to fetch user reviews';
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
        state.error = action.error.message || 'Search failed';
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
        state.error = action.error.message || 'Failed to create location';
      })

      // Load community feed mode
      .addCase(loadCommunityFeedMode.fulfilled, (state, action) => {
        state.communityFeedMode = action.payload;
      })

      // Save community feed mode
      .addCase(saveCommunityFeedMode.fulfilled, (state, action) => {
        state.communityFeedMode = action.payload;
      })

      // Heat Map Data
      .addCase(fetchHeatMapData.pending, (state) => {
        state.heatMapLoading = true;
      })
      .addCase(fetchHeatMapData.fulfilled, (state, action) => {
        state.heatMapLoading = false;
        state.heatMapData = action.payload;
      })
      .addCase(fetchHeatMapData.rejected, (state, action) => {
        state.heatMapLoading = false;
        console.error('❌ Heatmap fetch FAILED:', action.error.message, action.error);

        state.heatMapData = [];
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
        state.error = action.error.message || 'Failed to fetch community reviews';
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
        state.error = action.error.message || 'Failed to fetch trending locations';
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
        state.error = 'Failed to fetch similar users';
      })

      // ML Predictions
      .addCase(fetchMLPredictions.pending, (state, action) => {
        const locationId = action.meta.arg;
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
        const locationId = action.meta.arg;
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
        state.routeError = action.error.message || 'Failed to calculate route safety';
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
        state.routeError = action.error.message || 'Failed to get route from Mapbox';
      })

      // Generate Safe Route
      .addCase(generateSafeRoute.pending, (state) => {
        state.routeLoading = true;
        state.routeError = null;
      })
      .addCase(generateSafeRoute.fulfilled, (state, action) => {
        state.routeLoading = false;
        state.selectedRoute = action.payload.route;
        state.routeSafetyAnalysis = action.payload.route.safety_analysis;
        state.routes = [action.payload.route];
      })
      .addCase(generateSafeRoute.rejected, (state, action) => {
        state.routeLoading = false;
        state.routeError = action.payload as string || 'Failed to generate safe route';
      })

      // Generate Route Alternatives
      .addCase(generateRouteAlternatives.pending, (state) => {
        // Don't show loading for alternatives
      })
      .addCase(generateRouteAlternatives.fulfilled, (state, action) => {
        state.routeAlternatives = action.payload;
      })
      .addCase(generateRouteAlternatives.rejected, (state, action) => {
        console.error('Failed to generate alternatives:', action.payload);
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

          // Store the optimized route as the selected route
          state.selectedRoute = result.optimized_route;
          state.routes = [result.optimized_route];

          // Store the full comparison data
          state.smartRouteComparison = {
            original_route: result.original_route,
            optimized_route: result.optimized_route,
            improvement_summary: result.improvement_summary,
            waypoints_added: result.smart_route_data?.waypoints_added || [],
            message: result.smart_route_data?.message || 'Route optimized for safety'
          };

          // Show comparison UI
          state.showSmartRouteComparison = true;

        } else {
          // If smart routing didn't improve anything, just store basic route
          state.smartRouteComparison = null;
          state.showSmartRouteComparison = false;
        }
      })
      .addCase(generateSmartRoute.rejected, (state, action) => {
        state.routeLoading = false;
        state.routeError = action.payload as string || 'Failed to generate smart route';
      })
  },
});

// ================================
// EXPORTS
// ================================

export const {
  setSelectedLocation,
  setFilters,
  clearError,
  addReviewToFeed,
  clearSearchResults,
  setShowSearchResults,
  setUserLocation,
  setUserCountry,
  addLocationToNearby,
  toggleHeatMap,
  setHeatMapVisible,
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
} = locationsSlice.actions;

export default locationsSlice.reducer;