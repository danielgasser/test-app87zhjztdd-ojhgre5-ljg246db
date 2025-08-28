console.log("🔍 Testing index import...");
try {
  const IndexComponent = require("./index");
  console.log("✅ Index import successful:", typeof IndexComponent.default);
} catch (error) {
  console.log("❌ Full error:", error);
}
import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "src/styles/theme";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchUserProfile } from "@/store/userSlice";

export default function TabLayout() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserProfile(user.id));
    }
  }, [user, dispatch]);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
        },
        headerStyle: {
          backgroundColor: theme.colors.secondary,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
