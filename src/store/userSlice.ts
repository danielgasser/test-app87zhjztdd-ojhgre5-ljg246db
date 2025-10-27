import { createSlice, createAsyncThunk, PayloadAction, Draft } from '@reduxjs/toolkit';
import { supabase } from '../services/supabase';
import { Database } from '../types/database.types';
import { APP_CONFIG } from '@/utils/appConfig';
import { isFieldComplete } from '@/utils/profileValidation';
import { PublicUserProfile, PublicUserReview } from '@/types/supabase';
import { signOut } from './authSlice';

type DatabaseUserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserProfile = Omit<DatabaseUserProfile, 'notification_preferences'> & {
  notification_preferences?: Record<string, any> | null;
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
};

// Fetch user profile
export const fetchUserProfile = createAsyncThunk<UserProfile, string>(
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
      throw new Error('Profile not found');
    }
    return data as UserProfile;
  }
);

// Create or update user profile
export const updateUserProfile = createAsyncThunk<UserProfile, { userId: string; profileData: Partial<UserProfile> }>(
  'user/updateProfile',
  async ({ userId, profileData }): Promise<UserProfile> => {
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
        .update(profileData)
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
          ...profileData,
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
        state.profile = action.payload;
        state.onboardingComplete = isProfileComplete(action.payload);
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
      })
      // Clear user data on logout
      .addCase(signOut.fulfilled, (state) => {
        state.profile = null;
        state.publicReviews = [];
        state.loading = false;
        state.error = null;
        state.onboardingComplete = false;
      });
  },
});

export const { setProfile, setOnboardingComplete, clearError } = userSlice.actions;
export default userSlice.reducer;