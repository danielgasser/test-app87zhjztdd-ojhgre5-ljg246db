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
import { fetchLocationDetails } from "src/store/locationsSlice";
import { supabase } from "src/services/supabase";
import { ReviewWithUser } from "src/types/supabase";
import PredictionBadge from "./PredictionBadge";

interface LocationDetailsModalProps {
  visible: boolean;
  locationId: string | null;
  onClose: () => void;
}

const LocationDetailsModal: React.FC<LocationDetailsModalProps> = ({
  visible,
  locationId,
  onClose,
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selectedLocation, loading } = useAppSelector(
    (state) => state.locations
  );
  const currentUser = useAppSelector((state) => state.auth.user);
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const mlPredictions = useAppSelector(
    (state) => state.locations.mlPredictions
  );
  const mlPredictionsLoading = useAppSelector(
    (state) => state.locations.mlPredictionsLoading
  );

  useEffect(() => {
    if (locationId && visible) {
      dispatch(fetchLocationDetails(locationId));
      fetchReviews();
    }
  }, [locationId, visible]);

  const fetchReviews = async () => {
    if (!locationId) return;

    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("location_id", locationId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

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

        setReviews(reviewsWithProfiles);
      } else {
        setReviews(data || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleWriteReview = () => {
    onClose();
    router.push({
      pathname: "/review",
      params: {
        locationId: locationId!,
        locationName: selectedLocation?.name || "",
      },
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "#4CAF50";
    if (rating >= 3) return "#FFC107";
    return "#F44336";
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color={star <= rating ? "#FFB800" : "#E0E0E0"}
          />
        ))}
      </View>
    );
  };

  const renderDemographics = (profile: any) => {
    if (!profile?.show_demographics) return null;

    const demographics = [];
    if (profile.race_ethnicity?.length > 0) {
      demographics.push(profile.race_ethnicity.join(", "));
    }
    if (profile.gender) {
      demographics.push(profile.gender);
    }
    if (profile.lgbtq_status) {
      demographics.push("LGBTQ+");
    }
    if (profile.disability_status?.length > 0) {
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
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          ) : selectedLocation ? (
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {/* Location Info */}
              <View style={styles.locationSection}>
                <Text style={styles.locationName}>{selectedLocation.name}</Text>
                <Text style={styles.locationAddress}>
                  {selectedLocation.address}
                </Text>
                <Text style={styles.locationType}>
                  {selectedLocation.place_type.charAt(0).toUpperCase() +
                    selectedLocation.place_type.slice(1).replace("_", " ")}
                </Text>

                {/* Overall Safety Score */}
                {selectedLocation.overall_safety_score && (
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
              {/* ML Prediction Badge for locations with no reviews */}
              {selectedLocation && selectedLocation.review_count === 0 && (
                <PredictionBadge
                  prediction={mlPredictions[selectedLocation.id]}
                  loading={mlPredictionsLoading[selectedLocation.id]}
                />
              )}
              {/* Write Review Button */}
              {currentUser && !userHasReviewed && (
                <TouchableOpacity
                  style={styles.writeReviewButton}
                  onPress={handleWriteReview}
                >
                  <Ionicons name="create-outline" size={20} color="#FFF" />
                  <Text style={styles.writeReviewText}>Write a Review</Text>
                </TouchableOpacity>
              )}
              {currentUser && userHasReviewed && (
                <View style={styles.alreadyReviewedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.alreadyReviewedText}>
                    You've reviewed this location
                  </Text>
                </View>
              )}
              {/* Reviews Section */}
              <View style={styles.reviewsSection}>
                <Text style={styles.sectionTitle}>Recent Reviews</Text>

                {loadingReviews ? (
                  <ActivityIndicator size="small" color="#4CAF50" />
                ) : reviews.length > 0 ? (
                  reviews.map((review) => (
                    <View key={review.id} style={styles.reviewCard}>
                      {review.user_id === currentUser?.id && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => {
                            onClose();
                            router.push({
                              pathname: "/edit-review",
                              params: {
                                reviewId: review.id,
                                locationId: selectedLocation.id,
                                locationName: selectedLocation.name,
                              },
                            });
                          }}
                        >
                          <Ionicons name="pencil" size={18} color="#FFF" />
                          <Text style={styles.editButtonText}>Edit Review</Text>
                        </TouchableOpacity>
                      )}
                      <View style={styles.reviewHeader}>
                        <View>
                          <Text style={styles.reviewerName}>
                            {review.user_profiles?.full_name ||
                              review.user_profiles?.username ||
                              "Anonymous"}
                          </Text>
                          {renderDemographics(review.user_profiles)}
                        </View>
                        {renderStars(review.overall_rating)}
                      </View>

                      <Text style={styles.reviewTitle}>{review.title}</Text>
                      <Text style={styles.reviewContent}>{review.content}</Text>

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
                              { color: getRatingColor(review.comfort_rating) },
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
                    </View>
                  ))
                ) : (
                  <Text style={styles.noReviewsText}>
                    No reviews yet. Be the first to review this location!
                  </Text>
                )}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  alreadyReviewedBadge: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  alreadyReviewedText: {
    color: "#4CAF50",
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
    backgroundColor: "#2196F3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  editButtonText: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
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
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
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
    borderBottomColor: "#E0E0E0",
  },
  locationName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  locationType: {
    fontSize: 14,
    color: "#999",
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
    color: "#FFF",
  },
  reviewCountText: {
    fontSize: 14,
    color: "#666",
  },
  writeReviewButton: {
    flexDirection: "row",
    backgroundColor: "#4CAF50",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  writeReviewText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  reviewsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: "#F8F9FA",
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
    color: "#333",
  },
  reviewerDemographics: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  reviewContent: {
    fontSize: 14,
    color: "#666",
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
    color: "#999",
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
  },
  noReviewsText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    paddingVertical: 32,
  },
});

export default LocationDetailsModal;
