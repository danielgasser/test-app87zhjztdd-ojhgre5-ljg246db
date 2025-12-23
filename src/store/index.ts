import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import locationsReducer from './locationsSlice';
import profileBannerReducer from './profileBannerSlice';
import premiumPromptReducer from "./premiumPromptSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    locations: locationsReducer,
    profileBanner: profileBannerReducer,
    premiumPrompt: premiumPromptReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;