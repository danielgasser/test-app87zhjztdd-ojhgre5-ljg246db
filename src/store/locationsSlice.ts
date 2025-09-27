import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../services/supabase';
import {
  LocationWithScores,
  Review,
  CreateReviewForm,
  CreateLocationForm,
  Coordinates,
  DangerZone,
  DangerZonesResponse
} from '../types/supabase';
import { mapMapboxPlaceType } from '../utils/placeTypeMappers';
import { APP_CONFIG } from '@/utils/appConfig';

interface SearchLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  source?: 'database' | 'mapbox';
}

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
  heatMapData: HeatMapPoint[];
  heatMapVisible: boolean;
  heatMapLoading: boolean;
  communityReviews: CommunityReview[];
  communityLoading: boolean;
  dangerZones: DangerZone[]
  dangerZonesVisible: boolean
  dangerZonesLoading: boolean
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
}

interface MLPrediction {
  location_id: string;
  location_name: string;
  predicted_safety_score: number;
  confidence: number;
  prediction_factors: {
    place_type_avg: number;
    similar_locations_count: number;
    demographic_matches: number;
  };
  based_on_locations: number;
  source: string;
  calculation_timestamp: string;
}

interface HeatMapPoint {
  latitude: number;
  longitude: number;
  safety_score: number;
  review_count: number;
  heat_weight: number;
}

interface CommunityReview extends Review {
  location_name: string;
  location_address: string;
}

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
    radius: APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS,
  },
  searchResults: [],
  searchLoading: false,
  showSearchResults: false,
  userLocation: null,
  heatMapData: [],
  heatMapVisible: false,
  heatMapLoading: false,
  communityReviews: [],
  communityLoading: false,
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
    safetyPriority: 'balanced' as const,
    avoidEveningDanger: true,
    maxDetourMinutes: 15,
  },
};

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteSegment {
  start: RouteCoordinate;
  end: RouteCoordinate;
  center: RouteCoordinate;
  distance_meters: number;
  safety_score: number;
  comfort_score: number;
  overall_score: number;
  confidence: number;
  risk_factors: string[];
  nearby_locations: any[];
  danger_zones: any[];
}

export interface RouteSafetyAnalysis {
  overall_route_safety: number;
  overall_route_comfort: number;
  overall_route_score: number;
  total_distance_meters: number;
  confidence: number;
  segment_scores: RouteSegment[];
  danger_zone_intersections: any[];
  high_risk_segments: RouteSegment[];
  improvement_suggestions: string[];
  route_summary: {
    safe_segments: number;
    mixed_segments: number;
    unsafe_segments: number;
    danger_zones_count: number;
  };
}

export interface SafeRoute {
  id: string;
  name: string;
  coordinates: RouteCoordinate[];
  safety_analysis: RouteSafetyAnalysis;
  estimated_duration_minutes: number;
  is_primary_route: boolean;
  route_type: 'fastest' | 'safest' | 'balanced';
  created_at: string;
}

export interface RouteRequest {
  origin: RouteCoordinate;
  destination: RouteCoordinate;
  waypoints?: RouteCoordinate[];
  user_demographics: any;
  route_preferences: {
    prioritize_safety: boolean;
    avoid_evening_danger: boolean;
    max_detour_minutes: number;
    required_waypoint_types?: string[];
  };
}

export const calculateRouteSafety = createAsyncThunk(
  'locations/calculateRouteSafety',
  async (payload: {
    route_coordinates: RouteCoordinate[];
    user_demographics: any;
    waypoints?: RouteCoordinate[];
  }) => {
    console.log('🔍 Calculating route safety scores...');

    const { data, error } = await supabase.functions.invoke('route-safety-scorer', {
      body: payload
    });

    if (error) {
      console.error('❌ Route safety calculation failed:', error);
      throw new Error(`Route safety calculation failed: ${error.message}`);
    }

    console.log('✅ Route safety analysis complete:', data);
    return data as RouteSafetyAnalysis;
  }
);

