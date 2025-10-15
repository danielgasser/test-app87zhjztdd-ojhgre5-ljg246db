import React, { useState, useEffect } from "react";
import { theme } from "src/styles/theme";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { updateUserProfile, fetchUserProfile } from "src/store/userSlice";
import { DEMOGRAPHIC_OPTIONS } from "src/utils/constants";
import { notificationService } from "src/services/notificationService";

const ONBOARDING_STEPS = [
  { id: "welcome", title: "Welcome to SafePath" },
  { id: "name", title: "What's your name?" },
  { id: "race", title: "Race & Ethnicity" },
  { id: "gender", title: "Gender Identity" },
  { id: "lgbtq", title: "LGBTQ+ Identity" },
  { id: "disability", title: "Disability Status" },
  { id: "religion", title: "Religious Identity" },
  { id: "age", title: "Age Range" },
  { id: "privacy", title: "Privacy Settings" },
  { id: "complete", title: "Setup Complete" },
];

export default function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { profile, loading, error } = useAppSelector((state) => state.user);

  const [currentStep, setCurrentStep] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    race_ethnicity: [] as string[],
    gender: "",
    lgbtq_status: false,
    disability_status: [] as string[],
    religion: "",
    age_range: "",
    privacy_level: "public" as "public" | "anonymous" | "private",
    show_demographics: true,
  });

  const [otherInputs, setOtherInputs] = useState({
    race_other: "",
    gender_other: "",
    religion_other: "",
    disability_other: "",
  });

  // Helper function to parse "Other: Custom text" back into separate values
  const parseOtherValue = (value: string) => {
    if (value?.startsWith("Other: ")) {
      return {
        mainValue: "Other",
        customValue: value.substring(7), // Remove "Other: " prefix
      };
    }
    return {
      mainValue: value,
      customValue: "",
    };
  };

  // Load existing profile data when component mounts
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserProfile(user.id));
    }
  }, [user?.id, dispatch]);

  // Pre-populate form when profile data is available
  useEffect(() => {
    if (profile) {
      // Check if profile has any actual demographic data (not just empty defaults)
      const hasRealData =
        (profile.race_ethnicity && profile.race_ethnicity.length > 0) ||
        (profile.gender && profile.gender.trim() !== "") ||
        profile.lgbtq_status ||
        (profile.disability_status && profile.disability_status.length > 0) ||
        (profile.religion && profile.religion.trim() !== "") ||
        (profile.age_range && profile.age_range.trim() !== "");

      if (hasRealData) {
        setIsEditing(true);

        // Parse race/ethnicity array and handle "Other" values
        const parsedRaceEthnicity: string[] = [];
        const raceOtherValues: string[] = [];

        profile.race_ethnicity?.forEach((race) => {
          const parsed = parseOtherValue(race);
          parsedRaceEthnicity.push(parsed.mainValue);
          if (parsed.customValue) {
            raceOtherValues.push(parsed.customValue);
          }
        });

        // Parse disability status array and handle "Other" values
        const parsedDisabilityStatus: string[] = [];
        const disabilityOtherValues: string[] = [];

        profile.disability_status?.forEach((disability) => {
          const parsed = parseOtherValue(disability);
          parsedDisabilityStatus.push(parsed.mainValue);
          if (parsed.customValue) {
            disabilityOtherValues.push(parsed.customValue);
          }
        });

        // Parse gender and religion
        const parsedGender = parseOtherValue(profile.gender || "");
        const parsedReligion = parseOtherValue(profile.religion || "");
        const getValidPrivacyLevel = (
          level: string | null | undefined
        ): "public" | "anonymous" | "private" => {
          if (
            level === "public" ||
            level === "anonymous" ||
            level === "private"
          ) {
            return level;
          }
          return "public"; // Default fallback
        };
        setFormData({
          race_ethnicity: parsedRaceEthnicity,
          gender: parsedGender.mainValue,
          lgbtq_status: profile.lgbtq_status || false,
          disability_status: parsedDisabilityStatus,
          religion: parsedReligion.mainValue,
          age_range: profile.age_range || "",
          privacy_level: getValidPrivacyLevel(profile.privacy_level),
          show_demographics: profile.show_demographics !== false, // Default to true
        });

        setOtherInputs({
          race_other: raceOtherValues.join(", "), // Combine multiple "Other" values
          gender_other: parsedGender.customValue,
          religion_other: parsedReligion.customValue,
          disability_other: disabilityOtherValues.join(", "), // Combine multiple "Other" values
        });
      } else {
        // Profile exists but is empty - this is initial setup
        setIsEditing(false);
      }
    }
  }, [profile]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) {
      Alert.alert("Error", "User session not found. Please log in again.");
      return;
    }

    // Process "Other" inputs and merge with main data
    const processedData = {
      ...formData,
      race_ethnicity: formData.race_ethnicity.map((race) =>
        race === "Other" && otherInputs.race_other
          ? `Other: ${otherInputs.race_other}`
          : race
      ),
      gender:
        formData.gender === "Other" && otherInputs.gender_other
          ? `Other: ${otherInputs.gender_other}`
          : formData.gender,
      religion:
        formData.religion === "Other" && otherInputs.religion_other
          ? `Other: ${otherInputs.religion_other}`
          : formData.religion,
      disability_status: formData.disability_status.map((disability) =>
        disability === "Other" && otherInputs.disability_other
          ? `Other: ${otherInputs.disability_other}`
          : disability
      ),
    };

    try {
      await dispatch(
        updateUserProfile({
          userId: user.id,
          profileData: processedData,
        })
      ).unwrap();

      Alert.alert(
        isEditing ? "Profile Updated!" : "Welcome to SafePath!",
        isEditing
          ? "Your profile has been updated successfully."
          : "Your profile has been set up. You can now start using the app and contributing to our safety community.",
        [
          {
            text: isEditing ? "Done" : "Get Started",
            onPress: async () => {
              router.replace("/(tabs)");

              // Register for notifications after onboarding (only for new users, not editing)
              if (!isEditing && user?.id) {
                const pushToken =
                  await notificationService.registerForPushNotifications();
                if (pushToken) {
                  await notificationService.savePushToken(user.id, pushToken);
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to save profile. Please try again.");
      console.error("Profile save error:", error);
    }
  };

  const handleSkip = () => {
    if (isEditing) {
      // If editing existing profile, allow cancel back to main app
      router.back();
    } else {
      // If initial setup, show alert that profile is required
      Alert.alert(
        "Profile Required",
        "Setting up your profile is required to use SafePath's personalized safety features. This helps us show you relevant safety information based on your travel needs.",
        [{ text: "Continue Setup", style: "default" }]
      );
    }
  };

  const toggleRaceEthnicity = (race: string) => {
    if (formData.race_ethnicity.includes(race)) {
      setFormData({
        ...formData,
        race_ethnicity: formData.race_ethnicity.filter((r) => r !== race),
      });
    } else {
      setFormData({
        ...formData,
        race_ethnicity: [...formData.race_ethnicity, race],
      });
    }
  };

  const toggleDisability = (disability: string) => {
    if (disability === "None") {
      // If "None" is selected, clear all other selections and toggle "None"
      if (formData.disability_status.includes("None")) {
        // Remove "None" if it's already selected
        setFormData({
          ...formData,
          disability_status: [],
        });
      } else {
        // Select only "None" and clear everything else
        setFormData({
          ...formData,
          disability_status: ["None"],
        });
      }
    } else {
      // For any other disability, remove "None" if it exists and toggle the selection
      const updatedStatus = formData.disability_status.filter(
        (d) => d !== "None"
      );

      if (updatedStatus.includes(disability)) {
        // Remove the disability if it's already selected
        setFormData({
          ...formData,
          disability_status: updatedStatus.filter((d) => d !== disability),
        });
      } else {
        // Add the disability to the selection
        setFormData({
          ...formData,
          disability_status: [...updatedStatus, disability],
        });
      }
    }
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Welcome to SafePath!</Text>
      <Text style={styles.stepDescription}>
        To provide personalized safety information, we need to understand your
        travel preferences and needs.
      </Text>
      <Text
        style={[
          styles.stepDescription,
          { fontWeight: "600", color: theme.colors.text },
        ]}
      >
        This setup is required to access SafePath's core features.
      </Text>
      <View style={styles.bulletPoints}>
        <View style={styles.bulletPoint}>
          <Ionicons
            name="shield-checkmark"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.bulletText}>
            Get safety ratings personalized for your demographic
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Ionicons name="map" size={20} color={theme.colors.primary} />
          <Text style={styles.bulletText}>
            See location safety from your perspective
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Ionicons name="people" size={20} color={theme.colors.primary} />
          <Text style={styles.bulletText}>
            Connect with travelers who share your experiences
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Ionicons name="lock-closed" size={20} color={theme.colors.primary} />
          <Text style={styles.bulletText}>Your data is private and secure</Text>
        </View>
      </View>
    </View>
  );
  const renderNameStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your name?</Text>
      <Text style={styles.stepDescription}>
        This helps personalize your experience. You can control who sees this in
        privacy settings.
      </Text>
      <TextInput
        style={styles.nameInput}
        placeholder="Enter your full name"
        value={formData.full_name}
        onChangeText={(text) => setFormData({ ...formData, full_name: text })}
        autoCapitalize="words"
        autoComplete="name"
      />
    </View>
  );
  const renderRaceStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Race & Ethnicity</Text>
      <Text style={styles.stepDescription}>
        Select all that apply. This helps us show you safety ratings from people
        with similar experiences.
      </Text>
      <View style={styles.optionsContainer}>
        {DEMOGRAPHIC_OPTIONS.race.map((race) => (
          <TouchableOpacity
            key={race}
            style={[
              styles.optionButton,
              formData.race_ethnicity.includes(race) && styles.optionSelected,
            ]}
            onPress={() => toggleRaceEthnicity(race)}
          >
            <Text
              style={[
                styles.optionText,
                formData.race_ethnicity.includes(race) &&
                  styles.optionTextSelected,
              ]}
            >
              {race}
            </Text>
            {formData.race_ethnicity.includes(race) && (
              <Ionicons name="checkmark" size={20} color={theme.colors.card} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {formData.race_ethnicity.includes("Other") && (
        <View style={styles.otherInputContainer}>
          <Text style={styles.otherInputLabel}>Please specify:</Text>
          <TextInput
            style={styles.otherInput}
            placeholder="Enter your race/ethnicity"
            value={otherInputs.race_other}
            onChangeText={(text) =>
              setOtherInputs({ ...otherInputs, race_other: text })
            }
            maxLength={50}
          />
        </View>
      )}
    </View>
  );

  const renderGenderStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Gender Identity</Text>
      <Text style={styles.stepDescription}>
        How do you identify? This helps us provide relevant safety information.
      </Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.gender}
          onValueChange={(value) => setFormData({ ...formData, gender: value })}
          style={
            Platform.OS === "ios" ? styles.iosPicker : styles.androidPicker
          }
          itemStyle={Platform.OS === "ios" ? styles.iosPickerItem : undefined}
          dropdownIconColor={theme.colors.primary}
          mode="dropdown"
        >
          <Picker.Item
            label="Select gender identity"
            value=""
            color={theme.colors.textSecondary}
          />
          {DEMOGRAPHIC_OPTIONS.gender.map((gender) => (
            <Picker.Item
              key={gender}
              label={gender}
              value={gender}
              color={theme.colors.text}
            />
          ))}
        </Picker>
      </View>

      {formData.gender === "Other" && (
        <View style={styles.otherInputContainer}>
          <Text style={styles.otherInputLabel}>Please specify:</Text>
          <TextInput
            style={styles.otherInput}
            placeholder="Enter your gender identity"
            value={otherInputs.gender_other}
            onChangeText={(text) =>
              setOtherInputs({ ...otherInputs, gender_other: text })
            }
            maxLength={50}
          />
        </View>
      )}
    </View>
  );

  const renderLGBTQStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>LGBTQ+ Identity</Text>
      <Text style={styles.stepDescription}>
        Do you identify as LGBTQ+? This helps us show you safety information
        from other LGBTQ+ travelers.
      </Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            !formData.lgbtq_status && styles.toggleButtonSelected,
          ]}
          onPress={() => setFormData({ ...formData, lgbtq_status: false })}
        >
          <Text
            style={[
              styles.toggleText,
              !formData.lgbtq_status && styles.toggleTextSelected,
            ]}
          >
            No
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            formData.lgbtq_status && styles.toggleButtonSelected,
          ]}
          onPress={() => setFormData({ ...formData, lgbtq_status: true })}
        >
          <Text
            style={[
              styles.toggleText,
              formData.lgbtq_status && styles.toggleTextSelected,
            ]}
          >
            Yes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDisabilityStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Disability Status</Text>
      <Text style={styles.stepDescription}>
        Select all that apply. This helps us show accessibility information
        relevant to your needs.
      </Text>
      <View style={styles.optionsContainer}>
        {["None", "Mobility", "Visual", "Hearing", "Cognitive", "Other"].map(
          (disability) => (
            <TouchableOpacity
              key={disability}
              style={[
                styles.optionButton,
                formData.disability_status.includes(disability) &&
                  styles.optionSelected,
              ]}
              onPress={() => toggleDisability(disability)}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.disability_status.includes(disability) &&
                    styles.optionTextSelected,
                ]}
              >
                {disability}
              </Text>
              {formData.disability_status.includes(disability) && (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={theme.colors.card}
                />
              )}
            </TouchableOpacity>
          )
        )}
      </View>

      {formData.disability_status.includes("Other") && (
        <View style={styles.otherInputContainer}>
          <Text style={styles.otherInputLabel}>Please specify:</Text>
          <TextInput
            style={styles.otherInput}
            placeholder="Enter your disability status"
            value={otherInputs.disability_other}
            onChangeText={(text) =>
              setOtherInputs({ ...otherInputs, disability_other: text })
            }
            maxLength={50}
          />
        </View>
      )}
    </View>
  );

  const renderReligionStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Religious Identity</Text>
      <Text style={styles.stepDescription}>
        What is your religious or spiritual identity?
      </Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.religion}
          onValueChange={(value) =>
            setFormData({ ...formData, religion: value })
          }
          style={
            Platform.OS === "ios" ? styles.iosPicker : styles.androidPicker
          }
          itemStyle={Platform.OS === "ios" ? styles.iosPickerItem : undefined}
        >
          <Picker.Item label="Select religious identity" value="" />
          {DEMOGRAPHIC_OPTIONS.religion.map((religion) => (
            <Picker.Item key={religion} label={religion} value={religion} />
          ))}
        </Picker>
      </View>

      {formData.religion === "Other" && (
        <View style={styles.otherInputContainer}>
          <Text style={styles.otherInputLabel}>Please specify:</Text>
          <TextInput
            style={styles.otherInput}
            placeholder="Enter your religious identity"
            value={otherInputs.religion_other}
            onChangeText={(text) =>
              setOtherInputs({ ...otherInputs, religion_other: text })
            }
            maxLength={50}
          />
        </View>
      )}
    </View>
  );

  const renderAgeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Age Range</Text>
      <Text style={styles.stepDescription}>Select your age range.</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.age_range}
          onValueChange={(value) =>
            setFormData({ ...formData, age_range: value })
          }
          style={
            Platform.OS === "ios" ? styles.iosPicker : styles.androidPicker
          }
          itemStyle={Platform.OS === "ios" ? styles.iosPickerItem : undefined}
        >
          <Picker.Item label="Select age range" value="" />
          {DEMOGRAPHIC_OPTIONS.age_group.map((age) => (
            <Picker.Item key={age} label={age} value={age} />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderPrivacyStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Privacy Settings</Text>
      <Text style={styles.stepDescription}>
        Choose how your demographic information is shown to others.
      </Text>
      <View style={styles.privacyOptions}>
        <TouchableOpacity
          style={[
            styles.privacyOption,
            formData.privacy_level === "public" && styles.privacyOptionSelected,
          ]}
          onPress={() => setFormData({ ...formData, privacy_level: "public" })}
        >
          <View style={styles.privacyHeader}>
            <Ionicons name="eye" size={24} color={theme.colors.primary} />
            <Text style={styles.privacyTitle}>Public</Text>
          </View>
          <Text style={styles.privacyDescription}>
            Other users can see your demographic information with your reviews
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.privacyOption,
            formData.privacy_level === "anonymous" &&
              styles.privacyOptionSelected,
          ]}
          onPress={() =>
            setFormData({ ...formData, privacy_level: "anonymous" })
          }
        >
          <View style={styles.privacyHeader}>
            <Ionicons name="eye-off" size={24} color={theme.colors.accent} />
            <Text style={styles.privacyTitle}>Anonymous</Text>
          </View>
          <Text style={styles.privacyDescription}>
            Your reviews are visible but without personal demographic details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.privacyOption,
            formData.privacy_level === "private" &&
              styles.privacyOptionSelected,
          ]}
          onPress={() => setFormData({ ...formData, privacy_level: "private" })}
        >
          <View style={styles.privacyHeader}>
            <Ionicons name="lock-closed" size={24} color={theme.colors.error} />
            <Text style={styles.privacyTitle}>Private</Text>
          </View>
          <Text style={styles.privacyDescription}>
            Only you can see your demographic information
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Show demographics on reviews</Text>
        <TouchableOpacity
          style={[
            styles.switch,
            formData.show_demographics && styles.switchActive,
          ]}
          onPress={() =>
            setFormData({
              ...formData,
              show_demographics: !formData.show_demographics,
            })
          }
        >
          <View
            style={[
              styles.switchThumb,
              formData.show_demographics && styles.switchThumbActive,
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContainer}>
      <Ionicons
        name="checkmark-circle"
        size={80}
        color={theme.colors.primary}
      />
      <Text style={styles.stepTitle}>
        {isEditing ? "Profile Updated!" : "You're All Set!"}
      </Text>
      <Text style={styles.stepDescription}>
        {isEditing
          ? "Your demographic information has been updated successfully."
          : "Your profile is ready. You can now:"}
      </Text>
      {!isEditing && (
        <View style={styles.bulletPoints}>
          <View style={styles.bulletPoint}>
            <Ionicons name="map" size={20} color={theme.colors.primary} />
            <Text style={styles.bulletText}>
              View safety ratings personalized for you
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Ionicons name="star" size={20} color={theme.colors.primary} />
            <Text style={styles.bulletText}>
              Leave reviews to help your community
            </Text>
          </View>
          <View style={styles.bulletPoint}>
            <Ionicons name="settings" size={20} color={theme.colors.primary} />
            <Text style={styles.bulletText}>
              Update your profile anytime in Settings
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderCurrentStep = () => {
    switch (ONBOARDING_STEPS[currentStep].id) {
      case "welcome":
        return renderWelcomeStep();
      case "name":
        return renderNameStep();
      case "race":
        return renderRaceStep();
      case "gender":
        return renderGenderStep();
      case "lgbtq":
        return renderLGBTQStep();
      case "disability":
        return renderDisabilityStep();
      case "religion":
        return renderReligionStep();
      case "age":
        return renderAgeStep();
      case "privacy":
        return renderPrivacyStep();
      case "complete":
        return renderCompleteStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  ((currentStep + 1) / ONBOARDING_STEPS.length) * 100
                }%`,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentStep + 1} of {ONBOARDING_STEPS.length}
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {isEditing && (
          <TouchableOpacity
            style={[styles.navButton, styles.skipButton]}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <View style={styles.navButtonsRight}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.backButton]}
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={
              currentStep === ONBOARDING_STEPS.length - 1
                ? handleComplete
                : handleNext
            }
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading
                ? "Saving..."
                : currentStep === ONBOARDING_STEPS.length - 1
                ? isEditing
                  ? "Update Profile"
                  : "Complete Setup"
                : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.card,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  bulletPoints: {
    alignSelf: "stretch",
    marginTop: 20,
  },
  bulletPoint: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
    paddingHorizontal: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 15,
  },
  optionsContainer: {
    alignSelf: "stretch",
  },
  nameInput: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: theme.colors.inputBackground,
    marginTop: 20,
  },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  optionTextSelected: {
    color: theme.colors.textOnPrimary,
  },
  pickerContainer: {
    alignSelf: "stretch",
    borderWidth: 2,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
  },
  iosPicker: {
    height: 200,
  },
  androidPicker: {
    height: 50,
  },
  iosPickerItem: {
    height: 200,
  },
  toggleContainer: {
    flexDirection: "row",
    alignSelf: "stretch",
  },
  toggleButton: {
    flex: 1,
    padding: theme.spacing.md,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: theme.colors.card,
  },
  toggleButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  toggleTextSelected: {
    color: theme.colors.textOnPrimary,
  },
  privacyOptions: {
    alignSelf: "stretch",
  },
  privacyOption: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
  },
  privacyOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight + "20",
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginLeft: 10,
  },
  privacyDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 20,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
  },
  toggleLabel: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.border,
    padding: 2,
    justifyContent: "center",
  },
  switchActive: {
    backgroundColor: theme.colors.primary,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.card,
    alignSelf: "flex-start",
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  navButtonsRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  skipButton: {
    backgroundColor: "transparent",
  },
  skipButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  backButton: {
    backgroundColor: "transparent",
    marginRight: 10,
  },
  backButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
  },
  nextButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  otherInputContainer: {
    alignSelf: "stretch",
    marginTop: 20,
  },
  otherInputLabel: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
    fontWeight: "500",
  },
  otherInput: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.card,
  },
});
