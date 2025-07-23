import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { signOut } from "src/store/authSlice";
import { router } from "expo-router";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { fetchUserProfile } from "src/store/userSlice";

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { profile, loading } = useAppSelector((state) => state.user);

  const handleLogout = () => {
    dispatch(signOut());
  };

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserProfile(user.id));
    }
  }, [user?.id, dispatch]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="account-circle" size={80} color="#007AFF" />
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Demographics</Text>
        {profile ? (
          <View style={styles.demographicsCard}>
            {profile.race_ethnicity && profile.race_ethnicity.length > 0 && (
              <Text style={styles.demographicText}>
                Race/Ethnicity: {profile.race_ethnicity.join(", ")}
              </Text>
            )}
            {profile.gender && (
              <Text style={styles.demographicText}>
                Gender: {profile.gender}
              </Text>
            )}
            {profile.lgbtq_status && (
              <Text style={styles.demographicText}>LGBTQ+: Yes</Text>
            )}
            {profile.religion && (
              <Text style={styles.demographicText}>
                Religion: {profile.religion}
              </Text>
            )}
            {profile.age_range && (
              <Text style={styles.demographicText}>
                Age: {profile.age_range}
              </Text>
            )}

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push("/onboarding")}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => router.push("/onboarding")}
          >
            <Text style={styles.setupButtonText}>Set up profile</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="notifications" size={24} color="#333" />
          <Text style={styles.menuText}>Notifications</Text>
          <MaterialIcons name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="privacy-tip" size={24} color="#333" />
          <Text style={styles.menuText}>Privacy</Text>
          <MaterialIcons name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  editButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#007AFF",
    borderRadius: 6,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
  },
  email: {
    fontSize: 18,
    color: "#333",
    marginTop: 10,
  },
  section: {
    marginTop: 20,
    backgroundColor: "#fff",
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  demographicsCard: {
    marginHorizontal: 20,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  demographicText: {
    fontSize: 16,
    color: "#666",
  },
  setupButton: {
    marginHorizontal: 20,
    padding: 15,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
  },
  setupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 15,
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    backgroundColor: "#ff3b30",
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
