import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "src/styles/theme";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchUserProfile } from "@/store/userSlice";
import { RootState } from "@/store";
import { View, Text, StyleSheet, Platform } from "react-native";
import * as ExpoConstants from "expo-constants";
const appConfig = require("../../app.config.js");

export default function TabLayout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.auth.user);

  console.log(
    "APP version:",
    appConfig.expo?.version,
    "Platform:",
    Platform.OS
  );

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserProfile(user.id));
    }
  }, [user, dispatch]);

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
      </Tabs>
      <View style={styles.versionFooter}>
        <Text style={styles.versionText}>
          v{appConfig.expo?.version || "1.3.2"}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  versionFooter: {
    position: "absolute",
    bottom: 8,
    left: 40,
    right: 0,
    alignItems: "flex-start",
    pointerEvents: "none",
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.primary,
    opacity: 0.4,
  },
});
