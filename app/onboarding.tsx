import React, { useState, useEffect } from "react";
import { theme } from "src/styles/theme";

import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { AppText as Text } from "@/components/AppText";
import { AppTextInput as TextInput } from "../src/components/AppTextInput";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { fetchUserProfile } from "src/store/userSlice";
import { getDemographicOptions } from "@/constants/demographicOptions";
import { notificationService } from "src/services/notificationService";
import { supabase } from "@/services/supabase";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { useAuth } from "@/providers/AuthProvider";
import { commonStyles } from "@/styles/common";
import { useTranslation } from "react-i18next";

const getOnboardingSteps = (t: (key: string) => string) => [
  { id: "welcome", title: t("onboarding.welcome_to_truguide") },
  { id: "name", title: t("onboarding.whats_your_name") },
  { id: "race", title: t("onboarding.race_ethnicity") },
  { id: "gender", title: t("onboarding.gender_identity") },
  { id: "lgbtq", title: t("onboarding.lgbtq_identity") },
  { id: "disability", title: t("onboarding.disability_status") },
  { id: "religion", title: t("onboarding.religious_identity") },
  { id: "age", title: t("onboarding.age_range") },
  { id: "privacy", title: t("onboarding.privacy") },
];

const FIELD_TO_STEP_MAP: { [key: string]: number } = {
  name: 1,
  race_ethnicity: 2,
  gender: 3,
  lgbtq_status: 4,
  disability_status: 5,
  religion: 6,
  age_range: 7,
  privacy_level: 8,
};

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const ONBOARDING_STEPS = getOnboardingSteps(t);

  const dispatch = useAppDispatch();
  const { user, refreshOnboardingStatus, appleUserName, setAppleName } =
    useAuth();
  const { profile } = useAppSelector((state) => state.user);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [loading] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: appleUserName || "",
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

  // Get navigation params
  const params = useLocalSearchParams();
  const jumpToField = params.jumpToField as string | undefined;

  // Jump to specific field if param provided
  useEffect(() => {
    if (jumpToField && FIELD_TO_STEP_MAP[jumpToField] !== undefined) {
      setCurrentStep(FIELD_TO_STEP_MAP[jumpToField]);
    }
  }, [jumpToField]);

  useEffect(() => {
    // Check if user just confirmed email (within last 2 minutes)
    if (user?.email_confirmed_at) {
      const confirmedTime = new Date(user.email_confirmed_at).getTime();
      const isRecentConfirmation = confirmedTime > Date.now() - 120000; // 2 minutes
      setShowWelcomeBanner(isRecentConfirmation);
    }
  }, [user]);

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

  // Validate mandatory fields before allowing next
  const validateMandatoryFields = (stepId: string): boolean => {
    // Only validate on mandatory field steps
    if (stepId === "name") {
      if (!formData.full_name || formData.full_name.trim() === "") {
        notify.error(
          t("onboarding.name_or_nickname"),
          t("common.required_field"),
        );
        return false;
      }
    }
    if (stepId === "race") {
      if (formData.race_ethnicity.length === 0) {
        notify.error(
          t("onboarding.select_one_race_ethnicity"),
          t("common.required_field"),
        );
        return false;
      }
    }

    if (stepId === "gender") {
      if (!formData.gender || formData.gender === "") {
        notify.error(
          t("onboarding.select_your_gender"),
          t("common.required_field"),
        );
        return false;
      }
    }

    if (stepId === "lgbtq") {
      // lgbtq_status is boolean, so it's always set (defaults to false)
      // No validation needed, just acknowledge user saw it
      return true;
    }

    return true;
  };

  // Load existing profile data when component mounts
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserProfile(user.id));
    }
  }, [user?.id, dispatch]);

  // Pre-populate form when profile data is available
  useEffect(() => {
    if (profile && profile.id === user?.id) {
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
        setCurrentStep(1);
        // Parse race/ethnicity array and handle "Other" values
        const fullName = profile.full_name || "";
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

        profile.disability_status?.forEach((disability: string) => {
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
          level: string | null | undefined,
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
          full_name: fullName,
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

        if (appleUserName && !formData.full_name) {
          setFormData((prev) => ({
            ...prev,
            full_name: appleUserName,
          }));
        }
      }
    }
  }, [profile, appleUserName]);

  const handleNext = async () => {
    const currentStepId = ONBOARDING_STEPS[currentStep].id;

    // Validate mandatory fields before proceeding
    if (!validateMandatoryFields(currentStepId)) {
      return;
    }
    let nextStep = currentStep + 1;
    // Skip location step when editing existing profile
    if (isEditing && ONBOARDING_STEPS[nextStep]?.id === "location") {
      nextStep++;
    }

    if (nextStep < ONBOARDING_STEPS.length) {
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setAppleName(null);

    if (!user?.id) {
      notify.error(t("onboarding.user_session_not_found_please_log_in"));
      return;
    }

    const processedData = {
      ...formData,
      race_ethnicity: formData.race_ethnicity.map((race) =>
        race === "Other" && otherInputs.race_other
          ? `Other: ${otherInputs.race_other}`
          : race,
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
          : disability,
      ),
    };

    try {
      // 1. FIRST: Ensure profiles entry exists
      await supabase
        .from("profiles")
        .insert({ user_id: user.id, onboarding_complete: false })
        .select()
        .single()
        .then((result) => {
          // Ignore duplicate key errors (profile already exists)
          if (result.error && result.error.code !== "23505") {
            throw result.error;
          }
        });

      // 2. Save to user_profiles
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      let profileResult;

      if (existingProfile) {
        profileResult = await supabase
          .from("user_profiles")
          .update({
            full_name: processedData.full_name,
            race_ethnicity: processedData.race_ethnicity,
            gender: processedData.gender,
            lgbtq_status: processedData.lgbtq_status,
            disability_status: processedData.disability_status,
            religion: processedData.religion,
            age_range: processedData.age_range,
            privacy_level: processedData.privacy_level,
            show_demographics: processedData.show_demographics,
          })
          .eq("id", user.id)
          .select()
          .single();
      } else {
        profileResult = await supabase
          .from("user_profiles")
          .insert({
            id: user.id,
            full_name: processedData.full_name,
            race_ethnicity: processedData.race_ethnicity,
            gender: processedData.gender,
            lgbtq_status: processedData.lgbtq_status,
            disability_status: processedData.disability_status,
            religion: processedData.religion,
            age_range: processedData.age_range,
            privacy_level: processedData.privacy_level,
            show_demographics: processedData.show_demographics,
          })
          .select()
          .single();
      }

      if (profileResult.error) {
        notify.error(t("onboarding.failed_to_save_profile_please_try_again"));
        return;
      }

      // 3. Mark onboarding complete in profiles
      const { error: profilesError } = await supabase
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("user_id", user.id)
        .select();

      if (profilesError) {
        console.error("Failed to update profiles:", profilesError);
        notify.error(t("onboarding.failed_to_complete_onboarding_please"));
        return;
      }

      // 4. Update Redux and refresh auth state
      await dispatch(fetchUserProfile(user.id)).unwrap();
      await refreshOnboardingStatus();
      const AppName = "TruGuide";
      notify.success(
        isEditing
          ? t("onboarding.profile_updated_text")
          : t("onboarding.profile_setup_complete"),
        isEditing
          ? t("onboarding.profile_updated")
          : t("common.welcome", { appName: AppName }),
      );

      // 5. Register push notifications for new users
      if (!isEditing && user?.id) {
        const pushToken =
          await notificationService.registerForPushNotifications();
        if (pushToken) {
          await notificationService.savePushToken(user.id, pushToken);
        }
      }
      if (isEditing) {
        router.replace("/(tabs)/profile");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      logger.error("Profile save error:", error);
      notify.error(t("onboarding.failed_to_save_profile_please_try_again"));
    }
  };

  const handleSkip = () => {
    if (isEditing) {
      // If editing existing profile, allow cancel back to main app
      router.push("/(tabs)/profile");
    } else {
      // If initial setup, show alert that profile is required
      notify.info(
        t("onboarding.profile_required_text"),
        t("profile.profile_required"),
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
          disability_status: [t("onboarding.disability_none")],
        });
      }
    } else {
      // For any other disability, remove "None" if it exists and toggle the selection
      const updatedStatus = formData.disability_status.filter(
        (d) => d !== t("onboarding.disability_none"),
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
      <Text style={styles.stepTitle}>
        {t("onboarding.welcome_to_truguide")}
      </Text>
      <Text style={styles.stepDescription}>
        {t("onboarding.to_provide_personalized_safety")}
      </Text>
      <Text
        style={[
          styles.stepDescription,
          { fontWeight: "600", color: theme.colors.text },
        ]}
      >
        {t("onboarding.this_setup_is_required_to_access")}
      </Text>
      {showWelcomeBanner && currentStep === 0 && (
        <View style={styles.welcomeBanner}>
          <View style={styles.welcomeBannerContent}>
            <Text style={styles.welcomeBannerIcon}>
              {t("onboarding.unknown")}
            </Text>
            <View style={styles.welcomeBannerText}>
              <Text style={styles.welcomeBannerTitle}>
                {t("onboarding.email_confirmed")}
              </Text>
              <Text style={styles.welcomeBannerSubtitle}>
                {t("onboarding.welcome_to_truguide_lets_personalize")}
              </Text>
            </View>
          </View>
        </View>
      )}
      <View style={styles.bulletPoints}>
        <View style={styles.bulletPoint}>
          <Ionicons
            name="shield-checkmark"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.bulletText}>
            {t("onboarding.get_safety_ratings_personalized_for")}
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Ionicons name="map" size={20} color={theme.colors.primary} />
          <Text style={styles.bulletText}>
            {t("onboarding.see_location_safety_from_your")}
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Ionicons name="people" size={20} color={theme.colors.primary} />
          <Text style={styles.bulletText}>
            {t("onboarding.connect_with_travelers_who_share_your")}
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Ionicons name="lock-closed" size={20} color={theme.colors.primary} />
          <Text style={styles.bulletText}>
            {t("onboarding.your_data_is_private_and_secure")}
          </Text>
        </View>
      </View>
    </View>
  );
  const renderNameStep = () => (
    <View style={styles.otherInputContainer}>
      <Text style={styles.stepTitle}>
        {t("onboarding.what_is_your_name")}{" "}
        <Text style={commonStyles.requiredAsterisk}>{t("common.unknown")}</Text>
      </Text>
      <Text style={styles.stepDescription}>
        {t("onboarding.this_helps_personalize_your_experience")}
      </Text>
      <Text style={styles.helpText}>
        {t("onboarding.help_others_recognise_your_profile_and")}
      </Text>
      <TextInput
        style={styles.nameInput}
        placeholder={t("common.name_or_nickname")}
        value={formData.full_name}
        onChangeText={(text) => setFormData({ ...formData, full_name: text })}
        autoCapitalize="words"
        autoComplete="name"
      />
    </View>
  );

  const renderRaceStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {t("onboarding.race_ethnicity")}{" "}
        <Text style={commonStyles.requiredAsterisk}>{t("common.unknown")}</Text>
      </Text>
      <Text style={styles.stepDescription}>
        {t("onboarding.select_all_that_apply_this_helps_us")}
      </Text>
      <Text style={styles.helpText}>
        {t("onboarding.see_safety_ratings_from_people_like_you")}
      </Text>
      <View style={styles.optionsContainer}>
        {getDemographicOptions(t).race.map((race) => (
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
          <Text style={styles.otherInputLabel}>
            {t("onboarding.please_specify")}
          </Text>
          <TextInput
            style={styles.otherInput}
            placeholder={t("onboarding.enter_your_raceethnicity")}
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
      <Text style={styles.stepTitle}>
        {t("onboarding.gender_identity")}{" "}
        <Text style={commonStyles.requiredAsterisk}>{t("common.unknown")}</Text>
      </Text>
      <Text style={styles.stepDescription}>
        {t("onboarding.how_do_you_identify_this_helps_us")}
      </Text>
      <Text style={styles.helpText}>
        {t("onboarding.find_routes_safe_for_your_gender")}
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
            label={t("onboarding.select_gender_identity")}
            value=""
            color={theme.colors.textSecondary}
          />
          {getDemographicOptions(t).gender.map((gender) => (
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
          <Text style={styles.otherInputLabel}>
            {t("onboarding.please_specify")}
          </Text>
          <TextInput
            style={styles.otherInput}
            placeholder={t("onboarding.enter_your_gender_identity")}
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
      <Text style={styles.stepTitle}>
        {t("onboarding.lgbtq_identity")}{" "}
        <Text style={commonStyles.requiredAsterisk}>{t("common.unknown")}</Text>
      </Text>
      <Text style={styles.stepDescription}>
        {t("onboarding.do_you_identify_as_lgbtq_this_helps_us")}
      </Text>
      <Text style={styles.helpText}>
        {t("onboarding.discover_lgbtq_friendly_businesses")}
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
            {t("common.no")}
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
            {t("common.yes")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDisabilityStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {t("onboarding.disability_status")}
        <Text style={styles.optionalBadge}>{t("onboarding.optional")}</Text>
      </Text>
      <Text style={styles.stepDescription}>
        {t("onboarding.select_any_that_apply_this_helps_us")}
      </Text>
      <Text style={styles.helpText}>
        {t("onboarding.see_accessibility_ratings_relevant_to")}
      </Text>
      <View style={styles.optionsContainer}>
        {getDemographicOptions(t).disability.map((disability) => (
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
              <Ionicons name="checkmark" size={20} color={theme.colors.card} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {formData.disability_status.includes("Other") && (
        <View style={styles.otherInputContainer}>
          <Text style={styles.otherInputLabel}>
            {t("onboarding.please_specify")}
          </Text>
          <TextInput
            style={styles.otherInput}
            placeholder={t("onboarding.enter_your_disability_status")}
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
      <Text style={styles.stepTitle}>
        {t("onboarding.religious_identity")}{" "}
        <Text style={styles.optionalBadge}>{t("onboarding.optional")}</Text>
      </Text>
      <Text style={styles.stepDescription}>
        {t("onboarding.what_is_your_religious_or_spiritual")}
      </Text>
      <Text style={styles.helpText}>
        {t("onboarding.unlock_prayerfriendly_recommendations")}
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
          <Picker.Item
            label={t("onboarding.select_religious_identity")}
            value=""
          />
          {getDemographicOptions(t).religion.map((religion) => (
            <Picker.Item key={religion} label={religion} value={religion} />
          ))}
        </Picker>
      </View>

      {formData.religion === "Other" && (
        <View style={styles.otherInputContainer}>
          <Text style={styles.otherInputLabel}>
            {t("onboarding.please_specify")}
          </Text>
          <TextInput
            style={styles.otherInput}
            placeholder={t("onboarding.enter_your_religious_identity")}
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
      <Text style={styles.stepTitle}>
        {t("onboarding.age_range")}{" "}
        <Text style={styles.optionalBadge}>{t("onboarding.optional")}</Text>
      </Text>
      <Text style={styles.stepDescription}>
        {t("onboarding.select_your_age_range")}
      </Text>
      <Text style={styles.helpText}>
        {t("onboarding.see_ratings_from_travelers_in_your_age")}
      </Text>
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
          <Picker.Item label={t("onboarding.select_your_age_range")} value="" />
          {getDemographicOptions(t).age_group.map((age) => (
            <Picker.Item key={age} label={age} value={age} />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderPrivacyStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t("common.privacy_settings")}</Text>
      <Text style={styles.stepDescription}>
        {t("onboarding.choose_how_your_demographic_information")}
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
            <Text style={styles.privacyTitle}>{t("onboarding.public")}</Text>
          </View>
          <Text style={styles.privacyDescription}>
            {t("onboarding.other_users_can_see_your_demographic")}
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
            <Text style={styles.privacyTitle}>{t("common.anonymous")}</Text>
          </View>
          <Text style={styles.privacyDescription}>
            {t("onboarding.your_reviews_are_visible_but_without")}
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
            <Text style={styles.privacyTitle}>{t("onboarding.private")}</Text>
          </View>
          <Text style={styles.privacyDescription}>
            {t("onboarding.only_you_can_see_your_demographic")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {t("onboarding.show_demographics_on_reviews")}
        </Text>
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
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
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
          {currentStep + 1} {t("common.of")} {ONBOARDING_STEPS.length}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View>{renderCurrentStep()}</View>
        </TouchableWithoutFeedback>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {isEditing && (
          <TouchableOpacity
            style={[styles.navButton, styles.skipButton]}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.navButtonsRight}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[styles.navButton, commonStyles.backButton]}
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>{t("common.back")}</Text>
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
                ? t("onboarding.saving")
                : currentStep === ONBOARDING_STEPS.length - 1
                  ? isEditing
                    ? t("onboarding.update_profile")
                    : t("onboarding.travel_safely")
                  : t("common.next")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  welcomeBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderLeftWidth: 0,
    borderLeftColor: theme.colors.primary,
  },
  welcomeBannerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeBannerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  welcomeBannerText: {
    flex: 1,
  },
  welcomeBannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: 4,
  },
  welcomeBannerSubtitle: {
    fontSize: 14,
    color: theme.colors.secondaryDark,
    lineHeight: 20,
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
    fontSize: 18,
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
    fontSize: 18,
    color: theme.colors.text,
    marginLeft: 15,
  },
  optionsContainer: {
    alignSelf: "stretch",
  },
  optionalBadge: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "normal",
  },
  helpText: {
    fontSize: 16,
    color: theme.colors.primary,
    marginTop: 8,
    marginBottom: 16,
    textAlign: "center",
    fontStyle: "italic",
  },
  nameInput: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: theme.colors.inputBackground,
    marginTop: 20,
    width: "100%",
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
    height: 250,
  },
  androidPicker: {
    height: 60,
  },
  iosPickerItem: {
    height: 250,
    fontSize: 26,
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
