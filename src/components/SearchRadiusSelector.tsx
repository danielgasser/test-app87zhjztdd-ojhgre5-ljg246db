import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { APP_CONFIG } from "@/utils/appConfig";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateSearchRadius } from "@/store/userSlice";

export default function SearchRadiusSelector() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const currentRadius = useAppSelector((state) => state.user.searchRadiusKm);
  const [selectedRadius, setSelectedRadius] = useState(currentRadius);
  const [showSaved, setShowSaved] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const options = APP_CONFIG.DISTANCE.SEARCH_RADIUS_OPTIONS;

  // Update local state when Redux state changes
  useEffect(() => {
    setSelectedRadius(currentRadius);
  }, [currentRadius]);

  // Debounced save to database
  useEffect(() => {
    if (selectedRadius === currentRadius) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      if (userId) {
        dispatch(updateSearchRadius({ userId, radiusKm: selectedRadius }))
          .unwrap()
          .then(() => {
            // Show "Saved" indicator
            setShowSaved(true);
            Animated.sequence([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.delay(1500),
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => setShowSaved(false));
          })
          .catch((error) => {
            console.error("Failed to save radius:", error);
          });
      }
    }, 300); // 300ms debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [selectedRadius, currentRadius, userId, dispatch, fadeAnim]);

  const handleSelect = (value: number) => {
    setSelectedRadius(value);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search Radius</Text>
        {showSaved && (
          <Animated.View style={[styles.savedIndicator, { opacity: fadeAnim }]}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.savedText}>Saved</Text>
          </Animated.View>
        )}
      </View>
      <Text style={styles.subtitle}>How far to search for locations</Text>

      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segment,
              selectedRadius === option.value && styles.segmentActive,
            ]}
            onPress={() => handleSelect(option.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                selectedRadius === option.value && styles.segmentTextActive,
              ]}
            >
              {option.label}
            </Text>
            <Text
              style={[
                styles.segmentUnit,
                selectedRadius === option.value && styles.segmentUnitActive,
              ]}
            ></Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description Labels */}
      <View style={styles.labels}>
        {options.map((option) => (
          <Text
            key={option.value}
            style={[
              styles.label,
              selectedRadius === option.value && styles.labelActive,
            ]}
          >
            {option.description}
          </Text>
        ))}
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle"
          size={16}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.infoText}>
          {selectedRadius >= 999999
            ? "Searching globally - all countries"
            : `Currently showing locations within ${selectedRadius} km of map center`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  savedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  savedText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginRight: 2,
  },
  segmentTextActive: {
    color: theme.colors.background,
  },
  segmentUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  segmentUnitActive: {
    color: theme.colors.background,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
    flex: 1,
  },
  labelActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.inputBackground,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
