import { createSlice, createAsyncThunk, PayloadAction, Draft } from '@reduxjs/toolkit';
import { supabase } from '../services/supabase';
import { Database } from '../types/database.types';
import { APP_CONFIG } from '@/utils/appConfig';
import { isFieldComplete } from '@/utils/profileValidation';

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

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
    if (!data) {
      throw new Error('Profile not found');
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
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create profile');

      return data;
    }
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
      });
  },
});

export const { setProfile, setOnboardingComplete, clearError } = userSlice.actions;
export default userSlice.reducer;