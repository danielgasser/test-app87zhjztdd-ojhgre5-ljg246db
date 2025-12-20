import React from "react";
import { View, StyleSheet } from "react-native";
import { BannerAd, BannerAdSize, getAdUnitId } from "@/services/adMobService";
import { useSubscriptionTier } from "@/hooks/useFeatureAccess";

interface AdBannerProps {
  size?: BannerAdSize;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
}) => {
  const userTier = useSubscriptionTier();

  // Don't show ads to premium users
  if (userTier !== "free") {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={getAdUnitId("banner")}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          console.error("Banner ad failed to load:", error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
