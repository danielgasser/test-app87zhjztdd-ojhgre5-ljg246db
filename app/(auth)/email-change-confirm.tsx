import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme } from "@/styles/theme";
import { commonStyles } from "@/styles/common";

export default function EmailChangeConfirmScreen() {
  const router = useRouter();

  useEffect(() => {
    // The deep link handler in _layout.tsx will process the email change
    // This component just prevents "Unmatched Route" error and shows a loading state
    // After the _layout handler completes, redirect to profile
    const timer = setTimeout(() => {
      router.replace("/(tabs)/profile");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.text}>Confirming email change...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    marginTop: 20,
    color: theme.colors.text,
    fontSize: 16,
  },
});
