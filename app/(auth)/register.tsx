import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
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

export default function RegisterScreen() {
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
      notify.error("Please fill in all fields");
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      notify.error("Passwords do not match");
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
          ]
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
              <Text style={styles.title}>Join SafePath</Text>
              <Text style={styles.subtitle}>Create your account</Text>
            </View>

            <View style={commonStyles.form}>
              <TextInput
                style={commonStyles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
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
                  placeholder="Confirm Password"
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
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>

              <View style={commonStyles.footer}>
                <Text style={commonStyles.footerText}>
                  Already have an account?{" "}
                </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={commonStyles.textPrimaryLink}>Sign In</Text>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  passwordInput: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  eyeButton: {
    padding: theme.spacing.md,
  },
});
