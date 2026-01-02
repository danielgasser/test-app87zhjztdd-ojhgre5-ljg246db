/**
 * Debug Screen
 *
 * Only accessible to authorized users (by email)
 * Shows:
 * - Cache statistics and savings
 * - API usage metrics
 * - System information
 * - User information
 * - Quick actions (clear cache, test notifications, etc.)
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { locationCache } from "@/services/locationCache";
import { theme } from "@/styles/theme";
import { APP_CONFIG } from "@/config/appConfig";
import * as Device from "expo-device";
import * as Application from "expo-application";
import { notify } from "@/utils/notificationService";
import { useAuth } from "@/providers/AuthProvider";
import { commonStyles } from "@/styles/common";

const appConfig = require("../../app.config.js");

export default function DebugScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [cacheStats, setCacheStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is authorized
  const isAuthorized =
    user?.email && APP_CONFIG.DEBUG.AUTHORIZED_EMAILS.includes(user.email);

  useEffect(() => {
    if (!isAuthorized) {
      notify.error("Access denied");
      router.back();
      return;
    }
    loadDebugData();
  }, [isAuthorized]);

  const loadDebugData = async () => {
    const stats = await locationCache.getStats();
    setCacheStats(stats);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDebugData();
    setRefreshing(false);
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "Are you sure you want to clear all cached location data?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await locationCache.clearCache();
            await loadDebugData();
            notify.success("Cache cleared successfully");
          },
        },
      ]
    );
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <SafeAreaView style={commonStyles.container} edges={["top"]}>
      <View style={commonStyles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[commonStyles.primaryButton, commonStyles.backButton]}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.textOnPrimary}
          />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>🐛 Debug Console</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Cache Statistics */}
        <View style={styles.section}>
          <Text style={commonStyles.sectionTitle}>📦 Cache Statistics</Text>
          {cacheStats ? (
            <View style={commonStyles.cardBordered}>
              <InfoRow
                label="Hit Rate"
                value={`${cacheStats.hitRate}%`}
                valueColor={
                  cacheStats.hitRate > 30
                    ? theme.colors.success
                    : theme.colors.warning
                }
              />
              <InfoRow label="Cache Hits" value={cacheStats.stats.hits} />
              <InfoRow label="Cache Misses" value={cacheStats.stats.misses} />
              <InfoRow
                label="Cost Saved"
                value={`$${cacheStats.stats.cost_saved.toFixed(4)}`}
                valueColor={theme.colors.success}
              />
              <InfoRow
                label="Est. Monthly Savings"
                value={`$${cacheStats.monthlySavings.toFixed(2)}`}
                valueColor={theme.colors.success}
              />
            </View>
          ) : (
            <Text style={commonStyles.loadingText}>Loading...</Text>
          )}
        </View>

        {/* System Information */}
        <View style={styles.section}>
          <Text style={commonStyles.sectionTitle}>📱 System Information</Text>
          <View style={commonStyles.cardBordered}>
            <InfoRow
              label="App Version"
              value={appConfig.expo?.version || "1.3.2"}
            />
            <InfoRow
              label="Build Number"
              value={Application.nativeBuildVersion || "N/A"}
            />
            <InfoRow label="Platform" value={Platform.OS} />
            <InfoRow
              label="OS Version"
              value={Platform.Version?.toString() || "N/A"}
            />
            <InfoRow label="Device" value={Device.modelName || "Unknown"} />
            <InfoRow label="Brand" value={Device.brand || "Unknown"} />
          </View>
        </View>

        {/* Environment */}
        <View style={styles.section}>
          <Text style={commonStyles.sectionTitle}>⚙️ Environment</Text>
          <View style={commonStyles.cardBordered}>
            <InfoRow
              label="Supabase URL"
              value={
                process.env.EXPO_PUBLIC_SUPABASE_URL?.substring(0, 30) +
                  "..." || "Not set"
              }
            />
            <InfoRow
              label="Google Maps API"
              value={
                process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
                  ? "✅ Configured"
                  : "❌ Not set"
              }
            />
            <InfoRow
              label="ENV"
              value={__DEV__ ? "🔧 Development" : "🚀 Production"}
            />
          </View>
        </View>

        {/* App Configuration */}
        <View style={styles.section}>
          <Text style={commonStyles.sectionTitle}>🔧 App Configuration</Text>
          <View style={commonStyles.cardBordered}>
            <InfoRow
              label="Default Search Radius"
              value={`${
                APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS / 1000
              }km`}
            />

            <InfoRow
              label="Safe Threshold"
              value={APP_CONFIG.MAP_MARKERS.THRESHOLD_SAFE}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={commonStyles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleClearCache}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={theme.colors.error}
              />
              <Text
                style={[styles.actionButtonText, { color: theme.colors.error }]}
              >
                Clear Cache
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                Alert.alert("Debug Info", JSON.stringify(cacheStats, null, 2));
              }}
            >
              <Ionicons
                name="code-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.actionButtonText}>View Raw Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                notify.success("Test notification sent!", "Debug");
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.actionButtonText}>Test Notification</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper component for info rows
function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator + "30",
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textLight,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
    textAlign: "right",
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.separator,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
  },
});
