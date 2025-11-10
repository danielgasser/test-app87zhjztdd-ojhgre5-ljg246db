import React, { useState, useEffect } from "react";
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
import { notify } from "@/utils/notificationService";

interface VoteButtonsProps {
  reviewId: string;
  initialHelpfulCount: number;
  initialUnhelpfulCount: number;
  currentUserVote?: "helpful" | "unhelpful" | null;
  onVoteChange?: () => void;
}

export default function VoteButtons({
  reviewId,
  initialHelpfulCount,
  initialUnhelpfulCount,
  currentUserVote,
  onVoteChange,
}: VoteButtonsProps) {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [helpfulCount, setHelpfulCount] = useState(initialHelpfulCount);
  const [unhelpfulCount, setUnhelpfulCount] = useState(initialUnhelpfulCount);
  const [userVote, setUserVote] = useState<"helpful" | "unhelpful" | null>(
    currentUserVote || null
  );
  const [loading, setLoading] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setHelpfulCount(initialHelpfulCount);
    setUnhelpfulCount(initialUnhelpfulCount);
    setUserVote(currentUserVote || null);
  }, [initialHelpfulCount, initialUnhelpfulCount, currentUserVote]);

  const handleVote = async (voteType: "helpful" | "unhelpful") => {
    if (!userId) {
      notify.error("Please log in to vote on reviews", "Login Required");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        notify.error(
          "Session expired. Please log in again.",
          "Authentication Error"
        );
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/vote-review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            review_id: reviewId,
            vote_type: voteType,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to vote");
      }

      const result = await response.json();

      if (result.success) {
        // Update local state based on action
        if (result.action === "added") {
          if (voteType === "helpful") {
            setHelpfulCount((prev) => prev + 1);
          } else {
            setUnhelpfulCount((prev) => prev + 1);
          }
          setUserVote(voteType);
        } else if (result.action === "removed") {
          if (voteType === "helpful") {
            setHelpfulCount((prev) => prev - 1);
          } else {
            setUnhelpfulCount((prev) => prev - 1);
          }
          setUserVote(null);
        } else if (result.action === "updated") {
          // Switched vote
          if (voteType === "helpful") {
            setHelpfulCount((prev) => prev + 1);
            setUnhelpfulCount((prev) => prev - 1);
          } else {
            setHelpfulCount((prev) => prev - 1);
            setUnhelpfulCount((prev) => prev + 1);
          }
          setUserVote(voteType);
        }

        onVoteChange?.();
      }
    } catch (error) {
      console.error("Vote error:", error);
      notify.error("Failed to vote. Please try again.", "Error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.voteButton,
          userVote === "helpful" && styles.voteButtonActive,
        ]}
        onPress={() => handleVote("helpful")}
        disabled={loading}
      >
        <Ionicons
          name={userVote === "helpful" ? "thumbs-up" : "thumbs-up-outline"}
          size={20}
          color={
            userVote === "helpful"
              ? theme.colors.primary
              : theme.colors.textSecondary
          }
        />
        <Text
          style={[
            styles.voteCount,
            userVote === "helpful" && styles.voteCountActive,
          ]}
        >
          {helpfulCount}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.voteButton,
          userVote === "unhelpful" && styles.voteButtonActive,
        ]}
        onPress={() => handleVote("unhelpful")}
        disabled={loading}
      >
        <Ionicons
          name={
            userVote === "unhelpful" ? "thumbs-down" : "thumbs-down-outline"
          }
          size={20}
          color={
            userVote === "unhelpful"
              ? theme.colors.error
              : theme.colors.textSecondary
          }
        />
        <Text
          style={[
            styles.voteCount,
            userVote === "unhelpful" && styles.voteCountActive,
          ]}
        >
          {unhelpfulCount}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  voteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.inputBackground,
  },
  voteButtonActive: {
    backgroundColor: theme.colors.primaryLight,
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
