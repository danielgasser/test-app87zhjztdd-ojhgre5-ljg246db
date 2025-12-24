import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../services/supabase';
import { Database } from '../types/database.types';
import { APP_CONFIG } from '@/config/appConfig';
import { isFieldComplete } from '@/utils/profileValidation';
import { PublicUserProfile, PublicUserReview } from '@/types/supabase';
import { logger } from '@/utils/logger';
export interface NotificationPreferences {
  safety_alerts?: boolean;
  route_safety_changes?: boolean;
  location_triggers?: boolean;
  time_format?: '12h' | '24h';
  distance_unit?: 'metric' | 'imperial';
}

type DatabaseUserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserProfile = Omit<DatabaseUserProfile, 'notification_preferences' | 'preferences'> & {
  notification_preferences?: NotificationPreferences | null;
  preferences?: {
    search?: {
      radius_km?: number;
    };
  } | null;
};
const isProfileComplete = (profile: UserProfile | null): boolean => {
  if (!profile) return false;

  // Check if mandatory fields are filled
  const mandatoryFields = APP_CONFIG.PROFILE_COMPLETION.MANDATORY_FIELDS;

  return mandatoryFields.every((field) =>
    isFieldComplete(profile[field as keyof UserProfile])
  );
};



interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  onboardingComplete: boolean;
  publicProfile: PublicUserProfile | null;
  publicProfileLoading: boolean;
  publicProfileError: string | null;
  publicReviews: PublicUserReview[];
  publicReviewsLoading: boolean;
  searchRadiusKm: number;
  voteStats: {
    helpful_votes_given: number;
    unhelpful_votes_given: number;
    total_votes_given: number;
  } | null;
  voteStatsLoading: boolean;
}

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
  onboardingComplete: false,
  publicProfile: null,
  publicProfileLoading: false,
  publicProfileError: null,
  publicReviews: [],
  publicReviewsLoading: false,
  searchRadiusKm: APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS / 1000,
  voteStats: null,
  voteStatsLoading: false,
};

// Fetch user profile
export const fetchUserProfile = createAsyncThunk<UserProfile | null, string>(
  'user/fetchProfile',
  async (userId: string) => {

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }
    if (!data) {
      return null;
    }
    return data as UserProfile;
  }
);

// Create or update user profile
export const updateUserProfile = createAsyncThunk<UserProfile, { userId: string; profileData: Partial<UserProfile> }>(
  'user/updateProfile',
  async ({ userId, profileData }): Promise<UserProfile> => {
    const dbProfileData = profileData as any;
    // Check if profile exists

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    let result;

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update(dbProfileData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          ...dbProfileData,
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create profile');
      result = data;
    }

    return result as UserProfile;
  }
);

// Update search radius preference
export const updateSearchRadius = createAsyncThunk<
  UserProfile,
  { userId: string; radiusKm: number }
>(
  'user/updateSearchRadius',
  async ({ userId, radiusKm }: { userId: string; radiusKm: number }): Promise<UserProfile> => {
    try {
      // Clamp the value to min/max
      const clampedRadius = Math.max(
        APP_CONFIG.DISTANCE.MIN_SEARCH_RADIUS_KM,
        Math.min(APP_CONFIG.DISTANCE.MAX_SEARCH_RADIUS_KM, radiusKm)
      );

      // Get current preferences
      const { data: currentProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Merge with existing preferences
      const currentPreferences = (currentProfile?.preferences as any) || {};
      const updatedPreferences = {
        ...currentPreferences,
        search: {
          ...(currentPreferences.search || {}),
          radius_km: clampedRadius,
        },
      };

      // Update in database
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ preferences: updatedPreferences })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update preferences');

      //   notify.info(`Search radius updated to ${clampedRadius}km`);
      return data as UserProfile;
    } catch (error) {
      logger.error('❌ Failed to update search radius:', error);
      throw error;
    }
  }
);

