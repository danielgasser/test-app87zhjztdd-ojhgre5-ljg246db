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
    radius: 5000, // 5km default
  },
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
    // Fetch location with safety scores
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select(`
        *,
        safety_scores (*)
      `)
      .eq('id', locationId)
      .single();

    if (locationError) throw locationError;

    // Calculate overall safety score
    const overallScore = location.safety_scores?.find(
      (score: any) => score.demographic_type === 'overall'
    );

    return {
      ...location,
      overall_safety_score: overallScore?.avg_safety_score || null,
      review_count: overallScore?.review_count || 0,
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
  },
});

export const { setSelectedLocation, setFilters, clearError } = locationsSlice.actions;
export default locationsSlice.reducer;