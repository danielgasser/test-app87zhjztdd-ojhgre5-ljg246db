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
      version: "0.9.59",
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
        buildNumber: "139",
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
            "SafePath uses your background location to provide turn-by-turn navigation directions and alert you in real-time if community members report safety concerns along your active route.",
          NSLocationWhenInUseUsageDescription:
            "SafePath uses your location to display your position on the map, show safety ratings for nearby areas based on community reviews from people who share your demographics, and calculate safe routes to your destination.",
          NSPhotoLibraryUsageDescription:
            "SafePath uses your photo library to let you select and upload a profile picture that other community members can see.",
        },
      },
      android: {
        versionCode: 8,
        minSdkVersion: 24, // Android 7.0
        targetSdkVersion: 34, // Android 14
        googleServicesFile:
          process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
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
