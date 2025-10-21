import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";

const { height } = Dimensions.get("window");

interface ConfirmationButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "destructive" | "cancel";
}

interface ConfirmationSheetProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: ConfirmationButton[];
  onDismiss: () => void;
  icon?: "warning" | "info" | "question";
}

const ConfirmationSheet: React.FC<ConfirmationSheetProps> = ({
  visible,
  title,
  message,
  buttons,
  onDismiss,
  icon,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const getIconName = () => {
    switch (icon) {
      case "warning":
        return "warning";
      case "info":
        return "information-circle";
      case "question":
        return "help-circle";
      default:
        return "alert-circle";
    }
  };

  const getIconColor = () => {
    switch (icon) {
      case "warning":
        return theme.colors.accent;
      case "info":
        return theme.colors.primary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const handleButtonPress = (button: ConfirmationButton) => {
    button.onPress?.();
    onDismiss();
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case "destructive":
        return [styles.button, styles.destructiveButton];
      case "cancel":
        return [styles.button, styles.cancelButton];
      default:
        return [styles.button, styles.defaultButton];
    }
  };

  const getButtonTextStyle = (style?: string) => {
    switch (style) {
      case "destructive":
        return [styles.buttonText, styles.destructiveButtonText];
      case "cancel":
        return [styles.buttonText, styles.cancelButtonText];
      default:
        return [styles.buttonText, styles.defaultButtonText];
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              {icon && (
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={getIconName()}
                    size={48}
                    color={getIconColor()}
                  />
                </View>
              )}

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.buttonsContainer}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={getButtonStyle(button.style)}
                    onPress={() => handleButtonPress(button)}
                  >
                    <Text style={getButtonTextStyle(button.style)}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
  buttonsContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  defaultButton: {
    backgroundColor: theme.colors.primary,
  },
  destructiveButton: {
    backgroundColor: theme.colors.error,
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  defaultButtonText: {
    color: theme.colors.background,
  },
  destructiveButtonText: {
    color: theme.colors.background,
  },
  cancelButtonText: {
    color: theme.colors.text,
  },
});

export default ConfirmationSheet;
