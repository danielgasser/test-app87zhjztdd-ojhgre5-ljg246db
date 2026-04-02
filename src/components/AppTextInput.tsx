import React, { useState } from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { AppText as Text } from "@/components/AppText";
import { isProfane } from "../utils/contentFilter";
import { commonStyles } from "@/styles/common";

interface AppTextInputProps extends TextInputProps {
  filtered?: boolean;
  errorMessage?: string;
}

export const AppTextInput: React.FC<AppTextInputProps> = ({
  filtered = true,
  onChangeText,
  errorMessage,
  ...props
}) => {
  const [profanityError, setProfanityError] = useState<string | null>(null);

  const handleChangeText = (text: string) => {
    if (filtered && isProfane(text)) {
      setProfanityError(
        "Your text contains inappropriate language. Please revise before submitting.",
      );
    } else {
      setProfanityError(null);
    }
    onChangeText?.(text);
  };
  const displayError = profanityError ?? errorMessage ?? null;

  return (
    <View>
      <TextInput onChangeText={handleChangeText} {...props} />
      {displayError && (
        <Text style={commonStyles.warningProfaneText}>{displayError}</Text>
      )}
    </View>
  );
};
