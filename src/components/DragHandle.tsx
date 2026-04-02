import React, { useRef } from "react";
import { View, PanResponder, StyleSheet } from "react-native";
import { theme } from "@/styles/theme";
import { useTranslation } from "react-i18next";

const SWIPE_THRESHOLD = 50;

interface DragHandleProps {
  onPress: () => void;
}

export function DragHandle({ onPress }: DragHandleProps) {
  const { t } = useTranslation();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 5,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD) {
          onPress();
        } else if (
          Math.abs(gestureState.dx) < 5 &&
          Math.abs(gestureState.dy) < 5
        ) {
          onPress();
        }
      },
    }),
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={styles.container}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={t("common.close")}
    >
      <View style={styles.indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    width: "100%",
  },
  indicator: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.border,
  },
});