// Get route from Mapbox Directions API
export const getMapboxRoute = createAsyncThunk(
  'locations/getMapboxRoute',
  async (payload: {
    origin: RouteCoordinate;
    destination: RouteCoordinate;
    waypoints?: RouteCoordinate[];
    profile?: string;
  }) => {
    const { origin, destination, waypoints = [], profile = APP_CONFIG.ROUTE_PLANNING.MAPBOX.DEFAULT_PROFILE } = payload;

    // Build coordinates string for Mapbox API
    const allCoordinates = [origin, ...waypoints, destination];
    const coordinatesString = allCoordinates
      .map(coord => `${coord.longitude},${coord.latitude}`)
      .join(';');

    // Build Mapbox Directions API URL
    const baseUrl = APP_CONFIG.ROUTE_PLANNING.MAPBOX.BASE_URL;
    const url = `${baseUrl}/${profile}/${coordinatesString}`;

    const params = new URLSearchParams({
      access_token: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
      geometries: APP_CONFIG.ROUTE_PLANNING.MAPBOX.GEOMETRIES,
      overview: APP_CONFIG.ROUTE_PLANNING.MAPBOX.OVERVIEW,
      steps: APP_CONFIG.ROUTE_PLANNING.MAPBOX.STEPS.toString(),
      alternatives: APP_CONFIG.ROUTE_PLANNING.MAPBOX.ALTERNATIVES.toString(),
    });

    console.log('🗺️ Fetching route from Mapbox:', url);

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found for the given coordinates');
    }

    console.log('✅ Mapbox route retrieved successfully');
    return data;
  }
);

// Generate complete safe route with safety analysis
export const generateSafeRoute = createAsyncThunk(
  'locations/generateSafeRoute',
  async (routeRequest: RouteRequest, { dispatch, getState }) => {
    console.log('🚀 Generating safe route...');

    try {
      // Step 1: Get basic route from Mapbox
      const mapboxResult = await dispatch(getMapboxRoute({
        origin: routeRequest.origin,
        destination: routeRequest.destination,
        waypoints: routeRequest.waypoints,
      })).unwrap();

      // Step 2: Extract route coordinates from Mapbox response
      const primaryRoute = mapboxResult.routes[0];
      const routeCoordinates: RouteCoordinate[] = primaryRoute.geometry.coordinates.map(
        (coord: [number, number]) => ({
          latitude: coord[1],
          longitude: coord[0],
        })
      );

      // Step 3: Calculate safety scores for the route
      const safetyAnalysis = await dispatch(calculateRouteSafety({
        route_coordinates: routeCoordinates,
        user_demographics: routeRequest.user_demographics,
        waypoints: routeRequest.waypoints,
      })).unwrap();

      // Step 4: Create SafeRoute object
      const safeRoute: SafeRoute = {
        id: `route_${Date.now()}`,
        name: determineBestRouteName(safetyAnalysis),
        coordinates: routeCoordinates,
        safety_analysis: safetyAnalysis,
        estimated_duration_minutes: Math.round(primaryRoute.duration / 60),
        is_primary_route: true,
        route_type: determineRouteType(safetyAnalysis, routeRequest.route_preferences),
        created_at: new Date().toISOString(),
      };

      console.log('✅ Safe route generated successfully');
      return {
        route: safeRoute,
        mapbox_data: mapboxResult,
        alternatives: mapboxResult.routes.slice(1), // Additional routes for future processing
      };

    } catch (error) {
      console.error('❌ Safe route generation failed:', error);
      throw error;
    }
  }
);

// Generate multiple route alternatives with different priorities
export const generateRouteAlternatives = createAsyncThunk(
  'locations/generateRouteAlternatives',
  async (routeRequest: RouteRequest, { dispatch }) => {
    console.log('🔀 Generating route alternatives...');

    const alternatives: SafeRoute[] = [];

    // Generate routes with different profiles/priorities
    const profiles = [
      { name: 'fastest', profile: 'mapbox/driving-traffic', type: 'fastest' as const },
      { name: 'balanced', profile: 'mapbox/driving', type: 'balanced' as const },
    ];

    for (const profileConfig of profiles) {
      try {
        const mapboxResult = await dispatch(getMapboxRoute({
          origin: routeRequest.origin,
          destination: routeRequest.destination,
          waypoints: routeRequest.waypoints,
          profile: profileConfig.profile,
        })).unwrap();

        const routeCoordinates: RouteCoordinate[] = mapboxResult.routes[0].geometry.coordinates.map(
          (coord: [number, number]) => ({
            latitude: coord[1],
            longitude: coord[0],
          })
        );

        const safetyAnalysis = await dispatch(calculateRouteSafety({
          route_coordinates: routeCoordinates,
          user_demographics: routeRequest.user_demographics,
          waypoints: routeRequest.waypoints,
        })).unwrap();

        alternatives.push({
          id: `route_${profileConfig.name}_${Date.now()}`,
          name: `${profileConfig.name.charAt(0).toUpperCase() + profileConfig.name.slice(1)} Route`,
          coordinates: routeCoordinates,
          safety_analysis: safetyAnalysis,
          estimated_duration_minutes: Math.round(mapboxResult.routes[0].duration / 60),
          is_primary_route: false,
          route_type: profileConfig.type,
          created_at: new Date().toISOString(),
        });

      } catch (error) {
        console.warn(`⚠️ Failed to generate ${profileConfig.name} alternative:`, error);
      }
    }

    console.log(`✅ Generated ${alternatives.length} route alternatives`);
    return alternatives;
  }
);

