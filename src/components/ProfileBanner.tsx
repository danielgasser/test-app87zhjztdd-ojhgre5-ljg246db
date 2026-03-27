import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dismissBanner } from "@/store/profileBannerSlice";
import { APP_CONFIG } from "@/config/appConfig";
import { FIELD_DISPLAY_NAMES } from "@/constants/profileRequirements";
import { theme } from "@/styles/theme";
import type { BannerType } from "@/store/profileBannerSlice";
import { commonStyles } from "@/styles/common";
import { useTranslation } from "react-i18next";

interface ProfileBannerProps {
  bannerType: string;
  missingFields: string[];
  visible: boolean;
  onDismiss?: () => void;
}

const getBannerMessages = (t: (key: string) => string) =>
  ({
    [APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES
      .INCOMPLETE_PROFILE_GENERAL]: {
      icon: "information-circle" as any,
      title: "📊" + t("profile.complete_your_profile"),
      description: t("profile.complete_your_profile_description"),
    },
    [APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES
      .RECOMMENDATIONS_INCOMPLETE]: {
      icon: "star" as any,
      title: t("profile.limited_recommendations"),
      description: t("profile.limited_recommendations_description"),
    },
    [APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES.ROUTING_INCOMPLETE]: {
      icon: "warning" as any,
      title: t("profile.basic_routing_only"),
      description: t("profile.basic_routing_only_description"),
    },
    [APP_CONFIG.PROFILE_COMPLETION.BANNERS.BANNER_TYPES.SIMILARITY_FAILED]: {
      icon: "close-circle" as any,
      title: t("profile.cant_find_similar_users"),
      description: t("profile.cant_find_similar_users_description"),
    },
  }) as Record<string, { icon: any; title: string; description: string }>;

export default function ProfileBanner({
  bannerType,
  missingFields,
  visible,
  onDismiss,
}: ProfileBannerProps) {
  const { t } = useTranslation();
  const BANNER_MESSAGES = getBannerMessages(t);

  const dispatch = useAppDispatch();
  const dismissal = useAppSelector(
    (state) => state.profileBanner.dismissedBanners[bannerType as BannerType],
  );

  // Get banner content
  const bannerContent = BANNER_MESSAGES[bannerType];

  // Check if this is the 3rd show (change button to "Don't Show Again")
  const maxShows = APP_CONFIG.PROFILE_COMPLETION.BANNERS.MAX_SHOWS_PER_FEATURE;
  const showCount = dismissal?.showCount || 0;
  const isLastShow = showCount >= maxShows - 1;

  if (!visible) return null;

  const handleCompleteProfile = () => {
    if (missingFields.length > 0) {
      router.push({
        pathname: "/onboarding",
        params: { jumpToField: missingFields[0] },
      });
    } else {
      router.push("/onboarding");
    }
    if (onDismiss) onDismiss();
  };

  const handleDismiss = (permanent: boolean = false) => {
    dispatch(
      dismissBanner({ bannerType: bannerType as BannerType, permanent }),
    );
    if (onDismiss) onDismiss();
  };

  return (
    <View style={styles.specContainer}>
      <View style={styles.content}>
        {/* Icon and Title */}
        <View style={commonStyles.header}>
          <Ionicons
            name={bannerContent.icon}
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.title}>{bannerContent.title}</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{bannerContent.description}</Text>

        {/* Missing Fields List */}
        {missingFields.length > 0 && (
          <View style={styles.missingFieldsContainer}>
            <Text style={styles.missingFieldsLabel}>
              {t("profile.missing")}
            </Text>
            <Text style={styles.missingFieldsList}>
              {missingFields
                .map((field) => FIELD_DISPLAY_NAMES[field])
                .join(", ")}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[commonStyles.primaryButton]}
            onPress={handleCompleteProfile}
          >
            <Text style={commonStyles.primaryButtonText}>
              {t("profile.complete_profile")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[commonStyles.primaryButton, commonStyles.secondaryButton]}
            onPress={() => handleDismiss(isLastShow)}
          >
            <Text style={commonStyles.secondaryButtonText}>
              {isLastShow ? "Don't Show Again" : "Maybe Later"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  specContainer: {
    margin: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primary,
    shadowColor: theme.colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  missingFieldsContainer: {
    backgroundColor: theme.colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  missingFieldsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  missingFieldsList: {
    fontSize: 13,
    color: theme.colors.text,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
  },
});
