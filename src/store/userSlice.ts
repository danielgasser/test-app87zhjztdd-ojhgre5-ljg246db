import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../services/supabase';

export interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  race_ethnicity?: string[];
  gender?: string;
  lgbtq_status?: boolean;
  disability_status?: string[];
  religion?: string;
  age_range?: string;
  privacy_level?: 'public' | 'anonymous' | 'private';
  show_demographics?: boolean;
  total_reviews?: number;
  helpful_votes?: number;
  created_at?: string;
  updated_at?: string;
}

interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  onboardingComplete: boolean;
}

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
  onboardingComplete: false,
};

// Fetch user profile
export const fetchUserProfile = createAsyncThunk(
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

    return data;
  }
);

// Create or update user profile
export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async ({ userId, profileData }: { userId: string; profileData: Partial<UserProfile> }) => {
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
    },
    setOnboardingComplete: (state, action: PayloadAction<boolean>) => {
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
        // Set onboarding complete if profile has basic demographic info
        state.onboardingComplete = !!(
          action.payload?.race_ethnicity?.length ||
          action.payload?.gender ||
          action.payload?.lgbtq_status !== undefined
        );
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
        // Set onboarding complete after successful profile update
        state.onboardingComplete = true;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update profile';
      });
  },
});

export const { setProfile, setOnboardingComplete, clearError } = userSlice.actions;
export default userSlice.reducer;