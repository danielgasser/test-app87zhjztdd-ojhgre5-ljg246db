import React, { useState, useEffect } from "react";
import { notify } from "@/utils/notificationService";
import Snackbar, { SnackbarType } from "./Snackbar";

export const ModalSnackbar: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<SnackbarType>("info");
  const [title, setTitle] = useState<string | undefined>();
  const [duration, setDuration] = useState<number | undefined>();

  useEffect(() => {
    const unsubscribe = notify.onNotification((notif) => {
      setMessage(notif.message);
      setType(notif.type);
      setTitle(notif.title);
      setDuration(notif.duration);
      setVisible(notif.visible);
    });
    return unsubscribe;
  }, []);

  return (
    <Snackbar
      visible={visible}
      message={message}
      type={type}
      title={title}
      duration={duration}
      onDismiss={() => setVisible(false)}
    />
  );
};
