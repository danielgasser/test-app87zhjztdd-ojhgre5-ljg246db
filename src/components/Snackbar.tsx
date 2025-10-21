import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";

const { width } = Dimensions.get("window");

export type SnackbarType = "success" | "error" | "info";

interface SnackbarProps {
  visible: boolean;
  message: string;
  type: SnackbarType;
  duration?: number;
  onDismiss: () => void;
  actionText?: string;
  onActionPress?: () => void;
  title?: string;
}

const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  type,
  duration = 3000,
  onDismiss,
  actionText,
  onActionPress,
  title,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Slide up
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();

      // Auto dismiss if no action
      if (!actionText && duration > 0) {
        const timer = setTimeout(() => {
          dismissSnackbar();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      // Slide down
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const dismissSnackbar = () => {
    Animated.timing(translateY, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "alert-circle";
      case "info":
        return "information-circle";
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return theme.colors.secondary; // Green
      case "error":
        return theme.colors.error; // Red
      case "info":
        return theme.colors.primary; // Blue
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor(), transform: [{ translateY }] },
      ]}
    >
      <Ionicons name={getIcon()} size={24} color={theme.colors.background} />

      <View style={styles.textContainer}>
        {/* WRAP TEXT */}
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
      {actionText && onActionPress && (
        <TouchableOpacity onPress={onActionPress} style={styles.actionButton}>
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={dismissSnackbar} style={styles.closeButton}>
        <Ionicons name="close" size={20} color={theme.colors.background} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: theme.colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 9999,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  message: {
    flex: 1,
    color: theme.colors.background,
    fontSize: 14, // Smaller than before
    fontWeight: "500",
    // Remove marginLeft since it's in textContainer now
  },
  actionButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default Snackbar;
