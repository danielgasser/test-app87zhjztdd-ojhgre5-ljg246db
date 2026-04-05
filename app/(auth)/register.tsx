import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from "react-native";
import { AppText as Text } from "@/components/AppText";
import { AppTextInput as TextInput } from "../../src/components/AppTextInput";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "src/styles/theme";
import { supabase } from "@/services/supabase";
import { notify } from "@/utils/notificationService";
import { passwordChecker } from "@/utils/passwordChecker";
import { logger } from "@/utils/logger";
import { useAuth } from "@/providers/AuthProvider";
import { commonStyles } from "@/styles/common";
import { useTranslation } from "react-i18next";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { refreshOnboardingStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedEmail || !trimmedPassword || !trimmedConfirmPassword) {
      notify.error(t("auth.please_fill_in_all_fields"));
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      notify.error(t("auth.passwords_do_not_match"));
      return;
    }

    if (!passwordChecker(trimmedPassword)) {
      return;
    }
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error) throw error;

      // Check if email confirmation is required
      const emailConfirmationRequired = data?.user && !data.session;

      if (emailConfirmationRequired) {
        // User needs to confirm email
        Alert.alert(
          "Verify Your Email",
          "Please check your email and click the verification link to activate your account.",
          [
            {
              text: "OK",
              onPress: () => {
                // Don't route - just inform user
                // They'll need to click email link and come back
              },
            },
          ],
        );
      } else {
        // User is auto-signed in (email confirmation disabled or already confirmed)
        // Refresh onboarding status
        await refreshOnboardingStatus();

        // NavigationController will handle routing to onboarding or tabs
        // No manual routing needed!
      }
    } catch (err: any) {
      logger.error(`🔐 Registration error:`, err);
      notify.error(err.message || "Please try again", "Registration Failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flex: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={commonStyles.subHeader}>
              <Text style={styles.title}>{t("auth.join_truguide")}</Text>
              <Text style={styles.subtitle}>
                {t("auth.create_your_account")}
              </Text>
            </View>

            <View style={commonStyles.form}>
              <TextInput
                style={commonStyles.input}
                placeholder={t("auth.email")}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t("common.password")}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t("auth.confirm_password")}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  commonStyles.primaryButton,
                  isLoading && commonStyles.buttonDisabled,
                ]}
                onPress={handleRegister}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.textOnPrimary} />
                ) : (
                  <Text style={commonStyles.primaryButtonText}>
                    {t("auth.create_account")}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={commonStyles.footer}>
                <Text style={commonStyles.footerText}>
                  {t("auth.already_have_account")}
                </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={commonStyles.textPrimaryLink}>
                      {t("common.sign_in")}
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 22,
    color: theme.colors.textSecondary,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    ...commonStyles.input,
    paddingRight: 50,
    marginBottom: theme.spacing.sm,
  },
  eyeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
  },
});
