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
      version: "0.9.57",
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
        buildNumber: "137",
        supportsTablet: false,
        bundleIdentifier: "com.keradaniel.safepath.app",
        associatedDomains: ["applinks:safepath.app"],
        config: {
          googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
        infoPlist: {
          ITSAppUsesNonExemptEncryption: false,
          UIBackgroundModes: ["location"],
          NSLocationAlwaysAndWhenInUseUsageDescription:
            "SafePath needs your location in the background to provide turn-by-turn navigation and safety alerts.",
          NSLocationWhenInUseUsageDescription:
            "SafePath needs your location to show your position on the map and provide navigation.",
        },
      },
      android: {
        versionCode: 7,
        minSdkVersion: 24, // Android 7.0
        targetSdkVersion: 34, // Android 14
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
        useNextNotificationsApi: true,
        googleServiceFile:
          "safepath-e097a-firebase-adminsdk-fbsvc-dfa14a113a.json",
        permissions: [
          "ACCESS_FINE_LOCATION",
          "ACCESS_COARSE_LOCATION",
          "ACCESS_BACKGROUND_LOCATION",
          "FOREGROUND_SERVICE",
          "FOREGROUND_SERVICE_LOCATION",
        ],
      },
      plugins: [
        "expo-router",
        "expo-secure-store",
        "expo-web-browser",
        [
          "react-native-google-mobile-ads",
          {
            androidAppId: "ca-app-pub-3940256099942544~3347511713",
            iosAppId: "ca-app-pub-3940256099942544~1458002511",
          },
        ],
        [
          "expo-notifications",
          {
            icon: "./assets/images/SafePathLogoTransparent1024x1024.png",
            color: "#2A5C99",
          },
        ],
        [
          "expo-location",
          {
            locationAlwaysAndWhenInUsePermission:
              "SafePath needs your location in the background to provide turn-by-turn navigation and safety alerts.",
            isAndroidBackgroundLocationEnabled: true,
            isAndroidForegroundServiceEnabled: true,
          },
        ],
      ],
      extra: {
        router: {},
        eas: {
          projectId: "667de704-dadd-4f11-b52a-176c9c6e4d9b",
        },
      },
      owner: "toesslab",
      notification: {
        icon: "./assets/images/SafePathLogoTransparent1024x1024.png",
        color: "#2A5C99",
        androidMode: "default",
        androidCollapsedTitle: "SafePath Safety Alert",
      },
    },
  };
};
