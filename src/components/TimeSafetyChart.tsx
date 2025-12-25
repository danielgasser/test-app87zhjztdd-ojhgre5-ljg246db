import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { TimeSafetyData } from "@/store/locationsSlice";

interface TimeSafetyChartProps {
  data: TimeSafetyData | null;
  loading: boolean;
}

const TIME_PERIODS = [
  { key: "morning", label: "Morning", icon: "sunny", hours: "6am-12pm" },
  {
    key: "afternoon",
    label: "Afternoon",
    icon: "partly-sunny",
    hours: "12pm-6pm",
  },
  { key: "evening", label: "Evening", icon: "cloudy-night", hours: "6pm-10pm" },
  { key: "night", label: "Night", icon: "moon", hours: "10pm-6am" },
] as const;

const getSafetyColor = (rating: number | null): string => {
  if (rating === null) return theme.colors.border;
  if (rating >= 4) return theme.colors.success;
  if (rating >= 3) return theme.colors.warning;
  return theme.colors.error;
};

const TimeSafetyChart: React.FC<TimeSafetyChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <View style={styles.specContainer}>
        <View style={styles.header}>
          <Ionicons name="time" size={18} color={theme.colors.primary} />
          <Text style={styles.title}>Safety by Time of Day</Text>
        </View>
        <Text style={styles.loadingText}>Loading time data...</Text>
      </View>
    );
  }

  if (!data || data.total_with_time === 0) {
    return (
      <View style={styles.specContainer}>
        <View style={styles.header}>
          <Ionicons name="time" size={18} color={theme.colors.primary} />
          <Text style={styles.title}>Safety by Time of Day</Text>
        </View>
        <Text style={styles.emptyText}>No time-based safety data yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.specContainer}>
      <View style={styles.header}>
        <Ionicons name="time" size={18} color={theme.colors.primary} />
        <Text style={styles.title}>Safety by Time of Day</Text>
      </View>

      <View style={styles.grid}>
        {TIME_PERIODS.map((period) => {
          const periodData = data[period.key];
          const hasData = periodData.review_count > 0;
          const safetyColor = getSafetyColor(periodData.avg_safety);

          return (
            <View key={period.key} style={styles.periodCard}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: safetyColor + "20" },
                ]}
              >
                <Ionicons
                  name={period.icon as any}
                  size={24}
                  color={hasData ? safetyColor : theme.colors.textSecondary}
                />
              </View>
              <Text style={styles.periodLabel}>{period.label}</Text>
              <Text style={styles.periodHours}>{period.hours}</Text>
              {hasData ? (
                <>
                  <Text style={[styles.rating, { color: safetyColor }]}>
                    {periodData.avg_safety?.toFixed(1)}★
                  </Text>
                  <Text style={styles.reviewCount}>
                    {periodData.review_count} review
                    {periodData.review_count !== 1 ? "s" : ""}
                  </Text>
                </>
              ) : (
                <Text style={styles.noData}>No data</Text>
              )}
            </View>
          );
        })}
      </View>

      <Text style={styles.totalText}>
        Based on {data.total_with_time} review
        {data.total_with_time !== 1 ? "s" : ""} with time data
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  specContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  periodCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  periodHours: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  rating: {
    fontSize: 18,
    fontWeight: "700",
  },
  reviewCount: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  noData: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginTop: 4,
  },
  totalText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
  },
});

export default TimeSafetyChart;
