import React, { useState, useEffect } from "react";
import Snackbar, { SnackbarType } from "./Snackbar";
import ConfirmationSheet from "./ConfirmationSheet";
import { notify } from "@/utils/notificationService";

interface NotificationState {
  visible: boolean;
  message: string;
  type: SnackbarType;
  duration?: number;
  actionText?: string;
  onActionPress?: () => void;
}

interface ConfirmationButton {
  text: string;
  onPress: () => void;
  style?: "default" | "destructive" | "cancel";
}

interface ConfirmationState {
  visible: boolean;
  title: string;
  message: string;
  buttons: ConfirmationButton[];
  icon?: "warning" | "info" | "question";
}

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    message: "",
    type: "info",
  });

  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  useEffect(() => {
    // Subscribe to notifications
    const unsubscribeNotification = notify.onNotification((notif) => {
      setNotification(notif);
    });

    // Subscribe to confirmations
    const unsubscribeConfirmation = notify.onConfirmation((confirm) => {
      setConfirmation(confirm);
    });

    return () => {
      unsubscribeNotification();
      unsubscribeConfirmation();
    };
  }, []);

  return (
    <>
      {children}

      <Snackbar
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        duration={notification.duration}
        actionText={notification.actionText}
        onActionPress={notification.onActionPress}
        onDismiss={() => setNotification({ ...notification, visible: false })}
      />

      <ConfirmationSheet
        visible={confirmation.visible}
        title={confirmation.title}
        message={confirmation.message}
        buttons={confirmation.buttons}
        icon={confirmation.icon}
        onDismiss={() => setConfirmation({ ...confirmation, visible: false })}
      />
    </>
  );
};

export default NotificationProvider;
