import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import {
  fetchLocationDetails,
  fetchMLPredictions,
} from "src/store/locationsSlice";
import { supabase } from "src/services/supabase";
import { ReviewWithUser } from "src/types/supabase";
import PredictionBadge from "./PredictionBadge";
import { googlePlacesService, PlaceDetails } from "@/services/googlePlaces";
import { theme } from "@/styles/theme";
import { APP_CONFIG } from "@/config/appConfig";
import { logger } from "@/utils/logger";
import UserProfileModal from "./UserProfileModal";
import VoteButtons from "./VoteButtons";
import PredictionVoteButtons from "./PredictionVoteButtons";
import { useAuth } from "@/providers";

interface SearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  source?: "database" | "mapbox";
}
interface LocationDetailsModalProps {
  visible: boolean;
  locationId: string | null;
  googlePlaceId?: string | null;
  searchMarker?: SearchResult | null;
  onClose: () => void;
}

const LocationDetailsModal: React.FC<LocationDetailsModalProps> = ({
  visible,
  locationId,
  googlePlaceId,
  searchMarker,
  onClose,
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selectedLocation, loading } = useAppSelector(
    (state) => state.locations
  );
  const { user } = useAuth();
  const currentUser = user;

  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const mlPredictions = useAppSelector(
    (state) => state.locations.mlPredictions
  );
  const mlPredictionsLoading = useAppSelector(
    (state) => state.locations.mlPredictionsLoading
  );
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (locationId && visible) {
      dispatch(fetchLocationDetails(locationId));
      fetchReviews(locationId);
    } else if (visible && !locationId) {
      // Clear reviews for new Google POIs (not in DB yet)
      setReviews([]);
    }
  }, [locationId, visible]);

  useEffect(() => {
    if ((selectedLocation || googlePlaceId) && visible) {
      fetchPlaceDetails();
    }
  }, [selectedLocation, googlePlaceId, visible]);

  useEffect(() => {
    if (!visible) return;

    // Determine the identifier for this location
    const identifier = locationId || googlePlaceId || searchMarker?.id;
    if (!identifier) return;

    // Wait for location details to load
    if (loading || loadingReviews) return;

    const hasNoReviews =
      (selectedLocation && selectedLocation.review_count === 0) ||
      !selectedLocation; // No selectedLocation means not in DB = no reviews

    const hasPrediction = mlPredictions[identifier];
    const isLoading = mlPredictionsLoading[identifier];

    // Fetch prediction if location has no reviews and we don't have a prediction yet
    if (hasNoReviews && !hasPrediction && !isLoading) {
      // For temporary locations, we need coordinates
      const lat = selectedLocation?.latitude || searchMarker?.latitude;
      const lng = selectedLocation?.longitude || searchMarker?.longitude;

      if (lat && lng) {
        dispatch(
          fetchMLPredictions({
            locationId: identifier, // Use the identifier, not null
            latitude: lat,
            longitude: lng,
          })
        );
      }
    }
  }, [
    visible,
    locationId,
    googlePlaceId,
    searchMarker,
    selectedLocation,
    reviews,
    loading,
    loadingReviews,
    mlPredictions,
    mlPredictionsLoading,
    dispatch,
  ]);

  const fetchReviews = async (locId?: string) => {
    const idToUse = locId || locationId;
    if (!idToUse) {
      return;
    }

    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("location_id", idToUse)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        logger.error("❌ Reviews error:", error);
        throw error;
      }
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((r) => r.user_id))];
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("*")
          .in("id", userIds);

        const reviewsWithProfiles = data.map((review) => ({
          ...review,
          user_profiles: profiles?.find((p) => p.id === review.user_id),
        }));

        setReviews(reviewsWithProfiles as ReviewWithUser[]);
      } else {
        setReviews([]);
      }
    } catch (error) {
      logger.error("Error fetching reviews:", error);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const canEditReview = (createdAt: string | null): boolean => {
    if (!createdAt) return false;
    const hoursSinceCreation =
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return (
      hoursSinceCreation <= APP_CONFIG.BUSINESS_RULES.REVIEW_EDIT_TIMEFRAME
    );
  };

  const handleUserProfilePress = (userId: string) => {
    setSelectedUserId(userId);
    setProfileModalVisible(true);
  };

  const fetchPlaceDetails = async () => {
    // Use googlePlaceId prop if available, otherwise try from selectedLocation
    const placeIdToFetch = googlePlaceId || selectedLocation?.google_place_id;

    if (!placeIdToFetch) {
      return;
    }

    try {
      const details = await googlePlacesService.getDetails({
        place_id: placeIdToFetch,
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "geometry",
          "types",
          // expensive fields!
          // "website",
          // "rating",
          // "user_ratings_total",
          // "photos",
          // "reviews",
          // "formatted_phone_number",
          // "opening_hours",
        ],
      });

      if (details) {
        setPlaceDetails(details);
      }
    } catch (error) {
      logger.error("Error fetching place details:", error);
    }
  };

  const handleWriteReview = () => {
    onClose();

    // If location exists in DB, pass locationId
    if (locationId) {
      router.push({
        pathname: "/review",
        params: {
          locationId: locationId,
          locationName: selectedLocation?.name || "",
        },
      });
    }
    // If it's a temporary location from map tap/search
    else if (searchMarker && googlePlaceId && !selectedLocation) {
      router.push({
        pathname: "/review",
        params: {
          isNewLocation: "true",
          locationData: JSON.stringify({
            name: searchMarker.name,
            address: searchMarker.address,
            latitude: searchMarker.latitude,
            longitude: searchMarker.longitude,
            place_type: searchMarker.place_type || "other",
          }),
        },
      });
    }
    // If it's a new Google POI, pass location data
    else if (placeDetails) {
      router.push({
        pathname: "/review",
        params: {
          isNewLocation: "true",
          locationData: JSON.stringify({
            name: placeDetails.name,
            address: placeDetails.formatted_address,
            latitude: placeDetails.geometry.location.lat,
            longitude: placeDetails.geometry.location.lng,
            place_type: placeDetails.types[0] || "other",
            google_place_id: googlePlaceId,
          }),
        },
      });
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return APP_CONFIG.MAP_MARKERS.COLOR_SAFE;
    if (rating >= 3) return APP_CONFIG.MAP_MARKERS.COLOR_MIXED;
    return APP_CONFIG.MAP_MARKERS.COLOR_UNSAFE;
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color={
              star <= rating
                ? theme.colors.mixedYellow
                : theme.colors.backgroundSecondary
            }
          />
        ))}
      </View>
    );
  };

  const renderDemographics = (profile: any) => {
    // Respect privacy_level setting
    if (profile?.privacy_level === "private") return null;
    if (profile?.privacy_level === "anonymous") return null;
    if (!profile?.show_demographics) return null;

    const demographics = [];
    if (
      profile.race_ethnicity?.length > 0 &&
      profile?.privacy_level !== "anonymous"
    ) {
      demographics.push(profile.race_ethnicity.join(", "));
    }
    if (profile.gender && profile?.privacy_level !== "anonymous") {
      demographics.push(profile.gender);
    }
    if (profile.lgbtq_status && profile?.privacy_level !== "anonymous") {
      demographics.push("LGBTQ+");
    }
    if (
      profile.disability_status?.length > 0 &&
      profile?.privacy_level !== "anonymous"
    ) {
      demographics.push("Disability: " + profile.disability_status.join(", "));
    }

    if (demographics.length === 0) return null;

    return (
      <Text style={styles.reviewerDemographics}>
        {demographics.join(" • ")}
      </Text>
    );
  };

  const userHasReviewed = reviews.some(
    (review) => review.user_id === currentUser?.id
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Location Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.secondary} />
            </View>
          ) : selectedLocation || googlePlaceId ? (
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {/* Location Info */}
              <View style={styles.locationSection}>
                <Text style={styles.locationName}>
                  {selectedLocation?.name ||
                    placeDetails?.name ||
                    "Unknown Location"}
                </Text>
                <Text style={styles.locationAddress}>
                  {selectedLocation?.address ||
                    placeDetails?.formatted_address ||
                    ""}
                </Text>
                <Text style={styles.locationType}>
                  {selectedLocation?.place_type ||
                    placeDetails?.place_id ||
                    "unknown"}
                  .
                </Text>

                {/* Place Details from Google */}
                {placeDetails?.opening_hours && (
                  <View style={{ marginTop: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <Ionicons
                        name={
                          placeDetails.opening_hours.open_now
                            ? "time"
                            : "close-circle"
                        }
                        size={16}
                        color={
                          placeDetails.opening_hours.open_now
                            ? theme.colors.secondary
                            : theme.colors.error
                        }
                      />
                      <Text
                        style={{
                          marginLeft: 6,
                          fontSize: 14,
                          fontWeight: "600",
                          color: placeDetails.opening_hours.open_now
                            ? theme.colors.secondary
                            : theme.colors.error,
                        }}
                      >
                        {placeDetails.opening_hours.open_now
                          ? "Open Now"
                          : "Closed"}
                      </Text>
                    </View>
                  </View>
                )}

                {placeDetails?.formatted_phone_number && (
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.textSecondary,
                      marginTop: 4,
                    }}
                  >
                    📞 {placeDetails.formatted_phone_number}
                  </Text>
                )}

                {placeDetails?.website && (
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.primary,
                      marginTop: 4,
                    }}
                    numberOfLines={1}
                  >
                    🌐 {placeDetails.website}
                  </Text>
                )}

                {/* Overall Safety Score */}
                {selectedLocation?.overall_safety_score && (
                  <View style={styles.safetyScoreContainer}>
                    <View
                      style={[
                        styles.safetyScoreBadge,
                        {
                          backgroundColor: getRatingColor(
                            selectedLocation.overall_safety_score
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.safetyScoreText}>
                        {selectedLocation.overall_safety_score.toFixed(1)}
                      </Text>
                    </View>
                    <Text style={styles.reviewCountText}>
                      Based on {selectedLocation.review_count} review
                      {selectedLocation.review_count !== 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
              </View>
              {/* ML Prediction Badge - Always show when available */}
              {(locationId || googlePlaceId || searchMarker?.id) && (
                <PredictionBadge
                  prediction={
                    mlPredictions[
                      locationId || googlePlaceId || searchMarker?.id || ""
                    ]
                  }
                  loading={
                    mlPredictionsLoading[
                      locationId || googlePlaceId || searchMarker?.id || ""
                    ]
                  }
                />
              )}
              {/* Prediction Vote Buttons */}
              {mlPredictions[
                locationId || googlePlaceId || searchMarker?.id || ""
              ] && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <PredictionVoteButtons
                    locationId={
                      locationId || googlePlaceId || searchMarker?.id || ""
                    }
                    predictionSource={
                      mlPredictions[
                        locationId || googlePlaceId || searchMarker?.id || ""
                      ]?.primary_source || "ml_prediction"
                    }
                    predictedSafetyScore={
                      mlPredictions[
                        locationId || googlePlaceId || searchMarker?.id || ""
                      ]?.predicted_safety_score || 3.0
                    }
                    demographicType="overall"
                    demographicValue={null}
                    initialAccurateCount={0}
                    initialInaccurateCount={0}
                    currentUserVote={null}
                    onVoteSuccess={() => {
                      const identifier =
                        locationId || googlePlaceId || searchMarker?.id;
                      // If it's a database location (UUID), just send location_id
                      if (locationId) {
                        dispatch(fetchMLPredictions(locationId));
                      } else {
                        // For temporary locations, send coordinates + identifier
                        const lat =
                          selectedLocation?.latitude || searchMarker?.latitude;
                        const lng =
                          selectedLocation?.longitude ||
                          searchMarker?.longitude;
                        if (identifier && lat && lng) {
                          dispatch(
                            fetchMLPredictions({
                              locationId: identifier,
                              latitude: lat,
                              longitude: lng,
                            })
                          );
                        }
                      }
                    }}
                  />
                </View>
              )}
              {/* Write Review Button - ALWAYS show if user is logged in and hasn't reviewed */}
              {currentUser && !userHasReviewed && (
                <TouchableOpacity
                  style={styles.writeReviewButton}
                  onPress={handleWriteReview}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={theme.colors.card}
                  />
                  <Text style={styles.writeReviewText}>Write a Review</Text>
                </TouchableOpacity>
              )}
              {currentUser && userHasReviewed && (
                <View style={styles.alreadyReviewedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.colors.secondary}
                  />
                  <Text style={styles.alreadyReviewedText}>
                    You've reviewed this location
                  </Text>
                </View>
              )}
              {/* Reviews Section */}
              {(selectedLocation || reviews.length > 0) && (
                <View style={styles.reviewsSection}>
                  <Text style={styles.sectionTitle}>Recent Reviews</Text>

                  {loadingReviews ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.secondary}
                    />
                  ) : reviews.length > 0 ? (
                    reviews.map((review) => (
                      <View key={review.id} style={styles.reviewCard}>
                        {review.user_id === currentUser?.id &&
                          canEditReview(review.created_at) && (
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={() => {
                                onClose();
                                router.push({
                                  pathname: "/edit-review",
                                  params: {
                                    reviewId: review.id,
                                    locationId:
                                      locationId || selectedLocation?.id || "",
                                    locationName: selectedLocation?.name || "",
                                  },
                                });
                              }}
                            >
                              <Ionicons
                                name="pencil"
                                size={18}
                                color={theme.colors.card}
                              />
                              <Text style={styles.editButtonText}>
                                Edit Review
                              </Text>
                            </TouchableOpacity>
                          )}
                        <View style={styles.reviewHeader}>
                          <View>
                            {review.user_profiles?.show_demographics &&
                            review.user_profiles?.full_name ? (
                              <TouchableOpacity
                                onPress={() =>
                                  handleUserProfilePress(review.user_id)
                                }
                              >
                                <Text
                                  style={[
                                    styles.reviewerName,
                                    styles.clickableReviewerName,
                                  ]}
                                >
                                  {review.user_profiles.full_name}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <Text style={styles.reviewerName}>Anonymous</Text>
                            )}
                            {renderDemographics(review.user_profiles)}
                          </View>
                          {renderStars(review.overall_rating)}
                        </View>
                        <Text style={styles.reviewTitle}>{review.title}</Text>
                        <Text style={styles.reviewContent}>
                          {review.content}
                        </Text>

                        <View style={styles.reviewRatings}>
                          <View style={styles.ratingItem}>
                            <Text style={styles.ratingLabel}>Safety:</Text>
                            <Text
                              style={[
                                styles.ratingValue,
                                { color: getRatingColor(review.safety_rating) },
                              ]}
                            >
                              {review.safety_rating}/5
                            </Text>
                          </View>
                          <View style={styles.ratingItem}>
                            <Text style={styles.ratingLabel}>Comfort:</Text>
                            <Text
                              style={[
                                styles.ratingValue,
                                {
                                  color: getRatingColor(review.comfort_rating),
                                },
                              ]}
                            >
                              {review.comfort_rating}/5
                            </Text>
                          </View>
                          {review.accessibility_rating && (
                            <View style={styles.ratingItem}>
                              <Text style={styles.ratingLabel}>Access:</Text>
                              <Text
                                style={[
                                  styles.ratingValue,
                                  {
                                    color: getRatingColor(
                                      review.accessibility_rating
                                    ),
                                  },
                                ]}
                              >
                                {review.accessibility_rating}/5
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.reviewDate}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </Text>
                        <VoteButtons
                          reviewId={review.id}
                          initialHelpfulCount={review.helpful_count || 0}
                          initialUnhelpfulCount={review.unhelpful_count || 0}
                          currentUserVote={null}
                          onVoteChange={() => fetchReviews(locationId!)}
                        />
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noReviewsText}>
                      No reviews yet. Be the first to review this location!
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          ) : null}
        </View>
        {/* User Profile Modal */}
        <UserProfileModal
          visible={profileModalVisible}
          userId={selectedUserId}
          onClose={() => {
            setProfileModalVisible(false);
            setSelectedUserId(null);
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  alreadyReviewedBadge: {
    flexDirection: "row",
    backgroundColor: theme.colors.backgroundSecondary,
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  alreadyReviewedText: {
    color: theme.colors.secondary,
    fontSize: 16,
    fontWeight: "500",
  },
  editButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 10,
    shadowColor: theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  clickableReviewerName: {
    textDecorationLine: "underline",
    color: theme.colors.primary,
  },
  editButtonText: {
    fontSize: 14,
    color: theme.colors.card,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    minHeight: "50%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.backgroundSecondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  locationSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.backgroundSecondary,
  },
  locationName: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  locationType: {
    fontSize: 14,
    color: theme.colors.text,
    textTransform: "capitalize",
  },
  safetyScoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  safetyScoreBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  safetyScoreText: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.card,
  },
  reviewCountText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  writeReviewButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.secondary,
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  writeReviewText: {
    color: theme.colors.card,
    fontSize: 16,
    fontWeight: "600",
  },
  reviewsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  reviewerDemographics: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 8,
  },
  reviewContent: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewRatings: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  ratingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: theme.colors.text,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.text,
  },
  noReviewsText: {
    textAlign: "center",
    fontSize: 16,
    color: theme.colors.textSecondary,
    paddingVertical: 32,
  },
});

export default LocationDetailsModal;
