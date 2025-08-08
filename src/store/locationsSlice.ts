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
    radius: 5000,
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
};

export const fetchNearbyLocations = createAsyncThunk(
  'locations/fetchNearby',
  async ({ latitude, longitude, radius = 5000 }: Coordinates & { radius?: number }, { getState }) => {
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
        console.log('fetchDangerZones called with userId:', userId);
  const supabaseUrl = (supabase as any).supabaseUrl
    const supabaseAnonKey = (supabase as any).supabaseKey
    
    console.log('Calling danger-zones API...');
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
    console.log('API Response status:', response.status);

    if (!response.ok) {
      const error = await response.json()
      console.error('API Error:', error);
      throw new Error('Failed to fetch danger zones')
    }

    const data: DangerZonesResponse = await response.json()
      console.log('Danger zones received:', data);
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

const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
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
        console.log('Redux: toggling danger zones from', state.dangerZonesVisible, 'to', !state.dangerZonesVisible);

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
     console.log('fetchDangerZones.pending');
 state.dangerZonesLoading = true
  })
  .addCase(fetchDangerZones.fulfilled, (state, action) => {
    console.log('fetchDangerZones.fulfilled with data:', action.payload);
  state.dangerZonesLoading = false
    state.dangerZones = action.payload
  })
  .addCase(fetchDangerZones.rejected, (state, action) => {
     console.error('fetchDangerZones.rejected:', action.error);
 state.dangerZonesLoading = false
    state.dangerZones = []
  })
  },
});

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
} = locationsSlice.actions;

export default locationsSlice.reducer;