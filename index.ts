import 'expo-router/entry';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from 'src/store/authSlice';
import userReducer from 'src/store/userSlice';
// In your app, run this once to reset:
import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.removeItem('hasLaunched');
export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;