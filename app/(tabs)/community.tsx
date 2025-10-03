import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import {
  fetchRecentReviews,
  fetchTrendingLocations,
} from "src/store/locationsSlice";
import { theme } from "src/styles/theme";
import { useRealtimeReviews } from "src/hooks/useRealtimeReviews";

export default function CommunityScreen() {
  const dispatch = useAppDispatch();
  const {
    communityReviews,
    communityLoading,
    trendingLocations,
    trendingLoading,
  } = useAppSelector((state) => state.locations);
  const [refreshing, setRefreshing] = React.useState(false);
  useRealtimeReviews();
  useEffect(() => {
    loadCommunityData();
  }, []);

  const loadCommunityData = async () => {
    try {
      await Promise.all([
        dispatch(fetchRecentReviews(10)).unwrap(),
        dispatch(
          fetchTrendingLocations({ daysWindow: 7, maxResults: 10 })
        ).unwrap(),
      ]);
    } catch (error) {
      console.error("Error loading community data:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCommunityData();
    setRefreshing(false);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return theme.colors.safeGreen;
    if (rating >= 3) return theme.colors.mixedYellow;
    return theme.colors.unsafeRed;
  };

  const renderReviewItem = (review: any) => {
    const timeAgo = formatDistanceToNow(new Date(review.created_at), {
      addSuffix: true,
    });

    // Parse the overall_rating string to float
    const rating = parseFloat(review.overall_rating) || 0;

    return (
      <TouchableOpacity key={review.id} style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{review.location_name}</Text>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {review.location_address}
            </Text>
          </View>
          <View
            style={[
              styles.ratingBadge,
              { backgroundColor: getRatingColor(rating) },
            ]}
          >
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.reviewTitle}>{review.title}</Text>
        <Text style={styles.reviewBody} numberOfLines={2}>
          {review.content}
        </Text>

        <View style={styles.reviewFooter}>
          <View style={styles.userInfo}>
            <Text style={styles.anonymousText}>Anonymous reviewer</Text>
          </View>
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSafetyUpdateItem = () => (
    <View style={styles.safetyUpdateCard}>
      <View style={styles.updateIcon}>
        <Ionicons name="alert-circle" size={24} color="#FF9500" />
      </View>
      <View style={styles.updateContent}>
        <Text style={styles.updateTitle}>Construction on Main St</Text>
        <Text style={styles.updateDescription}>
          Reduced visibility and narrow sidewalks. Use caution when traveling
          through this area.
        </Text>
        <Text style={styles.updateTime}>2 hours ago</Text>
      </View>
    </View>
  );

  const renderTrendingLocation = (
    name: string,
    trend: string,
    reviews: number
  ) => (
    <TouchableOpacity style={styles.trendingCard}>
      <View>
        <Text style={styles.trendingName}>{name}</Text>
        <Text style={styles.trendingStats}>{reviews} reviews this week</Text>
      </View>
      <View style={styles.trendBadge}>
        <Ionicons
          name={trend === "up" ? "trending-up" : "trending-down"}
          size={20}
          color={
            trend === "up" ? theme.colors.safeGreen : theme.colors.unsafeRed
          }
        />
      </View>
    </TouchableOpacity>
  );

  if (communityLoading && communityReviews.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading community updates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Community</Text>
          <Text style={styles.screenSubtitle}>
            Recent reviews and safety updates from travelers like you
          </Text>
        </View>

        {/* Safety Updates Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Safety Updates</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          {renderSafetyUpdateItem()}
          <Text style={styles.comingSoonText}>
            More safety updates coming soon...
          </Text>
        </View>

        {/* Trending Locations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending This Week</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          {trendingLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : trendingLocations.length > 0 ? (
            trendingLocations.map((location) =>
              renderTrendingLocation(
                location.location_name,
                location.trend_direction,
                location.review_count_current
              )
            )
          ) : (
            <Text style={styles.emptyText}>
              No trending locations yet. Be the first to review!
            </Text>
          )}
        </View>

        {/* Recent Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
          </View>
          {communityReviews.length > 0 ? (
            communityReviews.map(renderReviewItem)
          ) : (
            <Text style={styles.emptyText}>
              No reviews yet. Be the first to share your experience!
            </Text>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  locationInfo: {
    flex: 1,
    marginRight: 10,
  },
  locationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  locationAddress: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  ratingBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  ratingText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  reviewBody: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  demographicsText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  anonymousText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  timeText: {
    fontSize: 12,
    color: "#999",
  },
  safetyUpdateCard: {
    flexDirection: "row",
    backgroundColor: "#FFF5E6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  updateIcon: {
    marginRight: 12,
  },
  updateContent: {
    flex: 1,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  updateDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 8,
  },
  updateTime: {
    fontSize: 12,
    color: "#999",
  },
  trendingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  trendingName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  trendingStats: {
    fontSize: 14,
    color: "#666",
  },
  trendBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  comingSoonText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
});
