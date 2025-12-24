import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { NeighborhoodStats as NeighborhoodStatsType } from "@/store/locationsSlice";

interface NeighborhoodStatsProps {
  stats: NeighborhoodStatsType | null;
  loading: boolean;
}

const getCrimeLevel = (rate: number): { label: string; color: string } => {
  if (rate < 15) return { label: "Low", color: theme.colors.success };
  if (rate < 30) return { label: "Moderate", color: theme.colors.warning };
  return { label: "High", color: theme.colors.error };
};

const NeighborhoodStats: React.FC<NeighborhoodStatsProps> = ({
  stats,
  loading,
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="stats-chart" size={18} color={theme.colors.primary} />
          <Text style={styles.title}>Neighborhood Stats</Text>
        </View>
        <Text style={styles.loadingText}>Loading census data...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="stats-chart" size={18} color={theme.colors.primary} />
          <Text style={styles.title}>Neighborhood Stats</Text>
        </View>
        <Text style={styles.emptyText}>
          No census data available for this area.
        </Text>
      </View>
    );
  }

  const crimeLevel = getCrimeLevel(stats.crime_rate_per_1000);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={18} color={theme.colors.primary} />
        <Text style={styles.title}>Neighborhood Stats</Text>
      </View>

      <Text style={styles.areaName}>
        {stats.city}, {stats.state_code}
      </Text>

      {/* Key Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {stats.population.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Population</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: crimeLevel.color }]}>
            {crimeLevel.label}
          </Text>
          <Text style={styles.statLabel}>Crime Level</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {(stats.diversity_index * 100).toFixed(0)}%
          </Text>
          <Text style={styles.statLabel}>Diversity</Text>
        </View>
      </View>

      {/* Crime Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crime Rates (per 1,000)</Text>
        <View style={styles.crimeRow}>
          <View style={styles.crimeItem}>
            <Ionicons
              name="alert-circle"
              size={16}
              color={theme.colors.error}
            />
            <Text style={styles.crimeLabel}>Violent</Text>
            <Text style={styles.crimeValue}>{stats.violent_crime_rate}</Text>
          </View>
          <View style={styles.crimeItem}>
            <Ionicons name="home" size={16} color={theme.colors.warning} />
            <Text style={styles.crimeLabel}>Property</Text>
            <Text style={styles.crimeValue}>{stats.property_crime_rate}</Text>
          </View>
          <View style={styles.crimeItem}>
            <Ionicons
              name="heart-dislike"
              size={16}
              color={theme.colors.error}
            />
            <Text style={styles.crimeLabel}>Hate Crimes</Text>
            <Text style={styles.crimeValue}>{stats.hate_crime_incidents}</Text>
          </View>
        </View>
      </View>

      {/* Data Source */}
      <View style={styles.sourceRow}>
        <Ionicons
          name="information-circle"
          size={14}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.sourceText}>
          {stats.data_source} ({stats.data_year})
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  areaName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  crimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  crimeItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.background,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  crimeLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  crimeValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  sourceText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
});

export default NeighborhoodStats;
