module.exports = () => {
  const buildVariant = process.env.APP_VARIANT || "development";
  const IS_PREVIEW = buildVariant === "preview";
  const IS_PRODUCTION = buildVariant === "production";

  const appName = IS_PRODUCTION
    ? "SafePath"
    : IS_PREVIEW
    ? "SafePath TEST"
    : "SafePath DEV";

  return {
    expo: {
      name: appName,
      slug: "safepath",
      version: "0.9.25",
      // increase build number!!!
      scheme: "safepath",
      orientation: "portrait",
      icon: "./assets/images/SafePathLogoTransparent1024x1024.png",
      userInterfaceStyle: "light",
      splash: {
        image: "./assets/images/SafePathLogoTransparent1024x1024.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
      ios: {
        buildNumber: "87",
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
        minSdkVersion: 24, // Android 7.0
        targetSdkVersion: 34, // Android 14
        permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
        config: {
          googleMaps: {
            apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
          },
        },
        adaptiveIcon: {
          foregroundImage:
            "./assets/images/SafePathLogoTransparent1024x1024.png",
          backgroundColor: "#FFFFFF",
        },
        package: "com.keradaniel.safepath.app",
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
};
