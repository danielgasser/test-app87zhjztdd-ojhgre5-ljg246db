import { APP_CONFIG } from "@/config/appConfig";
import { Text as RNText, TextProps } from "react-native";

export function AppText({ maxFontSizeMultiplier, ...props }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={
        maxFontSizeMultiplier ??
        APP_CONFIG.APP_COMMON.DEFAULT_MAX_FONT_MULTIPLIER
      }
      {...props}
    />
  );
}
