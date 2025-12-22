import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  notificationStyles,
  getConfirmationIcon,
  getConfirmationIconColor,
} from "@/styles/notificationStyles";
import { Portal } from "@gorhom/portal";

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
  duration?: number;
}
const styles = notificationStyles;

const ConfirmationSheet: React.FC<ConfirmationSheetProps> = ({
  visible,
  title,
  message,
  buttons,
  onDismiss,
  icon,
  duration = 0,
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
      if (duration > 0) {
        const timer = setTimeout(() => {
          onDismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, duration]);

  const getIconName = () => getConfirmationIcon(icon);

  const getIconColor = () => getConfirmationIconColor(icon);

  const handleButtonPress = (button: ConfirmationButton) => {
    onDismiss();
    button.onPress?.();
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case "destructive":
        return [
          styles.confirmationButton,
          styles.confirmationButtonDestructive,
        ];
      case "cancel":
        return [styles.confirmationButton, styles.confirmationButtonCancel];
      default:
        return [styles.confirmationButton, styles.confirmationButtonDefault];
    }
  };

  const getButtonTextStyle = (style?: string) => {
    switch (style) {
      case "destructive":
        return [
          styles.confirmationButtonText,
          styles.confirmationButtonDestructive,
        ];
      case "cancel":
        return [styles.confirmationButtonText, styles.confirmationButtonCancel];
      default:
        return [
          styles.confirmationButtonText,
          styles.confirmationButtonDefault,
        ];
    }
  };
  if (!visible) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onDismiss}
        statusBarTranslucent={true}
        presentationStyle="overFullScreen"
      >
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={styles.confirmationOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.confirmationContainer,
                  { transform: [{ translateY: slideAnim }] },
                ]}
              >
                {icon && (
                  <View style={styles.confirmationIconContainer}>
                    <Ionicons
                      name={getIconName()}
                      size={48}
                      color={getIconColor()}
                    />
                  </View>
                )}

                <Text style={styles.confirmationTitle}>{title}</Text>
                <Text style={styles.confirmationMessage}>{message}</Text>

                <View style={styles.confirmationButtonsContainer}>
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
    </Portal>
  );
};

export default ConfirmationSheet;
