import { Platform } from "react-native";

export function getGoogleApiKey(): string | undefined {
    return Platform.select({
        ios: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS,
        android: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID,
        default: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID,
    });
}