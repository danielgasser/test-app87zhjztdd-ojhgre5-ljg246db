import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Polygon, Callout, Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { DangerZone } from "../types/supabase";
import { APP_CONFIG } from "@/utils/appConfig";
import { theme } from "@/styles/theme";

interface DangerZoneOverlayProps {
  dangerZones: DangerZone[];
  visible: boolean;
}

const getDangerColor = (level: "high" | "medium" | "low") => {
  switch (level) {
    case "high":
      return {
        fill: `${APP_CONFIG.MAP_MARKERS.COLOR_UNSAFE}40`,
        stroke: APP_CONFIG.MAP_MARKERS.COLOR_UNSAFE,
        icon: "alert-circle",
      };
    case "medium":
      return {
        fill: `${APP_CONFIG.MAP_MARKERS.COLOR_MEDIUM}40`,
        stroke: APP_CONFIG.MAP_MARKERS.COLOR_MEDIUM,
        icon: "warning",
      };
    case "low":
      return {
        fill: `${APP_CONFIG.MAP_MARKERS.COLOR_MIXED}40`,
        stroke: APP_CONFIG.MAP_MARKERS.COLOR_MIXED,
        icon: "information-circle",
      };
  }
};

export default function DangerZoneOverlay({
  dangerZones,
  visible,
}: DangerZoneOverlayProps) {
  if (!visible || dangerZones.length === 0) {
    return null;
  }
  return (
    <>
      {dangerZones.map((zone) => {
        const colors = getDangerColor(zone.danger_level);
        if (
          !zone.center_lat ||
          !zone.center_lng ||
          (zone.center_lat === 0 && zone.center_lng === 0)
        ) {
          console.warn(
            `Invalid coordinates for zone ${zone.id}:`,
            zone.center_lat,
            zone.center_lng
          );
          return null; // Skip rendering this zone
        }
        return (
          <React.Fragment key={zone.id}>
            {/* Danger zone polygon */}
            <Polygon
              coordinates={zone.polygon_points.map((point) => {
                return {
                  latitude: point.lat,
                  longitude: point.lng,
                };
              })}
              fillColor={colors.fill}
              strokeColor={colors.stroke}
              strokeWidth={2}
            />

            {/* Center marker with warning icon */}
            <Marker
              coordinate={{
                latitude: zone.center_lat,
                longitude: zone.center_lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.markerContainer}>
                <Ionicons
                  name={colors.icon as any}
                  size={30}
                  color={colors.stroke}
                />
              </View>

              <Callout tooltip>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>
                    ⚠️ {zone.location_name}
                  </Text>
                  <Text style={[styles.dangerLevel, { color: colors.stroke }]}>
                    {zone.danger_level.toUpperCase()} RISK AREA
                  </Text>

                  <View style={styles.divider} />

                  <Text style={styles.sectionTitle}>Affected Groups:</Text>
                  {zone.affected_demographics.map((demo, idx) => (
                    <Text key={idx} style={styles.demographicItem}>
                      {demo.charAt(0).toUpperCase() +
                        demo.slice(1).replace(/_/g, ", ")}
                    </Text>
                  ))}

                  <View style={styles.divider} />

                  <Text style={styles.sectionTitle}>Reasons:</Text>
                  {zone.reasons.map((reason, idx) => (
                    <Text key={idx} style={styles.reasonItem}>
                      • {reason}
                    </Text>
                  ))}

                  {zone.time_based && (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.timeWarning}>
                        ⏰ Higher risk during: {zone.active_times?.join(", ")}
                      </Text>
                    </>
                  )}
                </View>
              </Callout>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 5,
    elevation: 5,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calloutContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    maxWidth: 280,
    elevation: 5,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: 280,
  },
  calloutTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 4,
  },
  dangerLevel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  demographicItem: {
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 8,
    marginBottom: 3,
  },
  reasonItem: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    marginBottom: 3,
  },
  timeWarning: {
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: "500",
    marginTop: 4,
  },
});
