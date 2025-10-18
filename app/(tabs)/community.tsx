import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import {
  fetchRecentReviews,
  fetchTrendingLocations,
  fetchSafetyInsights,
  loadCommunityFeedMode,
  saveCommunityFeedMode,
  setNavigationIntent,
} from "src/store/locationsSlice";
import { theme } from "src/styles/theme";
import { useRealtimeReviews } from "src/hooks/useRealtimeReviews";
import { APP_CONFIG } from "@/utils/appConfig";
import { router } from "expo-router";
import type { SafetyInsight } from "@/types/supabase";
import ProfileBanner from "@/components/ProfileBanner";
import { checkProfileCompleteness } from "@/utils/profileValidation";
import { shouldShowBanner } from "@/store/profileBannerSlice";

export default function CommunityScreen() {
  const dispatch = useAppDispatch();
  const {
    communityReviews,
    communityLoading,
    trendingLocations,
    trendingLoading,
    safetyInsights,
    safetyInsightsLoading,
    userLocation,
    mapCenter,
    communityFeedMode,
  } = useAppSelector((state) => state.locations);
  const [refreshing, setRefreshing] = React.useState(false);

  const { profile } = useAppSelector((state) => state.user);
  const bannerState = useAppSelector((state) => state.profileBanner);

  // Check profile completeness for recommendations
  const profileCheck = React.useMemo(() => {
    if (!profile) return { canUse: true, missingFields: [] };

    const validation = checkProfileCompleteness(profile, "RECOMMENDATIONS");
    return {
      canUse: validation.canUseFeature,
      missingFields: validation.missingFieldsForFeature,
    };
  }, [profile]);

  // Determine if we should show the banner
  const showProfileBanner = React.useMemo(() => {
    if (profileCheck.canUse) return false;
    return shouldShowBanner(
      bannerState,
      APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES
        .RECOMMENDATIONS_INCOMPLETE
    );
  }, [profileCheck.canUse, bannerState]);

  useRealtimeReviews();

  useEffect(() => {
    dispatch(loadCommunityFeedMode());
  }, []);

  // Load data on mount AND reload when location or mode changes
  useEffect(() => {
    const coords = communityFeedMode === "near_me" ? userLocation : mapCenter;

    if (!coords) return;

    const fetchData = async () => {
      try {
        await Promise.all([
          dispatch(
            fetchRecentReviews({
              limit: APP_CONFIG.COMMUNITY.REVIEWS_PER_PAGE,
              latitude: coords.latitude,
              longitude: coords.longitude,
            })
          ).unwrap(),
          dispatch(
            fetchTrendingLocations({
              daysWindow: APP_CONFIG.COMMUNITY.TRENDING_TIMEFRAME_DAYS,
              maxResults: APP_CONFIG.COMMUNITY.REVIEWS_PER_PAGE,
            })
          ).unwrap(),
          // ADD THIS:
          dispatch(
            fetchSafetyInsights({
              latitude: coords.latitude,
              longitude: coords.longitude,
              radius: APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS,
              maxResults: 5,
            })
          ).unwrap(),
        ]);
      } catch (error) {
        console.error("Error loading community data:", error);
      }
    };

    fetchData();
  }, [
    userLocation?.latitude,
    userLocation?.longitude,
    mapCenter?.latitude,
    mapCenter?.longitude,
    communityFeedMode,
    dispatch,
  ]);

  const loadCommunityData = async () => {
    const coords = communityFeedMode === "near_me" ? userLocation : mapCenter;
    if (!coords) return;

    try {
      await Promise.all([
        dispatch(
          fetchRecentReviews({
            limit: 10,
            latitude: userLocation?.latitude,
            longitude: userLocation?.longitude,
          })
        ).unwrap(),
        dispatch(
          fetchTrendingLocations({
            daysWindow: APP_CONFIG.COMMUNITY.TRENDING_TIMEFRAME_DAYS,
            maxResults: APP_CONFIG.COMMUNITY.REVIEWS_PER_PAGE,
          })
        ).unwrap(),
        dispatch(
          fetchSafetyInsights({
            latitude: coords.latitude,
            longitude: coords.longitude,
            radius: APP_CONFIG.DISTANCE.DEFAULT_SEARCH_RADIUS_METERS,
            maxResults: APP_CONFIG.COMMUNITY.REVIEWS_PER_PAGE,
          })
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

  const handleInsightPress = (insight: SafetyInsight) => {
    dispatch(
      setNavigationIntent({
        targetTab: "map",
        locationId: insight.location_id,
        action: "view_location",
      })
    );
    router.push("/(tabs)");
  };

  const handleToggleMode = async () => {
    const newMode = communityFeedMode === "near_me" ? "map_area" : "near_me";
    await dispatch(saveCommunityFeedMode(newMode)).unwrap();
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return theme.colors.safeGreen;
    if (rating >= 3) return theme.colors.mixedYellow;
    return theme.colors.unsafeRed;
  };

  const renderSafetyInsight = (insight: SafetyInsight) => {
    const timeAgo = formatDistanceToNow(new Date(insight.created_at), {
      addSuffix: true,
    });

    const getSeverityColor = () => {
      switch (insight.severity) {
        case "high":
          return theme.colors.error;
        case "medium":
          return theme.colors.mixedYellow;
        case "low":
          return theme.colors.secondary;
        default:
          return theme.colors.textSecondary;
      }
    };

    const getSeverityBg = () => {
      switch (insight.severity) {
        case "high":
          return theme.colors.backgroundSecondary;
        case "medium":
          return theme.colors.backgroundSecondary;
        case "low":
          return theme.colors.backgroundSecondary;
        default:
          return theme.colors.backgroundSecondary;
      }
    };

    return (
      <TouchableOpacity
        key={`${insight.insight_type}-${insight.location_id}`}
        style={[
          styles.insightCard,
          { backgroundColor: getSeverityBg(), borderColor: getSeverityColor() },
        ]}
        onPress={() => handleInsightPress(insight)}
      >
        <View style={styles.insightContent}>
          <Text style={[styles.insightMessage, { color: getSeverityColor() }]}>
            {insight.message}
          </Text>
          <Text style={styles.insightAddress} numberOfLines={1}>
            {insight.location_address}
          </Text>
          <Text style={styles.insightTime}>{timeAgo}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderReviewItem = (review: any) => {
    const timeAgo = formatDistanceToNow(new Date(review.created_at), {
      addSuffix: true,
    });

    // Parse the overall_rating string to float
    const rating = parseFloat(review.overall_rating) || 0;

    const handleReviewPress = () => {
      // Set navigation intent for map tab
      dispatch(
        setNavigationIntent({
          targetTab: "map",
          locationId: review.location_id,
          action: "view_location",
        })
      );

      // Navigate to map tab
      router.push("/(tabs)");
    };

    return (
      <TouchableOpacity
        key={review.id}
        style={styles.reviewCard}
        onPress={handleReviewPress}
      >
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
            {review.user_demographics?.show_demographics ? (
              <Text style={styles.demographicsText}>
                {[
                  review.user_demographics.race_ethnicity?.length > 0 &&
                    review.user_demographics.race_ethnicity.join(", "),
                  review.user_demographics.gender,
                  review.user_demographics.lgbtq_status && "LGBTQ+",
                  review.user_demographics.disability_status?.length > 0 &&
                    review.user_demographics.disability_status.join(", "),
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </Text>
            ) : (
              <Text style={styles.anonymousText}>Anonymous Reviewer</Text>
            )}
          </View>
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSafetyUpdateItem = () => (
    <View style={styles.safetyUpdateCard}>
      <View style={styles.updateIcon}>
        <Ionicons name="alert-circle" size={24} color={theme.colors.accent} />
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
    id: string,
    name: string,
    trend: string,
    reviews: number
  ) => {
    const handleTrendingPress = () => {
      dispatch(
        setNavigationIntent({
          targetTab: "map",
          locationId: id,
          action: "view_location",
        })
      );
      router.push("/(tabs)");
    };

    return (
      <TouchableOpacity
        key={id}
        style={styles.trendingCard}
        onPress={handleTrendingPress} // <- ADD THIS
      >
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
  };

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
      {/* Profile Completion Banner */}
      {showProfileBanner && (
        <ProfileBanner
          bannerType={
            APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES
              .RECOMMENDATIONS_INCOMPLETE
          }
          missingFields={profileCheck.missingFields}
          visible={showProfileBanner}
        />
      )}
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
          {/* ADD THIS TOGGLE UI */}
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                communityFeedMode === "near_me" && styles.modeButtonActive,
              ]}
              onPress={handleToggleMode}
            >
              <Ionicons
                name="navigate"
                size={18}
                color={
                  communityFeedMode === "near_me"
                    ? theme.colors.card
                    : theme.colors.primary
                }
              />
              <Text
                style={[
                  styles.modeButtonText,
                  communityFeedMode === "near_me" &&
                    styles.modeButtonTextActive,
                ]}
              >
                Near Me
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                communityFeedMode === "map_area" && styles.modeButtonActive,
              ]}
              onPress={handleToggleMode}
            >
              <Ionicons
                name="map"
                size={18}
                color={
                  communityFeedMode === "map_area"
                    ? theme.colors.card
                    : theme.colors.primary
                }
              />
              <Text
                style={[
                  styles.modeButtonText,
                  communityFeedMode === "map_area" &&
                    styles.modeButtonTextActive,
                ]}
              >
                Map Area
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* No location available message */}
        {(!userLocation && communityFeedMode === "near_me") ||
        (!mapCenter && communityFeedMode === "map_area") ? (
          <View style={styles.noLocationContainer}>
            <Ionicons
              name="location-outline"
              size={48}
              color={theme.colors.textLight}
            />
            <Text style={styles.noLocationTitle}>Location Required</Text>
            <Text style={styles.noLocationText}>
              {communityFeedMode === "near_me"
                ? "Enable location services to see reviews near you"
                : "Move the map to explore reviews in different areas"}
            </Text>
          </View>
        ) : null}

        {/* No reviews found in area */}
        {((userLocation && communityFeedMode === "near_me") ||
          (mapCenter && communityFeedMode === "map_area")) &&
        communityReviews.length === 0 &&
        !communityLoading ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="chatbubbles-outline"
              size={48}
              color={theme.colors.textLight}
            />
            <Text style={styles.emptyTitle}>No Reviews Nearby</Text>
            <Text style={styles.emptyText}>
              Be the first to review a location in this area!
            </Text>
          </View>
        ) : null}

        {/* Safety Updates Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Safety Insights</Text>
            {safetyInsights.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert("Coming Soon", "Full insights view coming soon!")
                }
              >
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            )}
          </View>
          {safetyInsightsLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : safetyInsights.length > 0 ? (
            safetyInsights.map(renderSafetyInsight)
          ) : (
            <Text style={styles.emptyText}>No safety alerts at this time</Text>
          )}
        </View>

        {/* Trending Locations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Community Awareness This Week
            </Text>
            {/* Only show "See all" if there are trending locations */}
            {trendingLocations.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert("Coming Soon", "Full list view coming soon!")
                }
              >
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            )}
          </View>
          {trendingLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : trendingLocations.length > 0 ? (
            trendingLocations.map((location, index) =>
              renderTrendingLocation(
                location.location_id || `trending-${index}`,
                location.location_name,
                location.trend_direction,
                location.review_count_current
              )
            )
          ) : (
            <Text style={styles.emptyText}>
              No significant activity this week
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
    backgroundColor: theme.colors.backgroundSecondary,
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
    color: theme.colors.textSecondary,
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  insightCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  insightContent: {
    flex: 1,
  },
  insightMessage: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
    lineHeight: 20,
  },
  insightAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  insightTime: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  modeToggleContainer: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  modeButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  modeButtonTextActive: {
    color: theme.colors.card,
  },
  noLocationContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noLocationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noLocationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
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
    color: theme.colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  reviewCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.text,
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
    color: theme.colors.text,
  },
  locationAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
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
    color: theme.colors.card,
    fontSize: 18,
    fontWeight: "bold",
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 8,
  },
  reviewBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  anonymousText: {
    fontSize: 16,
    color: theme.colors.textLight,
    fontStyle: "italic",
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  safetyUpdateCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.warning,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.separator,
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
    color: theme.colors.text,
    marginBottom: 4,
  },
  updateDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  updateTime: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  trendingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  trendingName: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 4,
  },
  trendingStats: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  trendBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  comingSoonText: {
    fontSize: 14,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 20,
  },
});
