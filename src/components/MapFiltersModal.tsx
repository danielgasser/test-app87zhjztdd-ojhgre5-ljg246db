import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useAppDispatch } from "@/store/hooks";
import { showPremiumPrompt } from "@/store/premiumPromptSlice";
import { GlobalPremiumPromptModal } from "./PremiumGate";
import { commonStyles } from "@/styles/common";
export interface MapFilters {
  minSafetyRating: number | null; // null = show all, 2/3/4 = minimum rating
  hasReviews: boolean; // Only show locations with reviews
  hasDemographicReviews: boolean; // Only show locations with reviews from my demographic
  placeTypes: string[]; // Empty = show all
  useDemographicScore: boolean; // Whether to use demographic score in filtering
  showMyReviewsOnly: boolean;
}

export const DEFAULT_FILTERS: MapFilters = {
  minSafetyRating: null,
  hasReviews: false,
  hasDemographicReviews: false,
  placeTypes: [],
  useDemographicScore: false,
  showMyReviewsOnly: false,
};

const PLACE_TYPE_OPTIONS = [
  { value: "restaurant", label: "Restaurants", icon: "restaurant" },
  { value: "gas_station", label: "Gas Stations", icon: "car" },
  { value: "hotel", label: "Hotels", icon: "bed" },
  { value: "store", label: "Stores", icon: "storefront" },
  { value: "bar", label: "Bars & Nightlife", icon: "wine" },
  { value: "cafe", label: "Cafes", icon: "cafe" },
];

const RATING_OPTIONS = [
  { value: null, label: "Show All" },
  { value: 2, label: "2+ Stars" },
  { value: 3, label: "3+ Stars" },
  { value: 4, label: "4+ Stars" },
];

interface MapFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: MapFilters;
  onApplyFilters: (filters: MapFilters) => void;
  showMyReviewsFilter?: boolean;
}

