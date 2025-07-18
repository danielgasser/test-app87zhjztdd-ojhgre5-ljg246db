import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DemographicProfile {
  id: string;
  race?: string[];
  gender?: string;
  lgbtq?: boolean;
  disability?: boolean;
  religion?: string;
  age_group?: string;
}

interface UserState {
  profile: DemographicProfile | null;
  onboardingComplete: boolean;
}

const initialState: UserState = {
  profile: null,
  onboardingComplete: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<DemographicProfile>) => {
      state.profile = action.payload;
    },
    setOnboardingComplete: (state, action: PayloadAction<boolean>) => {
      state.onboardingComplete = action.payload;
    },
  },
});

export const { setProfile, setOnboardingComplete } = userSlice.actions;
export default userSlice.reducer;