export const fetchUserVoteStats = createAsyncThunk(
  'user/fetchVoteStats',
  async (userId: string) => {
    const { data, error } = await supabase.rpc('get_user_vote_stats', {
      p_user_id: userId,
    });

    if (error) throw error;
    if (data && data.length > 0) {
      return data[0];
    }
    return { helpful_votes_given: 0, unhelpful_votes_given: 0, total_votes_given: 0 };
  }
);

// Fetch public user profile (for viewing other users' profiles)
export const fetchPublicUserProfile = createAsyncThunk<PublicUserProfile, string>(
  'user/fetchPublicProfile',
  async (userId: string) => {
    const { data, error } = await supabase
      .rpc('get_user_public_profile', { profile_user_id: userId });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Profile not found');
    }

    // Return the first result (RPC returns array)
    return data[0] as PublicUserProfile;
  }
);

// Fetch public user reviews (for viewing other users' reviews)
export const fetchPublicUserReviews = createAsyncThunk<PublicUserReview[], string>(
  'user/fetchPublicReviews',
  async (userId: string) => {
    const { data, error } = await supabase
      .rpc('get_user_public_reviews', {
        profile_user_id: userId,
        review_limit: 10
      });

    if (error) {
      throw error;
    }

    return (data || []) as PublicUserReview[];
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    setOnboardingComplete: (state, action) => {
      state.onboardingComplete = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setSearchRadius: (state, action: PayloadAction<number>) => {
      state.searchRadiusKm = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload === null) {
          // New user with no profile yet - set defaults
          state.profile = null;
          state.onboardingComplete = false;
          state.searchRadiusKm = APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS / 1000;
          return;
        }
        state.profile = action.payload;
        state.onboardingComplete = isProfileComplete(action.payload);
        const preferences = action.payload.preferences as any;
        if (preferences?.search?.radius_km) {
          state.searchRadiusKm = preferences.search.radius_km;
        } else {
          state.searchRadiusKm = APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS / 1000;
        }
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch profile';
      })
      // Update user profile
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.onboardingComplete = isProfileComplete(action.payload);
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update profile';
      })
      // Update search radius
      .addCase(updateSearchRadius.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSearchRadius.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;

        // Update cached radius
        const preferences = action.payload.preferences as any;
        if (preferences?.search?.radius_km) {
          state.searchRadiusKm = preferences.search.radius_km;
        }
      })
      .addCase(updateSearchRadius.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update search radius';
      })
      .addCase(fetchUserVoteStats.pending, (state) => {
        state.voteStatsLoading = true;
      })
      .addCase(fetchUserVoteStats.fulfilled, (state, action) => {
        state.voteStats = action.payload;
        state.voteStatsLoading = false;
      })
      .addCase(fetchUserVoteStats.rejected, (state) => {
        state.voteStatsLoading = false;
      })
      // Fetch public user profile
      .addCase(fetchPublicUserProfile.pending, (state) => {
        state.publicProfileLoading = true;
        state.publicProfileError = null;
      })
      .addCase(fetchPublicUserProfile.fulfilled, (state, action: PayloadAction<PublicUserProfile>) => {
        state.publicProfileLoading = false;
        state.publicProfile = action.payload;
        state.publicProfileError = null;
      })
      .addCase(fetchPublicUserProfile.rejected, (state, action) => {
        state.publicProfileLoading = false;
        state.publicProfileError = action.error.message || 'Failed to fetch public profile';
      })
      // Fetch public user reviews
      .addCase(fetchPublicUserReviews.pending, (state) => {
        state.publicReviewsLoading = true;
      })
      .addCase(fetchPublicUserReviews.fulfilled, (state, action: PayloadAction<PublicUserReview[]>) => {
        state.publicReviewsLoading = false;
        state.publicReviews = action.payload;
      })
      .addCase(fetchPublicUserReviews.rejected, (state) => {
        state.publicReviewsLoading = false;
        state.publicReviews = [];
      });

  },
});

export const { setProfile, setOnboardingComplete, clearError, setSearchRadius } = userSlice.actions;
export default userSlice.reducer;