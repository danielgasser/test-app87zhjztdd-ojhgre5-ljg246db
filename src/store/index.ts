import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import userReducer from './userSlice';
import locationsReducer from './locationsSlice';
import profileBannerReducer from './profileBannerSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    locations: locationsReducer,
    profileBanner: profileBannerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;