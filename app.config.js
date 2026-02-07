module.exports = () => {
  const appName = "TruGuide";

  return {
    expo: {
      name: appName,
      slug: "safepath",
      version: "0.9.59",
      // increase build number!!!
      scheme: "safepath",
      orientation: "portrait",
      icon: "./assets/images/TruGuideLogoTransparent1024x1024.png",
      userInterfaceStyle: "light",
      splash: {
        image: "./assets/images/TruGuideLogoTransparent1024x1024.png",
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
          NSLocationWhenInUseUsageDescription:
            "TruGuide uses your location to provide safety-optimized navigation and show nearby places with demographic-specific safety ratings. For example, we'll show you gas stations rated safe by travelers like you.",
          NSLocationAlwaysUsageDescription:
            "TruGuide uses your location to provide real-time safety alerts during navigation and notify you when dangerous reviews are posted near your active route.",
          NSPhotoLibraryUsageDescription:
            "TruGuide accesses your photos to let you add a profile picture and attach photos to your location reviews to help other travelers.",
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
            "./assets/images/TruGuideLogoTransparent1024x1024.png",
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
            icon: "./assets/images/TruGuideLogoTransparent1024x1024.png",
            color: "#2A5C99",
          },
        ],
        [
          "expo-location",
          {
            locationAlwaysAndWhenInUsePermission:
              "TruGuide needs your location in the background to provide turn-by-turn navigation and safety alerts.",
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
        icon: "./assets/images/TruGuideLogoTransparent1024x1024.png",
        color: "#2A5C99",
        androidMode: "default",
        androidCollapsedTitle: "TruGuide Safety Alert",
      },
    },
  };
};
