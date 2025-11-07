import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "src/styles/theme";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchUserProfile } from "@/store/userSlice";
import { RootState } from "@/store";
import { View, Text, StyleSheet, Platform } from "react-native";
import { supabase } from "@/services/supabase";
const getAppConfig = require("../../app.config.js");
const appConfig = getAppConfig();
import Constants from "expo-constants";
console.log("Constants:", Constants);
console.log("Constants.expoConfig:", Constants.expoConfig);
console.log("Constants.manifest:", Constants.manifest);
console.log("Constants.manifest2:", Constants.manifest2);

export default function TabLayout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.auth.user);

  console.log(
    "APP:",
    appConfig.expo?.name +
      " version: " +
      appConfig.expo?.version +
      " (" +
      appConfig.expo?.ios.buildNumber +
      ") ",
    "Platform:",
    Platform.OS,
    " v: ",
    Platform.Version
  );

  useEffect(() => {
    const checkAndFetchProfile = async () => {
      if (!user?.id) return;

      // Check if onboarding is complete before fetching user_profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();

      // Only fetch user_profiles if onboarding is complete
      if (profile?.onboarding_complete) {
        dispatch(fetchUserProfile(user.id));
      }
    };

    checkAndFetchProfile();
  }, [user?.id, dispatch]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textLight,
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopWidth: 1,
            borderTopColor: theme.colors.separator,
          },
          tabBarLabelStyle: {
            fontSize: 16,
            fontWeight: "600",
          },
          headerStyle: {
            backgroundColor: theme.colors.secondary,
          },
          headerTintColor: theme.colors.textOnPrimary,
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 22,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Map",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="map" size={32} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Community",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="people" size={32} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="person" size={32} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="debug"
          options={{
            href: null, // Hide from tab bar
            title: "Debug",
          }}
        />
      </Tabs>
      <View style={styles.versionFooter}>
        <Text style={styles.versionText}>
          {`${Constants.expoConfig?.name} version: ${
            Constants.expoConfig?.version
          } (${
            Platform.OS === "ios"
              ? Constants.expoConfig?.ios?.buildNumber
              : Constants.expoConfig?.android?.versionCode
          }) Platform: ${Platform.OS} v: ${Platform.Version}`}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  versionFooter: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderDark,
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    opacity: 0.6,
    marginTop: 1,
  },
});