export const MapFiltersModal: React.FC<MapFiltersModalProps> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  showMyReviewsFilter = false,
}) => {
  const dispatch = useAppDispatch();
  const { hasAccess } = useFeatureAccess("advancedFilters");
  const { hasAccess: hasDemographicAccess } =
    useFeatureAccess("demographicFilter");

  const [localFilters, setLocalFilters] = useState<MapFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, visible]);

  const handleToggleMyReviews = () => {
    setLocalFilters((prev) => ({
      ...prev,
      showMyReviewsOnly: !prev.showMyReviewsOnly,
    }));
  };

  const handleRatingSelect = (rating: number | null) => {
    setLocalFilters((prev) => ({ ...prev, minSafetyRating: rating }));
  };

  const handleToggleHasReviews = () => {
    setLocalFilters((prev) => ({ ...prev, hasReviews: !prev.hasReviews }));
  };

  const handleToggleDemographicReviews = () => {
    setLocalFilters((prev) => ({
      ...prev,
      hasDemographicReviews: !prev.hasDemographicReviews,
    }));
  };

  const handlePlaceTypeToggle = (placeType: string) => {
    setLocalFilters((prev) => {
      const types = prev.placeTypes.includes(placeType)
        ? prev.placeTypes.filter((t) => t !== placeType)
        : [...prev.placeTypes, placeType];
      return { ...prev, placeTypes: types };
    });
  };
  const handleToggleDemographicScore = () => {
    setLocalFilters((prev) => ({
      ...prev,
      useDemographicScore: !prev.useDemographicScore,
    }));
  };
  const handleApply = () => {
    const hasAdvancedFilters =
      localFilters.minSafetyRating !== null ||
      localFilters.hasReviews ||
      localFilters.hasDemographicReviews ||
      localFilters.placeTypes.length > 0;

    const hasDemographicFilter = localFilters.useDemographicScore;

    // If free user tries to apply advanced filters, show premium prompt
    if (hasAdvancedFilters && !hasAccess) {
      dispatch(
        showPremiumPrompt({
          feature: "advancedFilters",
          description: "Apply filters to find exactly what you're looking for.",
        })
      );
      return;
    }

    // If free user tries to apply demographic filter, show premium prompt
    if (hasDemographicFilter && !hasDemographicAccess) {
      dispatch(
        showPremiumPrompt({
          feature: "demographicFilter",
          description:
            "See safety scores specific to your demographic profile.",
        })
      );
      return;
    }

    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_FILTERS);
  };

  const hasActiveFilters =
    localFilters.minSafetyRating !== null ||
    localFilters.hasReviews ||
    localFilters.hasDemographicReviews ||
    localFilters.placeTypes.length > 0 ||
    localFilters.useDemographicScore;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.specContainer}>
          {/* Header */}
          <View style={commonStyles.header}>
            <Text style={commonStyles.headerTitle}>Filter Locations</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Safety Rating Filter */}
            <View style={styles.section}>
              <Text style={styles.specSectionTitle}>Minimum Safety Rating</Text>
              <View style={styles.optionsRow}>
                {RATING_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.optionChip,
                      localFilters.minSafetyRating === option.value &&
                        styles.optionChipActive,
                    ]}
                    onPress={() => handleRatingSelect(option.value)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        localFilters.minSafetyRating === option.value &&
                          styles.optionChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {!hasAccess && option.value !== null && (
                      <Ionicons
                        name="lock-closed"
                        size={12}
                        color={theme.colors.textSecondary}
                        style={styles.lockIcon}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Review Filters */}
            <View style={styles.section}>
              <Text style={styles.specSectionTitle}>Reviews</Text>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={handleToggleHasReviews}
              >
                <View style={styles.toggleLabel}>
                  <Text style={styles.toggleText}>Has reviews</Text>
                  {!hasAccess && (
                    <Ionicons
                      name="lock-closed"
                      size={14}
                      color={theme.colors.textSecondary}
                    />
                  )}
                </View>
                <View
                  style={[
                    styles.checkbox,
                    localFilters.hasReviews && styles.checkboxActive,
                  ]}
                >
                  {localFilters.hasReviews && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={theme.colors.background}
                    />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={handleToggleDemographicReviews}
              >
                <View style={styles.toggleLabel}>
                  <Text style={styles.toggleText}>
                    Reviewed by my demographic
                  </Text>
                  {!hasDemographicAccess && (
                    <Ionicons
                      name="lock-closed"
                      size={14}
                      color={theme.colors.textSecondary}
                    />
                  )}
                </View>
                <View
                  style={[
                    styles.checkbox,
                    localFilters.hasDemographicReviews && styles.checkboxActive,
                  ]}
                >
                  {localFilters.hasDemographicReviews && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={theme.colors.background}
                    />
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={handleToggleDemographicScore}
              >
                <View style={styles.toggleLabel}>
                  <Text style={styles.toggleText}>
                    Use my demographic safety scores
                  </Text>
                  {!hasAccess && (
                    <Ionicons
                      name="lock-closed"
                      size={14}
                      color={theme.colors.textSecondary}
                    />
                  )}
                </View>
                <View
                  style={[
                    styles.checkbox,
                    localFilters.useDemographicScore && styles.checkboxActive,
                  ]}
                >
                  {localFilters.useDemographicScore && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={theme.colors.background}
                    />
                  )}
                </View>
              </TouchableOpacity>
              {showMyReviewsFilter && (
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={handleToggleMyReviews}
                >
                  <View style={styles.toggleLabel}>
                    <Text style={styles.toggleText}>My reviews only</Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      localFilters.showMyReviewsOnly && styles.checkboxActive,
                    ]}
                  >
                    {localFilters.showMyReviewsOnly && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={theme.colors.background}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Place Type Filter */}
            <View style={styles.section}>
              <Text style={commonStyles.sectionTitle}>Place Type</Text>
              <View style={styles.placeTypesGrid}>
                {PLACE_TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.placeTypeChip,
                      localFilters.placeTypes.includes(option.value) &&
                        styles.placeTypeChipActive,
                    ]}
                    onPress={() => handlePlaceTypeToggle(option.value)}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={18}
                      color={
                        localFilters.placeTypes.includes(option.value)
                          ? theme.colors.background
                          : theme.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.placeTypeText,
                        localFilters.placeTypes.includes(option.value) &&
                          styles.placeTypeTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {!hasAccess && (
                      <Ionicons
                        name="lock-closed"
                        size={12}
                        color={theme.colors.textSecondary}
                        style={styles.lockIcon}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={commonStyles.footer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              disabled={!hasActiveFilters}
            >
              <Text
                style={[
                  styles.resetButtonText,
                  !hasActiveFilters && styles.resetButtonTextDisabled,
                ]}
              >
                Reset
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <GlobalPremiumPromptModal />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  specContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  specSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionChipText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  optionChipTextActive: {
    color: theme.colors.background,
    fontWeight: "600",
  },
  lockIcon: {
    marginLeft: 4,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  toggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  placeTypesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  placeTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  placeTypeChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  placeTypeText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  placeTypeTextActive: {
    color: theme.colors.background,
    fontWeight: "600",
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  resetButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.background,
  },
});

export default MapFiltersModal;
