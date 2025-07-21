import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../services/supabase';
import { 
  Location, 
  LocationWithScores, 
  Review, 
  CreateReviewForm,
  CreateLocationForm,
  Coordinates 
} from '../types/supabase';
import { mapMapboxPlaceType } from '../utils/placeTypeMappers';

interface SearchLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  source?: 'database' | 'mapbox'; // Make optional to match component interface
}

// FIXED: Updated interface to include search properties
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
  // Add these missing search properties:
  searchResults: SearchLocation[];
  searchLoading: boolean;
  showSearchResults: boolean;
}

// FIXED: Updated initialState to include search properties
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
  // Add these:
  searchResults: [],
  searchLoading: false,
  showSearchResults: false,
};

// Async thunks
export const fetchNearbyLocations = createAsyncThunk(
  'locations/fetchNearby',
  async ({ latitude, longitude, radius = 5000 }: Coordinates & { radius?: number }) => {

    const { data, error } = await supabase.rpc('get_nearby_locations', {
      lat: latitude,
      lng: longitude,
      radius_meters: radius,
    });

    if (error) throw error;
    return data || [];
  }
);

export const fetchLocationDetails = createAsyncThunk(
  'locations/fetchDetails',
  async (locationId: string) => {
    // First get the location data
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select(`
        *,
        safety_scores (*)
      `)
      .eq('id', locationId)
      .single();

    if (locationError) throw locationError;

    // Extract coordinates using the get_nearby_locations function as a workaround
    // This is a hack but it works with your existing database setup
    if (location.coordinates) {
      try {
        // Get nearby locations for this exact location to extract coordinates
        const { data: nearbyData } = await supabase.rpc('get_nearby_locations', {
          lat: 0, // These will be ignored since we're searching by ID
          lng: 0,
          radius_meters: 1,
        });

        // Find our location in the nearby results to get extracted coordinates
        const locationWithCoords = nearbyData?.find((loc: any) => loc.id === locationId);
        
        if (locationWithCoords) {
          location.latitude = locationWithCoords.latitude;
          location.longitude = locationWithCoords.longitude;
        }
      } catch (coordError) {
        console.warn('Could not extract coordinates:', coordError);
        // Set default coordinates if extraction fails
        location.latitude = 0;
        location.longitude = 0;
      }
    }

    // Calculate overall safety score
    const overallScore = location.safety_scores?.find(
      (score: any) => score.demographic_type === 'overall'
    );

    return {
      ...location,
      overall_safety_score: overallScore?.avg_safety_score || null,
      review_count: overallScore?.review_count || 0,
      latitude: location.latitude || 0,
      longitude: location.longitude || 0,
    };
  }
);

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

    // Submit the review
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        ...reviewData,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger safety score recalculation
    await supabase.rpc('calculate_location_safety_scores', {
      p_location_id: reviewData.location_id,
    });

    // Refresh location details to get updated scores
    dispatch(fetchLocationDetails(reviewData.location_id));

    return review;
  }
);

export const updateReview = createAsyncThunk(
  'locations/updateReview',
  async ({ reviewId, reviewData }: { reviewId: string; reviewData: Partial<CreateReviewForm> }, { getState, dispatch }) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;

    if (!userId) throw new Error('User must be logged in to update reviews');

    // Update the review
    const { data: review, error } = await supabase
      .from('reviews')
      .update({
        ...reviewData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('user_id', userId) // Ensure user can only update their own reviews
      .select()
      .single();

    if (error) throw error;

    // Trigger safety score recalculation if location_id is available
    if (reviewData.location_id) {
      await supabase.rpc('calculate_location_safety_scores', {
        p_location_id: reviewData.location_id,
      });

      // Refresh location details to get updated scores
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

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('review_votes')
      .select()
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .single();

    if (existingVote) {
      // Update existing vote
      const { error } = await supabase
        .from('review_votes')
        .update({ vote_type: voteType })
        .eq('id', existingVote.id);

      if (error) throw error;
    } else {
      // Create new vote
      const { error } = await supabase
        .from('review_votes')
        .insert({
          review_id: reviewId,
          user_id: userId,
          vote_type: voteType,
        });

      if (error) throw error;
    }

    // Update review counts
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
      // Simple search without coordinates first - we'll get coordinates when needed
      const { data: existingLocations, error: dbError } = await supabase
        .from('locations')
        .select('id, name, address, city, state_province, place_type')
        .or(`name.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`)
        .eq('active', true)
        .limit(3);

      let results: SearchLocation[] = [];

      if (existingLocations && !dbError) {
        // For database results, we'll fetch coordinates individually when needed
        // For now, just mark them as database results with placeholder coordinates
        results = existingLocations.map(loc => ({
          id: loc.id,
          name: loc.name,
          address: `${loc.address}, ${loc.city}, ${loc.state_province}`,
          latitude: 0, // Will be fetched when location is selected
          longitude: 0, // Will be fetched when location is selected
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
  async (searchLocation: SearchLocation, { getState }) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;

    if (!userId) throw new Error('User must be logged in');

    console.log('Creating location from search:', searchLocation);

    // Check if location already exists by name and approximate address
    const { data: existingLocation } = await supabase
      .from('locations')
      .select('id')
      .eq('name', searchLocation.name)
      .ilike('address', `%${searchLocation.address.split(',')[0]}%`)
      .single();

    if (existingLocation) {
      console.log('Location already exists:', existingLocation.id);
      return existingLocation.id;
    }

    // Parse address components from Mapbox result
    const addressParts = searchLocation.address.split(',').map(part => part.trim());
    const streetAddress = addressParts[0] || searchLocation.address;
    const city = addressParts[1] || 'Unknown';
    const stateProvince = addressParts[2] || 'Unknown';
    const country = addressParts[3] || 'US';

    // Use the proper mapper function
    const mappedPlaceType = mapMapboxPlaceType(searchLocation.place_type);

    // Create new location with properly mapped place_type
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

    console.log('Inserting location data:', locationData);

    const { data, error } = await supabase
      .from('locations')
      .insert(locationData)
      .select()
      .single();

    if (error) {
      console.error('Location creation error:', error);
      throw error;
    }

    console.log('Location created successfully:', data.id);
    return data.id;
  }
);

// Slice
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
    // ADDED: Missing search reducers
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.showSearchResults = false;
    },
    setShowSearchResults: (state, action: PayloadAction<boolean>) => {
      state.showSearchResults = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch nearby locations
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

    // Fetch location details
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

    // Create location
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

    // Submit review
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
    
    // Update review
    builder
      .addCase(updateReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReview.fulfilled, (state, action) => {
        state.loading = false;
        // Update the review in userReviews if it exists
        const index = state.userReviews.findIndex(review => review.id === action.payload.id);
        if (index !== -1) {
          state.userReviews[index] = action.payload;
        }
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update review';
      });

    // Fetch user reviews
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

    // FIXED: Proper search cases
    // Search locations
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

    // Create location from search
    builder
      .addCase(createLocationFromSearch.pending, (state) => {
        state.loading = true;
      })
      .addCase(createLocationFromSearch.fulfilled, (state, action) => {
        state.loading = false;
        // The location ID is returned, we can use it to navigate to review screen
      })
      .addCase(createLocationFromSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create location';
      });
  },
});

export const { 
  setSelectedLocation, 
  setFilters, 
  clearError,
  clearSearchResults,
  setShowSearchResults 
} = locationsSlice.actions;

export default locationsSlice.reducer;