export const fetchNearbyLocations = createAsyncThunk(
  'locations/fetchNearby',
  async ({ latitude, longitude, radius = APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS }: Coordinates & { radius?: number }, { getState }) => {
    // Get user profile from Redux state
    const state = getState() as any;
    const userProfile = state.user.profile;

    // Use demographic-aware function if user has profile, otherwise fallback
    if (userProfile && userProfile.race_ethnicity) {

      const { data, error } = await supabase.rpc('get_nearby_locations_for_user', {
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

      const { data, error } = await supabase.rpc('get_nearby_locations', {
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
  'locations/fetchDetails',
  async (locationId: string) => {
    // Get location with coordinates using our dedicated function
    const { data: locationData, error: locationError } = await supabase
      .rpc('get_location_with_coords', { location_id: locationId });

    if (locationError || !locationData || locationData.length === 0) {
      throw new Error(`Location not found: ${locationError?.message}`);
    }

    const location = locationData[0];

    // Get safety scores separately
    const { data: safetyScores, error: scoresError } = await supabase
      .from('safety_scores')
      .select('*')
      .eq('location_id', locationId);

    if (scoresError) {
      console.warn('Error fetching safety scores:', scoresError);
    }

    const overallScore = safetyScores?.find(
      (score: any) => score.demographic_type === 'overall'
    );

    return {
      ...location,
      safety_scores: safetyScores || [],
      overall_safety_score: overallScore?.avg_safety_score || null,
      review_count: overallScore?.review_count || 0,
    };
  }
);

export const fetchDangerZones = createAsyncThunk(
  'locations/fetchDangerZones',
  async ({ userId, radiusMiles = 50 }: { userId: string; radiusMiles?: number }) => {
    const supabaseUrl = (supabase as any).supabaseUrl
    const supabaseAnonKey = (supabase as any).supabaseKey

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/danger-zones`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ user_id: userId, radius_miles: radiusMiles }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error('Failed to fetch danger zones')
    }

    const data: DangerZonesResponse = await response.json()
    return data.danger_zones
  }
)

export const createLocation = createAsyncThunk(
  'locations/create',
  async (locationData: CreateLocationForm, { getState }) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;

    if (!userId) throw new Error('User must be logged in to create locations');

    const { latitude, longitude, ...rest } = locationData;

    const { data, error } = await supabase
      .from('locations')
      .insert({
        ...rest,
        coordinates: `POINT(${longitude} ${latitude})`,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

export const submitReview = createAsyncThunk(
  'locations/submitReview',
  async (reviewData: CreateReviewForm, { getState, dispatch }) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;

    if (!userId) throw new Error('User must be logged in to submit reviews');
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('location_id', reviewData.location_id)
      .eq('user_id', userId)
      .single();

    if (existingReview) {
      throw new Error('You have already reviewed this location');
    }
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        ...reviewData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('calculate_location_safety_scores', {
      p_location_id: reviewData.location_id,
    });

    dispatch(fetchLocationDetails(reviewData.location_id));

    return review;
  }
);

export const fetchRecentReviews = createAsyncThunk(
  'locations/fetchRecentReviews',
  async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        locations (
          name,
          address
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Transform the data to include location info at top level
    const transformedReviews = data?.map(review => ({
      ...review,
      location_name: review.locations?.name || 'Unknown Location',
      location_address: review.locations?.address || '',
    })) || [];

    return transformedReviews;
  }
);

export const updateReview = createAsyncThunk(
  'locations/updateReview',
  async ({ reviewId, reviewData }: { reviewId: string; reviewData: Partial<CreateReviewForm> }, { getState, dispatch }) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;

    if (!userId) throw new Error('User must be logged in to update reviews');

    const { data: review, error } = await supabase
      .from('reviews')
      .update({
        ...reviewData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    if (reviewData.location_id) {
      await supabase.rpc('calculate_location_safety_scores', {
        p_location_id: reviewData.location_id,
      });

      dispatch(fetchLocationDetails(reviewData.location_id));
    }

    return review;
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
          place_type
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
);

export const voteReview = createAsyncThunk(
  'locations/voteReview',
  async ({ reviewId, voteType }: { reviewId: string; voteType: 'helpful' | 'unhelpful' }, { getState }) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;

    if (!userId) throw new Error('User must be logged in to vote');

    const { data: existingVote } = await supabase
      .from('review_votes')
      .select()
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .single();

    if (existingVote) {
      const { error } = await supabase
        .from('review_votes')
        .update({ vote_type: voteType })
        .eq('id', existingVote.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('review_votes')
        .insert({
          review_id: reviewId,
          user_id: userId,
          vote_type: voteType,
        });

      if (error) throw error;
    }

    const { error: updateError } = await supabase.rpc(
      voteType === 'helpful' ? 'increment_helpful_count' : 'increment_unhelpful_count',
      { review_id: reviewId }
    );

    if (updateError) throw updateError;

    return { reviewId, voteType };
  }
);


export const searchLocations = createAsyncThunk(
  'locations/searchLocations',
  async ({ query, userLocation }: { query: string; userLocation?: { lat: number; lng: number } }) => {
    if (query.length < 3) {
      return [];
    }

    try {
      const { data: existingLocations, error: dbError } = await supabase
        .rpc('search_locations_with_coords', {
          search_query: query,
          result_limit: 5
        });

      let results: SearchLocation[] = [];

      if (existingLocations && !dbError) {
        results = existingLocations.map((loc: { id: any; name: any; address: any; city: any; state_province: any; latitude: any; longitude: any; place_type: any; }) => ({
          id: loc.id,
          name: loc.name,
          address: `${loc.address}, ${loc.city}, ${loc.state_province}`,
          latitude: loc.latitude,
          longitude: loc.longitude,
          place_type: loc.place_type,
          source: 'database' as const,
        }));
      } else if (dbError) {
        console.error('Database search error:', dbError);
      }

      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
);

export const createLocationFromSearch = createAsyncThunk(
  'locations/createLocationFromSearch',
  async (searchLocation: SearchLocation, { getState, dispatch }) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;

    if (!userId) throw new Error('User must be logged in');

    const { data: existingLocation } = await supabase
      .from('locations')
      .select('id')
      .eq('name', searchLocation.name)
      .ilike('address', `%${searchLocation.address.split(',')[0]}%`)
      .single();

    if (existingLocation) {
      return existingLocation.id;
    }

    const addressParts = searchLocation.address.split(',').map(part => part.trim());
    const streetAddress = addressParts[0] || searchLocation.address;
    const city = addressParts[1] || 'Unknown';
    const stateProvince = addressParts[2] || 'Unknown';
    const country = addressParts[3] || 'US';

    const mappedPlaceType = mapMapboxPlaceType(searchLocation.place_type);

    const locationData = {
      name: searchLocation.name,
      description: null,
      address: streetAddress,
      city: city,
      state_province: stateProvince,
      country: country,
      postal_code: null,
      coordinates: `POINT(${searchLocation.longitude} ${searchLocation.latitude})`,
      place_type: mappedPlaceType,
      tags: null,
      google_place_id: null,
      created_by: userId,
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

    const newLocationWithScores = {
      ...data,
      latitude: searchLocation.latitude,
      longitude: searchLocation.longitude,
      avg_safety_score: null,
      overall_safety_score: null,
      review_count: 0,
      safety_scores: [],
    };

    // Add to Redux state immediately
    return data.id;
  }
);

export const fetchHeatMapData = createAsyncThunk(
  'locations/fetchHeatMapData',
  async ({
    latitude,
    longitude,
    radius = 10000,
    userProfile
  }: {
    latitude: number;
    longitude: number;
    radius?: number;
    userProfile?: any;
  }) => {
    try {
      const { data, error } = await supabase.rpc('get_heatmap_data', {
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
        throw error;
      }
      return data || [];
    } catch (err) {
      throw err;
    }
  }
);

export const fetchSimilarUsers = createAsyncThunk(
  'locations/fetchSimilarUsers',
  async (userId: string) => {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/similarity-calculator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ user_id: userId, limit: 10 }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch similar users');
    }

    const data = await response.json();
    return data.similar_users;
  }
);

// Replace your fetchMLPredictions in locationsSlice.ts:

export const fetchMLPredictions = createAsyncThunk(
  'locations/fetchMLPredictions',
  async (locationId: string, { getState }) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;
    const userProfile = state.user.profile;

    if (!userId) {
      throw new Error('User must be logged in to get ML predictions');
    }

    if (!userProfile) {
      throw new Error('User profile required for ML predictions');
    }

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/safety-predictor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
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

    clearRoutes: (state) => {
      state.routes = [];
      state.selectedRoute = null;
      state.routeAlternatives = [];
      state.routeSafetyAnalysis = null;
      state.routeError = null;
    },
    setSelectedLocation: (state, action: PayloadAction<LocationWithScores | null>) => {
      state.selectedLocation = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<LocationsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
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
    addLocationToNearby: (state, action: PayloadAction<LocationWithScores>) => {

      // Add location to nearby if not already present
      if (!state.nearbyLocations.find(loc => loc.id === action.payload.id)) {
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

      state.dangerZonesVisible = !state.dangerZonesVisible
    },
    setDangerZonesVisible: (state, action: PayloadAction<boolean>) => {
      state.dangerZonesVisible = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
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
      });

    builder
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
      });

    builder
      .addCase(createLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations.push(action.payload);
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create location';
      });

    builder
      .addCase(submitReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.loading = false;
        state.userReviews.unshift(action.payload);
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to submit review';
      });

    builder
      .addCase(updateReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReview.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.userReviews.findIndex(review => review.id === action.payload.id);
        if (index !== -1) {
          state.userReviews[index] = action.payload;
        }
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update review';
      });

    builder
      .addCase(fetchUserReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.userReviews = action.payload;
      })
      .addCase(fetchUserReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user reviews';
      });

    builder
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
      });

    builder
      .addCase(createLocationFromSearch.pending, (state) => {
        state.loading = true;
      })
      .addCase(createLocationFromSearch.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(createLocationFromSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create location';
      });
    builder
      .addCase(fetchHeatMapData.pending, (state) => {
        state.heatMapLoading = true;
      })
      .addCase(fetchHeatMapData.fulfilled, (state, action) => {
        state.heatMapLoading = false;
        state.heatMapData = action.payload;
      })
      .addCase(fetchHeatMapData.rejected, (state) => {
        state.heatMapLoading = false;
        state.heatMapData = [];
      })
    builder
      .addCase(fetchRecentReviews.pending, (state) => {
        state.communityLoading = true;
        state.error = null;
      })
      .addCase(fetchRecentReviews.fulfilled, (state, action) => {
        state.communityLoading = false;
        state.communityReviews = action.payload;
      })
      .addCase(fetchRecentReviews.rejected, (state, action) => {
        state.communityLoading = false;
        state.error = action.error.message || 'Failed to fetch community reviews';
      });
    builder
      .addCase(fetchDangerZones.pending, (state) => {
        state.dangerZonesLoading = true
      })
      .addCase(fetchDangerZones.fulfilled, (state, action) => {
        state.dangerZonesLoading = false
        state.dangerZones = action.payload
      })
      .addCase(fetchDangerZones.rejected, (state, action) => {
        state.dangerZonesLoading = false
        state.dangerZones = []
      })
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
    builder
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
      });
    builder
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
      .addCase(getMapboxRoute.pending, (state) => {
        state.routeLoading = true;
        state.routeError = null;
      })
      .addCase(getMapboxRoute.fulfilled, (state) => {
        state.routeLoading = false;
      })
      .addCase(getMapboxRoute.rejected, (state, action) => {
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
        state.routeError = action.error.message || 'Failed to generate safe route';
      })

      // Generate Route Alternatives
      .addCase(generateRouteAlternatives.pending, (state) => {
        state.routeLoading = true;
      })
      .addCase(generateRouteAlternatives.fulfilled, (state, action) => {
        state.routeLoading = false;
        state.routeAlternatives = action.payload;
      })
      .addCase(generateRouteAlternatives.rejected, (state, action) => {
        state.routeLoading = false;
        state.routeError = action.error.message || 'Failed to generate route alternatives';
      });
  },
});

function determineBestRouteName(safetyAnalysis: RouteSafetyAnalysis): string {
  const { overall_route_score, route_summary } = safetyAnalysis;

  if (overall_route_score >= APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD) {
    return 'Safe Route';
  } else if (overall_route_score >= APP_CONFIG.ROUTE_PLANNING.MIXED_ROUTE_THRESHOLD) {
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
  } else if (safetyAnalysis.overall_route_score >= APP_CONFIG.ROUTE_PLANNING.SAFE_ROUTE_THRESHOLD) {
    return 'balanced';
  } else {
    return 'fastest';
  }
}
export const {
  setSelectedLocation,
  setFilters,
  clearError,
  clearSearchResults,
  setShowSearchResults,
  setUserLocation,
  addLocationToNearby,
  toggleHeatMap,
  setHeatMapVisible,
  toggleDangerZones,
  setDangerZonesVisible,
  setSelectedRoute,
  setRouteRequest,
  toggleRouteSegments,
  setSelectedSegment,
  updateRoutePreferences,
  clearRoutes,
} = locationsSlice.actions;

export default locationsSlice.reducer;