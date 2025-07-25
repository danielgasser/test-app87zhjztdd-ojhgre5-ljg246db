import React, { useEffect, useState } from "react";
import { theme } from "src/styles/theme";

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { submitReview } from "src/store/locationsSlice";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  createLocationFromSearch,
  setUserLocation,
  addLocationToNearby,
} from "src/store/locationsSlice";
import { LocationWithScores } from "@/types/supabase";

interface RatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
}
// Update your existing interface
interface ReviewParams {
  locationId?: string;
  locationName?: string;
  locationData?: string; // Add these new fields
  isNewLocation?: string;
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

export default function ReviewScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { locationId, locationName, locationData, isNewLocation } =
    useLocalSearchParams();
  const typedLocationId = locationId as string | undefined;
  const typedLocationName = locationName as string | undefined;
  const typedLocationData = locationData as string | undefined;
  const typedIsNewLocation = isNewLocation as string | undefined;
  const [showVisitTypePicker, setShowVisitTypePicker] = useState(false);

  const { loading } = useAppSelector((state) => state.locations);
  const user = useAppSelector((state) => state.auth.user);

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
  const parsedLocationData = typedLocationData
    ? JSON.parse(typedLocationData)
    : null;
  const isCreatingNew = typedIsNewLocation === "true";
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(
    isCreatingNew ? null : typedLocationId || null
  );

  useEffect(() => {
    if (!isCreatingNew && !typedLocationId) {
      Alert.alert("Error", "No location specified");
      router.back();
      return;
    }

    if (isCreatingNew && !parsedLocationData) {
      Alert.alert("Error", "No location data provided");
      router.back();
      return;
    }
  }, [typedLocationId, isCreatingNew, parsedLocationData]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      Alert.alert("Error", "Please enter a review title");
      return;
    }

    if (!formData.content.trim()) {
      Alert.alert("Error", "Please enter review content");
      return;
    }

    if (!formData.overall_rating || !formData.safety_rating) {
      Alert.alert("Error", "Please provide both overall and safety ratings");
      return;
    }

    let finalLocationId = currentLocationId;

    try {
      // If this is a new location, create it first
      if (isCreatingNew && parsedLocationData) {
        // Convert parsed data to SearchLocation format
        const searchLocation = {
          id: `temp-${Date.now()}`, // Temporary ID
          name: parsedLocationData.name,
          address: parsedLocationData.address,
          latitude: parsedLocationData.latitude,
          longitude: parsedLocationData.longitude,
          place_type: parsedLocationData.place_type,
          source: "mapbox" as const,
        };

        // Create the location
        finalLocationId = await dispatch(
          createLocationFromSearch(searchLocation)
        ).unwrap();
        setCurrentLocationId(finalLocationId);

        dispatch(
          setUserLocation({
            latitude: parsedLocationData.latitude,
            longitude: parsedLocationData.longitude,
          })
        );
      }
      if (!finalLocationId) {
        throw new Error("No location ID available for review submission");
      }

      if (!finalLocationId) {
        throw new Error("No location ID available for review submission");
      }

      // Now submit the review with the location ID
      const reviewData = {
        location_id: finalLocationId,
        ...formData,
        visited_at: visitDateTime.toISOString(),
        accessibility_rating: formData.accessibility_rating || undefined,
        service_rating: formData.service_rating || undefined,
      };

      await dispatch(submitReview(reviewData)).unwrap();
      if (isCreatingNew && parsedLocationData) {
        const newLocationWithScores: LocationWithScores = {
          id: finalLocationId,
          name: parsedLocationData.name,
          address: parsedLocationData.address,
          city: parsedLocationData.address.split(", ")[1] || "Unknown",
          state_province:
            parsedLocationData.address.split(", ")[2] || "Unknown",
          country: parsedLocationData.address.includes("Canada")
            ? "Canada"
            : "United States",
          coordinates: `POINT(${parsedLocationData.longitude} ${parsedLocationData.latitude})`,
          latitude: parsedLocationData.latitude,
          longitude: parsedLocationData.longitude,
          avg_safety_score: null,
          review_count: 0,
          safety_scores: [],
          place_type: parsedLocationData.place_type,
          created_by: user?.id || "",
          verified: false,
          active: true,
          description: null,
          postal_code: null,
          tags: null,
          google_place_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          demographic_safety_score: undefined,
        };

        dispatch(addLocationToNearby(newLocationWithScores));
      }
      Alert.alert("Success", "Review submitted successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("🚨 Review submission error:", error);

      if (error.code === "23505") {
        Alert.alert(
          "Already Reviewed",
          "You have already reviewed this location. You can edit your existing review instead."
        );
        return;
      }

      Alert.alert(
        "Error",
        error.message || "Failed to submit review. Please try again."
      );
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please log in to submit a review</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.safeTop} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write a Review</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{locationName || "Location"}</Text>
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
                setShowDatePicker(Platform.OS === "ios");
                if (selectedDate) {
                  const newDateTime = new Date(visitDateTime);
                  newDateTime.setFullYear(selectedDate.getFullYear());
                  newDateTime.setMonth(selectedDate.getMonth());
                  newDateTime.setDate(selectedDate.getDate());
                  setVisitDateTime(newDateTime);
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
                setShowTimePicker(Platform.OS === "ios");
                if (selectedTime) {
                  const newDateTime = new Date(visitDateTime);
                  newDateTime.setHours(selectedTime.getHours());
                  newDateTime.setMinutes(selectedTime.getMinutes());
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
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Visit Type Modal */}
          <Modal
            visible={showVisitTypePicker}
            transparent={true}
            animationType="slide"
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              onPress={() => setShowVisitTypePicker(false)}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Visit Type</Text>
                  <TouchableOpacity
                    onPress={() => setShowVisitTypePicker(false)}
                  >
                    <Text style={styles.modalDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <Picker
                  selectedValue={formData.visit_type}
                  onValueChange={(value) => {
                    setFormData({ ...formData, visit_type: value });
                    setShowVisitTypePicker(false);
                  }}
                  style={{ height: 200 }}
                >
                  <Picker.Item label="Solo" value="solo" />
                  <Picker.Item label="Couple" value="couple" />
                  <Picker.Item label="Family" value="family" />
                  <Picker.Item label="Group" value="group" />
                  <Picker.Item label="Business" value="business" />
                </Picker>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Demographic Context Note */}
          <View style={styles.noteContainer}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.noteText}>
              Your demographic profile will be attached to this review to help
              others who share similar identities make informed decisions.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Submitting..." : "Submit Review"}
            </Text>
          </TouchableOpacity>
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
  locationInfo: {
    padding: 16,
    backgroundColor: "#FFF",
    marginBottom: 8,
  },
  locationName: {
    fontSize: 20,
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
  pickerContainer: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 75,
    width: "100%",
  },
  noteContainer: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: "#388E3C",
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
