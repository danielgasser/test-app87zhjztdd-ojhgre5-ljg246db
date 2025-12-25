import React, { useEffect, useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { saveLocation, unsaveLocation } from "@/store/locationsSlice";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useAuth } from "@/providers/AuthProvider";
import { notify } from "@/utils/notificationService";
import { showPremiumPrompt } from "@/store/premiumPromptSlice";
import { commonStyles } from "@/styles/common";

interface SaveLocationButtonProps {
  locationId?: string | null;
  googlePlaceId?: string | null;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  compact?: boolean;
}

export const SaveLocationButton: React.FC<SaveLocationButtonProps> = ({
  locationId,
  googlePlaceId,
  name,
  address,
  latitude,
  longitude,
  compact = false,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { hasAccess } = useFeatureAccess("saveLocations");
  const savedLocations = useAppSelector(
    (state) => state.locations.savedLocations
  );

  const [savedId, setSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if location is already saved
  useEffect(() => {
    if (!user?.id) return;

    const found = savedLocations.find(
      (loc) =>
        (locationId && loc.location_id === locationId) ||
        (googlePlaceId && loc.google_place_id === googlePlaceId)
    );

    setSavedId(found?.id || null);
  }, [savedLocations, locationId, googlePlaceId, user?.id]);

  const handlePress = async () => {
    if (!user?.id) {
      notify.info("Please sign in to save locations");
      return;
    }

    if (!hasAccess) {
      Keyboard.dismiss();
      dispatch(
        showPremiumPrompt({
          feature: "saveLocations",
          description: "Save your favorite locations for quick access anytime.",
        })
      );
      return;
    }

    setLoading(true);

    try {
      if (savedId) {
        // Unsave
        await dispatch(unsaveLocation({ savedLocationId: savedId })).unwrap();
        setSavedId(null);
        notify.success("Location removed from saved");
      } else {
        // Save
        const result = await dispatch(
          saveLocation({
            userId: user.id,
            locationId: locationId || undefined,
            googlePlaceId: googlePlaceId || undefined,
            name,
            address,
            latitude,
            longitude,
          })
        ).unwrap();
        setSavedId(result.id);
        notify.success("Location saved!");
      }
    } catch (error: any) {
      if (error?.code === "23505") {
        notify.info("Location already saved");
      } else {
        notify.error("Failed to save location");
      }
    } finally {
      setLoading(false);
    }
  };

  const isSaved = !!savedId;

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactButton, isSaved && styles.compactButtonSaved]}
        onPress={handlePress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={24}
            color={isSaved ? theme.colors.primary : theme.colors.textSecondary}
          />
        )}
        <Text
          style={[
            styles.compactButtonText,
            isSaved && styles.compactButtonTextSaved,
          ]}
        >
          {isSaved ? "Location Saved" : "Save Location"}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[commonStyles.primaryButton, isSaved && styles.buttonSaved]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <>
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={20}
            color={isSaved ? theme.colors.primary : theme.colors.text}
          />
          <Text
            style={[
              commonStyles.primaryButtonText,
              isSaved && styles.buttonTextSaved,
            ]}
          >
            {isSaved ? "Saved" : "Save"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonSaved: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}15`,
  },
  buttonTextSaved: {
    color: theme.colors.primary,
  },
  compactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  compactButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  compactButtonSaved: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}15`,
  },
  compactButtonTextSaved: {
    color: theme.colors.primary,
  },
});

export default SaveLocationButton;
