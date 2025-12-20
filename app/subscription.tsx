import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Paywall } from "@/components/subscription/Paywall";
import { theme } from "@/styles/theme";

export default function SubscriptionScreen() {
  const handlePurchaseComplete = () => {
    router.back();
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Paywall
        onPurchaseComplete={handlePurchaseComplete}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
