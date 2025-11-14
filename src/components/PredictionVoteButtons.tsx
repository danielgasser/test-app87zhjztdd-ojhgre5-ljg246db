import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { supabase } from "@/services/supabase";
import { useAppSelector } from "@/store/hooks";
import { logger } from "@/utils/logger";
import { notify } from "@/utils/notificationService";
import { useAuth } from "@/providers";

interface PredictionVoteButtonsProps {
  locationId: string;
  predictionSource: "community_reviews" | "ml_prediction" | "statistics";
  predictedSafetyScore: number;
  demographicType?: string;
  demographicValue?: string | null;
  initialAccurateCount?: number;
  initialInaccurateCount?: number;
  currentUserVote?: "accurate" | "inaccurate" | null;
  onVoteSuccess?: () => void;
}

// Helper to determine if ID is a UUID (database location) or other identifier
function isUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export default function PredictionVoteButtons({
  locationId,
  predictionSource,
  predictedSafetyScore,
  demographicType,
  demographicValue,
  initialAccurateCount = 0,
  initialInaccurateCount = 0,
  currentUserVote = null,
  onVoteSuccess,
}: PredictionVoteButtonsProps) {
  const [userVote, setUserVote] = useState<"accurate" | "inaccurate" | null>(
    currentUserVote
  );
  const [accurateCount, setAccurateCount] = useState(initialAccurateCount);
  const [inaccurateCount, setInaccurateCount] = useState(
    initialInaccurateCount
  );
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const userId = user?.id;
  const userDemographics = useAppSelector((state) => state.user.profile);

  const handleVote = async (voteType: "accurate" | "inaccurate") => {
    if (!userId) {
      notify.error("Please log in to vote");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        notify.error("Please log in to vote");
        return;
      }
      const payload = {
        ...(isUUID(locationId)
          ? { location_id: locationId }
          : { google_place_id: locationId }),
        vote_type: voteType,
        prediction_source: predictionSource,
        predicted_safety_score: predictedSafetyScore,
        demographic_type: demographicType,
        demographic_value: demographicValue,
        user_demographics: {
          race_ethnicity: userDemographics?.race_ethnicity,
          gender: userDemographics?.gender,
          lgbtq_status: userDemographics?.lgbtq_status,
        },
      };
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/vote-prediction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to vote");
      }

      // Update UI based on action
      if (result.action === "added") {
        setUserVote(voteType);
        if (voteType === "accurate") {
          setAccurateCount((prev) => prev + 1);
        } else {
          setInaccurateCount((prev) => prev + 1);
        }
      } else if (result.action === "removed") {
        setUserVote(null);
        if (voteType === "accurate") {
          setAccurateCount((prev) => Math.max(0, prev - 1));
        } else {
          setInaccurateCount((prev) => Math.max(0, prev - 1));
        }
      } else if (result.action === "switched") {
        setUserVote(voteType);
        if (voteType === "accurate") {
          setAccurateCount((prev) => prev + 1);
          setInaccurateCount((prev) => Math.max(0, prev - 1));
        } else {
          setInaccurateCount((prev) => prev + 1);
          setAccurateCount((prev) => Math.max(0, prev - 1));
        }
      }
      if (onVoteSuccess) {
        onVoteSuccess();
      }
    } catch (error) {
      logger.error("Error voting on prediction:", error);
      console.error("Error voting on prediction:", error);
      notify.error("Failed to submit vote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Was this prediction accurate?</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.voteButton,
            userVote === "accurate" && styles.voteButtonActive,
          ]}
          onPress={() => handleVote("accurate")}
          disabled={loading}
        >
          {loading && userVote === "accurate" ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <>
              <Ionicons
                name={
                  userVote === "accurate"
                    ? "checkmark-circle"
                    : "checkmark-circle-outline"
                }
                size={20}
                color={
                  userVote === "accurate"
                    ? theme.colors.success
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.voteCount,
                  userVote === "accurate" && styles.voteCountActive,
                ]}
              >
                {accurateCount}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.voteButton,
            userVote === "inaccurate" && styles.voteButtonActive,
          ]}
          onPress={() => handleVote("inaccurate")}
          disabled={loading}
        >
          {loading && userVote === "inaccurate" ? (
            <ActivityIndicator size="small" color={theme.colors.error} />
          ) : (
            <>
              <Ionicons
                name={
                  userVote === "inaccurate"
                    ? "close-circle"
                    : "close-circle-outline"
                }
                size={20}
                color={
                  userVote === "inaccurate"
                    ? theme.colors.error
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.voteCount,
                  userVote === "inaccurate" && styles.voteCountActive,
                ]}
              >
                {inaccurateCount}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  voteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  voteButtonActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  voteCountActive: {
    color: theme.colors.primary,
  },
});
