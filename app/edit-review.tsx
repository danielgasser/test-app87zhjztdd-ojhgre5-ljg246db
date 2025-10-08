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
  Alert,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { updateReview } from "src/store/locationsSlice";
import { supabase } from "src/services/supabase";
import { Review } from "src/types/supabase";

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
              color={star <= value ? "#FFB800" : "#E0E0E0"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default function EditReviewScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { reviewId } = useLocalSearchParams();
  const [showVisitTypePicker, setShowVisitTypePicker] = useState(false);

  const { loading } = useAppSelector((state) => state.locations);
  const user = useAppSelector((state) => state.auth.user);

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
    visit_type: "solo" as const,
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
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;

      if (review) {
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
      console.error("Failed to fetch review:", error);
      Alert.alert("Error", "Failed to load review data. Please try again.");
      router.back();
    } finally {
      setLoadingReview(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Error", "Please enter a title for your review");
      return;
    }
    if (!formData.content.trim()) {
      Alert.alert("Error", "Please write your review");
      return;
    }
    if (formData.overall_rating === 0) {
      Alert.alert("Error", "Please provide an overall rating");
      return;
    }
    if (formData.safety_rating === 0) {
      Alert.alert("Error", "Please provide a safety rating");
      return;
    }
    if (formData.comfort_rating === 0) {
      Alert.alert("Error", "Please provide a comfort rating");
      return;
    }

    try {
      await dispatch(
        updateReview({
          id: reviewId as string,
          ...formData,
          visited_at: visitDateTime.toISOString(),
          accessibility_rating: formData.accessibility_rating || undefined,
          service_rating: formData.service_rating || undefined,
          location_id: originalReview?.location_id,
        })
      ).unwrap();

      Alert.alert("Success", "Your review has been updated!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Review update error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update review. Please try again."
      );
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Discard Changes",
      "Are you sure you want to discard your changes?",
      [
        { text: "Keep Editing", style: "cancel" },
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
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Ionicons name="close" size={24} color="#333" />
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
              onChangeText={(text) => setFormData({ ...formData, title: text })}
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
            <Text style={styles.charCount}>{formData.content.length}/1000</Text>
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
              <Ionicons name="calendar" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={visitDateTime}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setVisitDateTime(selectedDate);
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
              <Ionicons name="time" size={20} color="#666" />
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
                  setVisitDateTime(selectedTime);
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
              <Ionicons name="chevron-down" size={20} color="#666" />
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  safeTop: {
    height: Platform.OS === "ios" ? 44 : 0,
    backgroundColor: "#FFF",
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
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
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
    color: "#333",
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
  },
  required: {
    color: "#E53935",
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
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
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalDone: {
    fontSize: 16,
    color: "#007AFF",
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
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
  },
  buttonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
});
