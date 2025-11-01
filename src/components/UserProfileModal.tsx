import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../styles/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchPublicUserProfile,
  fetchPublicUserReviews,
} from "../store/userSlice";

interface UserProfileModalProps {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  userId,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const {
    publicProfile,
    publicProfileLoading,
    publicProfileError,
    publicReviews,
    publicReviewsLoading,
  } = useAppSelector((state) => state.user);

  useEffect(() => {
    if (visible && userId) {
      dispatch(fetchPublicUserProfile(userId));
      dispatch(fetchPublicUserReviews(userId));
    }
  }, [visible, userId, dispatch]);

  const renderDemographics = () => {
    if (!publicProfile || !publicProfile.show_demographics) return null;

    const demographics = [];

    if (
      publicProfile.race_ethnicity &&
      publicProfile.race_ethnicity.length > 0
    ) {
      demographics.push(publicProfile.race_ethnicity.join(", "));
    }
    if (publicProfile.gender) {
      demographics.push(publicProfile.gender);
    }
    if (publicProfile.lgbtq_status) {
      demographics.push("LGBTQ+");
    }
    if (
      publicProfile.disability_status &&
      publicProfile.disability_status.length > 0
    ) {
      demographics.push(
        "Disability: " + publicProfile.disability_status.join(", ")
      );
    }
    if (publicProfile.religion) {
      demographics.push(publicProfile.religion);
    }
    if (publicProfile.age_range) {
      demographics.push(publicProfile.age_range);
    }

    if (demographics.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Demographics</Text>
        <View style={styles.demographicsContainer}>
          {demographics.map((demo, index) => (
            <View key={index} style={styles.demographicChip}>
              <Text style={styles.demographicText}>{demo}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderReviews = () => {
    if (publicReviewsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }

    if (publicReviews.length === 0) {
      return <Text style={styles.noReviewsText}>No reviews yet</Text>;
    }

    return publicReviews.map((review) => (
      <View key={review.id} style={styles.reviewItem}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewLocationName} numberOfLines={1}>
            {review.location_name}
          </Text>
          <View style={styles.reviewRating}>
            <Ionicons name="star" size={16} color={theme.colors.mixedYellow} />
            <Text style={styles.reviewRatingText}>
              {review.overall_rating.toFixed(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.reviewTitle} numberOfLines={1}>
          {review.title}
        </Text>
        <Text style={styles.reviewContent} numberOfLines={2}>
          {review.content}
        </Text>
        <Text style={styles.reviewDate}>
          {new Date(review.created_at).toLocaleDateString()}
        </Text>
      </View>
    ));
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>User Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollView}>
            {publicProfileLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading profile...</Text>
              </View>
            ) : publicProfileError ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle"
                  size={48}
                  color={theme.colors.error}
                />
                <Text style={styles.errorText}>{publicProfileError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={onClose}>
                  <Text style={styles.retryButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : publicProfile && !publicProfile.is_public ? (
              <View style={styles.privateContainer}>
                <Ionicons
                  name="lock-closed"
                  size={48}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.privateTitle}>Private Profile</Text>
                <Text style={styles.privateText}>
                  This user has set their profile to private.
                </Text>
              </View>
            ) : publicProfile ? (
              <>
                {/* Name Section */}
                {/* Name Section */}
                <View style={styles.nameSection}>
                  {publicProfile.avatar_url ? (
                    <Image
                      source={{ uri: publicProfile.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons
                        name="person"
                        size={40}
                        color={theme.colors.textSecondary}
                      />
                    </View>
                  )}
                  <Text style={styles.userName}>
                    {publicProfile.full_name || "SafePath User"}
                  </Text>
                  <Text style={styles.memberSince}>
                    Member since{" "}
                    {new Date(publicProfile.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {/* Stats Section */}
                <View style={styles.statsSection}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {publicProfile.total_reviews}
                    </Text>
                    <Text style={styles.statLabel}>Reviews</Text>
                  </View>
                </View>

                {/* Demographics Section */}
                {renderDemographics()}

                {/* Reviews section will be added in next step */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Reviews</Text>
                  {renderReviews()}
                </View>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    height: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.card,
    fontSize: 16,
    fontWeight: "600",
  },
  privateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  privateTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
  },
  privateText: {
    marginTop: 8,
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  nameSection: {
    alignItems: "center",
    padding: 24,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statsSection: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.separator,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  demographicsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  demographicChip: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  demographicText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  comingSoonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  noReviewsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  reviewItem: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewLocationName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewRatingText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 4,
  },
  reviewContent: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
});

export default UserProfileModal;
