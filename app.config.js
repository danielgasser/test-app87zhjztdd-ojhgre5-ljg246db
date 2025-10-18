module.exports = {
  expo: {
    name: "SafePath",
    slug: "safepath",
    version: "1.4.9-dev",
    scheme: "safepath",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.keradaniel.safepath.app",
      associatedDomains: ["applinks:safepath.app"],
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      minSdkVersion: 31, // Android 12
      targetSdkVersion: 34, // Android 14
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#FFFFFF",
      },
      package: "com.safepath.app",
    },
    plugins: ["expo-router", "expo-secure-store"],
    extra: {
      router: {},
      eas: {
        projectId: "667de704-dadd-4f11-b52a-176c9c6e4d9b",
      },
    },
    owner: "toesslab",
  },
};
