import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import {
  notificationStyles,
  getSnackbarBackgroundColor,
  getSnackbarIcon,
} from "@/styles/notificationStyles";
const styles = notificationStyles;

const { width } = Dimensions.get("window");

export type SnackbarType = "success" | "warning" | "error" | "info";

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

  const getIcon = () => getSnackbarIcon(type);

  const getBackgroundColor = () => getSnackbarBackgroundColor(type);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.snackbarContainer,
        { backgroundColor: getBackgroundColor(), transform: [{ translateY }] },
      ]}
    >
      <Ionicons name={getIcon()} size={24} color={theme.colors.background} />

      <View style={styles.snackbarTextContainer}>
        {/* WRAP TEXT */}
        {title && <Text style={styles.snackbarTitle}>{title}</Text>}
        <Text style={styles.snackbarMessage}>{message}</Text>
      </View>
      {actionText && onActionPress && (
        <TouchableOpacity
          onPress={onActionPress}
          style={styles.snackbarActionButton}
        >
          <Text style={styles.snackbarActionText}>{actionText}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={dismissSnackbar}
        style={styles.snackbarCloseButton}
      >
        <Ionicons name="close" size={28} color={theme.colors.background} />
      </TouchableOpacity>
    </Animated.View>
  );
};
export default Snackbar;
