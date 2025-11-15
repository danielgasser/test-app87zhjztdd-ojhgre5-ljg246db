import React, { useState, useEffect } from "react";
import { theme } from "src/styles/theme";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { updateReview } from "src/store/locationsSlice";
import { supabase } from "src/services/supabase";
import { Database } from "src/types/database.types";
import { CreateReviewForm } from "@/types/supabase";
import { requireAuth } from "@/utils/authHelpers";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { APP_CONFIG } from "@/utils/appConfig";
import { validateVisitDateTime } from "@/utils/dateValidation";
import { useAuth } from "@/providers/AuthProvider";

type Review = Database["public"]["Tables"]["reviews"]["Row"];

interface RatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
}

const RatingInput: React.FC<RatingProps> = ({
  label,
  value,
  onChange,
  required,
}) => {
  return (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onChange(star)}>
            <Ionicons
              name={star <= value ? "star" : "star-outline"}
              size={32}
              color={
                star <= value ? theme.colors.mixedYellow : theme.colors.border
              }
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default function EditReviewScreen() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!requireAuth(user?.id, "edit reviews")) {
      router.back();
    }
  }, [user]);

  const dispatch = useAppDispatch();
  const { reviewId } = useLocalSearchParams();
  const [showVisitTypePicker, setShowVisitTypePicker] = useState(false);

  const { loading } = useAppSelector((state) => state.locations);

  const [originalReview, setOriginalReview] = useState<Review | null>(null);
  const [loadingReview, setLoadingReview] = useState(true);
  const [visitDateTime, setVisitDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    overall_rating: 0,
    safety_rating: 0,
    comfort_rating: 0,
    accessibility_rating: 0,
    service_rating: 0,
    visit_type: "solo",
  });

  useEffect(() => {
    if (reviewId) {
      fetchReviewData();
    }
  }, [reviewId]);

  const fetchReviewData = async () => {
    try {
      const { data: review, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("id", reviewId as string)
        .eq("user_id", user!.id)
        .single();

      if (error) throw error;

      if (review) {
        if (!review.created_at) {
          notify.error("Invalid review timestamp");
          router.back();
          return;
        }

        const hoursSinceCreation =
          (Date.now() - new Date(review.created_at).getTime()) /
          (1000 * 60 * 60);

        if (
          hoursSinceCreation > APP_CONFIG.BUSINESS_RULES.REVIEW_EDIT_TIMEFRAME
        ) {
          notify.error(
            `This review can no longer be edited. Reviews can only be edited within ${APP_CONFIG.BUSINESS_RULES.REVIEW_EDIT_TIMEFRAME} hours of creation.`
          );
          router.back();
          return;
        }
        setOriginalReview(review);
        setFormData({
          title: review.title,
          content: review.content,
          overall_rating: review.overall_rating,
          safety_rating: review.safety_rating,
          comfort_rating: review.comfort_rating,
          accessibility_rating: review.accessibility_rating || 0,
          service_rating: review.service_rating || 0,
          visit_type: review.visit_type || "solo",
        });

        if (review.visited_at) {
          setVisitDateTime(new Date(review.visited_at));
        }
      }
    } catch (error: any) {
      logger.error("Failed to fetch review:", error);
      notify.error("Failed to load review data. Please try again.");
      router.back();
    } finally {
      setLoadingReview(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      notify.error("Please enter a title for your review");
      return;
    }
    if (!formData.content.trim()) {
      notify.error("Please write your review");
      return;
    }
    if (formData.overall_rating === 0) {
      notify.error("Please provide an overall rating");
      return;
    }
    if (formData.safety_rating === 0) {
      notify.error("Please provide a safety rating");
      return;
    }
    if (formData.comfort_rating === 0) {
      notify.error("Please provide a comfort rating");
      return;
    }

    try {
      const updateData: Partial<CreateReviewForm> = {
        title: formData.title,
        content: formData.content,
        overall_rating: formData.overall_rating,
        safety_rating: formData.safety_rating,
        comfort_rating: formData.comfort_rating,
        accessibility_rating: formData.accessibility_rating || undefined,
        service_rating: formData.service_rating || undefined,
        visited_at: visitDateTime.toISOString(),
        visit_type: formData.visit_type as
          | "solo"
          | "couple"
          | "family"
          | "group"
          | "business",
        location_id: originalReview?.location_id,
      };

      await dispatch(
        updateReview({ id: reviewId as string, ...updateData })
      ).unwrap();

      notify.confirm(
        "Review Updated",
        "Your review has been successfully updated!",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      logger.error("Review update error:", error);
      notify.error(
        error?.message || "Failed to update review. Please try again."
      );
    }
  };

  const handleCancel = () => {
    notify.confirm(
      "Discard Changes",
      "Are you sure you want to discard your changes?",
      [
        { text: "Keep Editing", style: "cancel", onPress: () => {} },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please log in to edit reviews</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loadingReview) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading review...</Text>
        </View>
      </View>
    );
  }

  if (!originalReview) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>
            Review not found or you don't have permission to edit it
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.safeTop} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleCancel}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Edit Review</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.form}>
              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Review Title <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Summarize your experience"
                  value={formData.title}
                  onChangeText={(text) =>
                    setFormData({ ...formData, title: text })
                  }
                  maxLength={100}
                />
              </View>

              {/* Ratings */}
              <RatingInput
                label="Overall Experience"
                value={formData.overall_rating}
                onChange={(value) =>
                  setFormData({ ...formData, overall_rating: value })
                }
                required
              />

              <RatingInput
                label="Safety"
                value={formData.safety_rating}
                onChange={(value) =>
                  setFormData({ ...formData, safety_rating: value })
                }
                required
              />

              <RatingInput
                label="Comfort Level"
                value={formData.comfort_rating}
                onChange={(value) =>
                  setFormData({ ...formData, comfort_rating: value })
                }
                required
              />

              <RatingInput
                label="Accessibility"
                value={formData.accessibility_rating}
                onChange={(value) =>
                  setFormData({ ...formData, accessibility_rating: value })
                }
              />

              <RatingInput
                label="Service Quality"
                value={formData.service_rating}
                onChange={(value) =>
                  setFormData({ ...formData, service_rating: value })
                }
              />

              {/* Review Content */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Your Review <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Share your experience at this location..."
                  value={formData.content}
                  onChangeText={(text) =>
                    setFormData({ ...formData, content: text })
                  }
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text style={styles.charCount}>
                  {formData.content.length}/1000
                </Text>
              </View>

              {/* Visit Details */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Visit Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {visitDateTime.toLocaleDateString()}
                  </Text>
                  <Ionicons
                    name="calendar"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {showTimePicker && (
                <DateTimePicker
                  value={visitDateTime}
                  mode="time"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowTimePicker(false);
                    if (selectedDate) {
                      const newDateTime = new Date(visitDateTime);
                      newDateTime.setHours(selectedDate.getHours());
                      newDateTime.setMinutes(selectedDate.getMinutes());

                      // Check if the combined date+time is in the future
                      const result = validateVisitDateTime(newDateTime);
                      if (!result.isValid) {
                        notify.error(result.errorMessage || "Invalid date");
                      }
                      setVisitDateTime(result.validatedDate);
                    }
                  }}
                />
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Visit Time</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {visitDateTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  <Ionicons
                    name="time"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {showTimePicker && (
                <DateTimePicker
                  value={visitDateTime}
                  mode="time"
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(false);
                    if (selectedTime) {
                      const newDateTime = new Date(visitDateTime);
                      newDateTime.setHours(selectedTime.getHours());
                      newDateTime.setMinutes(selectedTime.getMinutes());

                      // Check if the combined date+time is in the future
                      if (newDateTime > new Date()) {
                        notify.error("Visit time cannot be in the future");
                        const now = new Date();
                        newDateTime.setHours(now.getHours());
                        newDateTime.setMinutes(now.getMinutes());
                      }

                      setVisitDateTime(newDateTime);
                    }
                  }}
                />
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Visit Type</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowVisitTypePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {formData.visit_type.charAt(0).toUpperCase() +
                      formData.visit_type.slice(1)}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Visit Type Picker Modal */}
              <Modal
                visible={showVisitTypePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowVisitTypePicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Visit Type</Text>
                      <TouchableOpacity
                        onPress={() => setShowVisitTypePicker(false)}
                      >
                        <Text style={styles.modalDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <Picker
                      selectedValue={formData.visit_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, visit_type: value })
                      }
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      <Picker.Item label="Solo" value="solo" />
                      <Picker.Item label="Couple" value="couple" />
                      <Picker.Item label="Family" value="family" />
                      <Picker.Item label="Group" value="group" />
                      <Picker.Item label="Business" value="business" />
                    </Picker>
                  </View>
                </View>
              </Modal>

              {/* Action Buttons */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Updating..." : "Update Review"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  safeTop: {
    height: Platform.OS === "ios" ? 44 : 0,
    backgroundColor: theme.colors.card,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  required: {
    color: theme.colors.error,
  },
  input: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textLight,
    textAlign: "right",
    marginTop: 4,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 8,
  },
  stars: {
    flexDirection: "row",
    gap: 8,
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
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  modalDone: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  picker: {
    height: 200,
  },
  pickerItem: {
    height: 200,
    fontSize: 18,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    color: theme.colors.card,
  },
  cancelButton: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    color: theme.colors.card,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.card,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
});
