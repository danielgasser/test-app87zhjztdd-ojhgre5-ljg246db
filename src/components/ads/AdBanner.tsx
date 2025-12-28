import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { BannerAd, BannerAdSize, getAdUnitId } from "@/services/adMobService";
import { useSubscriptionTier } from "@/hooks/useFeatureAccess";
import { AdsConsent, AdsConsentStatus } from "react-native-google-mobile-ads";

interface AdBannerProps {
  size?: BannerAdSize;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
}) => {
  const userTier = useSubscriptionTier();
  const [nonPersonalized, setNonPersonalized] = useState(true);

  useEffect(() => {
    const checkConsent = async () => {
      try {
        const consentInfo = await AdsConsent.requestInfoUpdate();
        setNonPersonalized(consentInfo.status !== AdsConsentStatus.OBTAINED);
      } catch (error) {
        setNonPersonalized(true);
      }
    };
    checkConsent();
  }, []);

  // Don't show ads to premium users
  if (userTier !== "free") {
    return null;
  }

  return (
    <View style={styles.specContainer}>
      <BannerAd
        unitId={getAdUnitId("banner")}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: nonPersonalized,
        }}
        onAdFailedToLoad={(error) => {
          console.error("Banner ad failed to load:", error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  specContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
