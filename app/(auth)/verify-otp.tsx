import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { AppText as Text } from "@/components/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { supabase } from "@/services/supabase";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { commonStyles } from "@/styles/common";
import { theme } from "@/styles/theme";
import { useTranslation } from "react-i18next";

export default function VerifyOtpScreen() {
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      notify.error("Please enter the 6-digit code from your email.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });

      if (error) throw error;

      // Session established — NavigationController will route to onboarding
    } catch (err: any) {
      logger.error("OTP verification error:", err);
      notify.error(err.message || t("auth.expired_or_invalid_otp"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      notify.success(t("auth.resend_otp_success"));
    } catch (err: any) {
      notify.error(err.message || t("auth.resend_otp_failed"));
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={commonStyles.container}>
        <Stack.Screen options={{ title: t("auth.verify_email") }} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          <View style={commonStyles.subHeader}>
            <Text style={styles.title}>{t("auth.check_your_email")}</Text>
            <Text style={styles.subtitle}>
              {t("auth.otp_set_to", { email })}
            </Text>
          </View>

          <View style={commonStyles.form}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="center"
              autoFocus
            />

            <TouchableOpacity
              style={[
                commonStyles.primaryButton,
                isLoading && commonStyles.buttonDisabled,
              ]}
              onPress={handleVerify}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.textOnPrimary} />
              ) : (
                <Text style={commonStyles.primaryButtonText}>
                  {t("auth.verify_email")}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
            >
              <Text style={styles.resendText}>
                {t("auth.didnt_receive_the_email_try_again")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>{t("common.back_to_sign_up")}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  email: {
    fontWeight: "600",
    color: theme.colors.text,
  },
  codeInput: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 8,
    color: theme.colors.text,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    backgroundColor: theme.colors.background,
  },
  resendButton: {
    alignItems: "center",
    marginTop: 16,
  },
  resendText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  backButton: {
    alignItems: "center",
    marginTop: 12,
  },
  backText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});
