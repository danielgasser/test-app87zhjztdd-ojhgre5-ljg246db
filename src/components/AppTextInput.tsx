import React from "react";
import { TextInput, TextInputProps } from "react-native";
import { isProfane } from "../utils/contentFilter";
import { notify } from "@/utils/notificationService";

interface AppTextInputProps extends TextInputProps {
  filtered?: boolean;
}

export const AppTextInput: React.FC<AppTextInputProps> = ({
  filtered = true,
  onChangeText,
  ...props
}) => {
  const handleChangeText = (text: string) => {
    if (filtered && isProfane(text)) {
      notify.error(
        "Your text contains inappropriate language. Please revise before submitting.",
      );
      return;
    }
    onChangeText?.(text);
  };

  return <TextInput onChangeText={handleChangeText} {...props} />;
};
