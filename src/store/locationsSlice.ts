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
import { ReactNode } from 'react';

// ================================
// INTERFACES AND TYPES
// ================================

interface SearchLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  source?: 'database' | 'mapbox';
}

interface HeatMapPoint {
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
  predicted_safety: number;
  confidence: number;
  similar_users_count: number;
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
  heatMapData: HeatMapPoint[];
  heatMapVisible: boolean;
  heatMapLoading: boolean;
  communityReviews: CommunityReview[];
  communityLoading: boolean;
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
    safetyPriority: 'balanced',
    avoidEveningDanger: true,
    maxDetourMinutes: 15,
  },
};

// ================================
// ASYNC THUNKS - EXISTING ONES
// ================================

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
  'locations/fetchLocationDetails',
  async (locationId: string) => {
    const { data, error } = await supabase.rpc('get_location_with_scores', {
      location_id: locationId,
    });

    if (error) {
      console.error('Error fetching location details:', error);
      throw error;
    }

    return data;
  }
);

export const createLocation = createAsyncThunk(
  'locations/createLocation',
  async (locationData: CreateLocationForm) => {
    const { data, error } = await supabase.from('locations').insert(locationData).select().single();

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
    const { data, error } = await supabase.from('reviews').insert(reviewData).select().single();

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
  async ({ query, latitude, longitude }: { query: string; latitude?: number; longitude?: number }) => {
    if (query.trim().length < 2) {
      return [];
    }

    try {
      const { data: dbResults, error: dbError } = await supabase
        .from('locations')
        .select('*')
        .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
        .eq('active', true)
        .limit(5);

      if (dbError) {
        console.error('Database search error:', dbError);
      }

      const searchResults: SearchLocation[] = (dbResults || []).map(location => ({
        id: location.id,
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        place_type: location.place_type,
        source: 'database' as const,
      }));

      const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
      if (mapboxToken && searchResults.length < 5) {
        try {
          const proximity = latitude && longitude ? `${longitude},${latitude}` : '';
          const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=${5 - searchResults.length}&proximity=${proximity}`;

          const mapboxResponse = await fetch(mapboxUrl);
          const mapboxData = await mapboxResponse.json();

          if (mapboxData.features) {
            mapboxData.features.forEach((feature: any) => {
              searchResults.push({
                id: feature.id,
                name: feature.place_name.split(',')[0],
                address: feature.place_name,
                latitude: feature.center[1],
                longitude: feature.center[0],
                place_type: feature.place_type?.[0],
                source: 'mapbox' as const,
              });
            });
          }
        } catch (mapboxError) {
          console.error('Mapbox search error:', mapboxError);
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
      const { data, error } = await supabase.rpc('', {
        user_lat: latitude,
        user_lng: longitude,
        radius_meters: radius,
      });

      if (error) {
        console.error('Error fetching heat map data:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      const heatMapPoints: HeatMapPoint[] = data.map((location: any) => ({
        latitude: location.latitude,
        longitude: location.longitude,
        weight: Math.max(0.1, Math.min(1.0, (location.overall_safety_score || 3) / 5)),
        safety_score: location.overall_safety_score || 3,
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
  async (limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          user_id,
          location_id,
          safety_rating,
          overall_rating,
          comment,
          created_at,
          user_profiles!inner (
            race_ethnicity,
            gender,
            lgbtq_status
          ),
          locations!inner (
            name
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent reviews:', error);
        throw error;
      }

      return (data || []).map(review => ({
        id: review.id,
        user_id: review.user_id,
        location_id: review.location_id,
        location_name: Array.isArray(review.locations) && review.locations.length > 0 ? review.locations[0].name : 'Unknown Location',
        safety_rating: review.safety_rating,
        overall_rating: review.overall_rating,
        comment: review.comment,
        created_at: review.created_at,
        user_demographics: {
          race_ethnicity: Array.isArray(review.user_profiles) && review.user_profiles.length > 0 ? review.user_profiles[0].race_ethnicity : undefined,
          gender: Array.isArray(review.user_profiles) && review.user_profiles.length > 0 ? review.user_profiles[0].gender : undefined,
          lgbtq_status: Array.isArray(review.user_profiles) && review.user_profiles.length > 0 ? review.user_profiles[0].lgbtq_status : undefined,
        },
      }));
    } catch (error) {
      console.error('Recent reviews fetch error:', error);
      throw error;
    }
  }
);

export const fetchDangerZones = createAsyncThunk(
  'locations/fetchDangerZones',
  async ({
    latitude,
    longitude,
    radius = 10000,
    userDemographics
  }: {
    latitude: number;
    longitude: number;
    radius?: number;
    userDemographics?: any;
  }) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/danger-zones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          latitude,
          longitude,
          radius_miles: radius / 1609.34,
          user_demographics: userDemographics
        })
      });

      if (!response.ok) {
        console.error('Danger zones API error:', response.status);
        return [];
      }

      const data: DangerZonesResponse = await response.json();
      return data.zones || [];
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
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/similarity-calculator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
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

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/safety-predictor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
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
    console.log('🔍 Calculating route safety scores...');

    // Try the route-safety-scorer Edge Function first
    try {
      const { data, error } = await supabase.functions.invoke('route-safety-scorer', {
        body: payload
      });

      if (error) {
        console.warn('❌ Route safety scorer failed, using fallback method:', error);
        throw error;
      }

      console.log('✅ Route safety analysis complete:', data);
      return data as RouteSafetyAnalysis;
    } catch (error) {
      // Fallback to simplified safety analysis
      console.log('🔄 Using fallback route safety analysis...');

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
          const safetyResponse = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/safety-predictor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
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

export const getMapboxRoute = createAsyncThunk(
  'locations/getMapboxRoute',
  async (payload: {
    origin: RouteCoordinate;
    destination: RouteCoordinate;
    waypoints?: RouteCoordinate[];
    profile?: string;
  }) => {
    const { origin, destination, waypoints, profile = 'driving' } = payload;

    const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      throw new Error('Mapbox token not configured');
    }

    // Build coordinates string
    let coordinates = `${origin.longitude},${origin.latitude}`;

    // Add waypoints if provided
    if (waypoints && waypoints.length > 0) {
      waypoints.forEach(waypoint => {
        coordinates += `;${waypoint.longitude},${waypoint.latitude}`;
      });
    }

    coordinates += `;${destination.longitude},${destination.latitude}`;

    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?` +
      new URLSearchParams({
        access_token: mapboxToken,
        alternatives: 'true',
        geometries: 'geojson',
        steps: 'false',
        overview: 'full'
      });

    console.log('🗺️ Calling Mapbox Directions API...');

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Mapbox API Error:', response.status, errorText);
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(`No routes found: ${data.code}`);
    }

    console.log(`✅ Got ${data.routes.length} route(s) from Mapbox`);
    return data.routes;
  }
);

export const generateSafeRoute = createAsyncThunk(
  'locations/generateSafeRoute',
  async (routeRequest: RouteRequest, { rejectWithValue, dispatch }) => {
    try {
      console.log('🚀 Starting safe route generation...');

      // Step 1: Get route from Mapbox
      const mapboxRoutes = await dispatch(getMapboxRoute({
        origin: routeRequest.origin,
        destination: routeRequest.destination,
        profile: 'driving'
      })).unwrap();

      if (!mapboxRoutes || mapboxRoutes.length === 0) {
        throw new Error('No routes found from Mapbox');
      }

      const primaryRoute = mapboxRoutes[0];
      console.log(`🗺️ Got primary route: ${Math.round(primaryRoute.duration / 60)} min, ${Math.round(primaryRoute.distance / 1000)} km`);

      // Step 2: Convert coordinates for safety analysis
      const routeCoordinates: RouteCoordinate[] = primaryRoute.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng
        })
      );

      // Step 3: Calculate route safety
      console.log('🔍 Analyzing route safety...');
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

      console.log(`✅ Generated route: ${safeRoute.name} (${safeRoute.estimated_duration_minutes} min, Safety: ${safetyAnalysis.overall_route_score.toFixed(1)})`);

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

export const generateRouteAlternatives = createAsyncThunk(
  'locations/generateRouteAlternatives',
  async (routeRequest: RouteRequest, { rejectWithValue, dispatch }) => {
    try {
      console.log('🔄 Generating route alternatives...');

      // Get Mapbox routes (with alternatives)
      const mapboxRoutes = await dispatch(getMapboxRoute({
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
          console.log(`🔍 Analyzing alternative route ${i}...`);

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

      console.log(`✅ Generated ${alternatives.length} alternative routes`);
      return alternatives;

    } catch (error) {
      console.error('❌ Alternative route generation failed:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to generate alternatives');
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

    clearRoutes: (state) => {
      state.routes = [];
      state.selectedRoute = null;
      state.routeAlternatives = [];
      state.routeSafetyAnalysis = null;
      state.routeError = null;
      state.routeRequest = null;
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
      state.dangerZonesVisible = !state.dangerZonesVisible;
    },

    setDangerZonesVisible: (state, action: PayloadAction<boolean>) => {
      state.dangerZonesVisible = action.payload;
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
        state.locations.push(action.payload);
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
        state.userReviews.unshift(action.payload);
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
          state.userReviews[index] = action.payload;
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
        state.userReviews = action.payload;
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

      // Heat Map Data
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

      // Recent Reviews
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
      });
  },
});

// ================================
// EXPORTS
// ================================

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