import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { notify } from "@/utils/notificationService";
import { logger } from "@/utils/logger";
import { IubendaDocument } from "@/components/IubendaDocument";
import { recordLegalAcceptance } from "@/services/consentService";

const IUBENDA_PUBLIC_ID = "69238085";

export default function LegalAcceptanceScreen() {
  const { user, refreshOnboardingStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const canContinue = termsChecked && privacyChecked;

  const handleAccept = async () => {
    if (!user?.id || !canContinue) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) throw error;

      recordLegalAcceptance().catch((err) =>
        logger.error("=== IUBENDA ERROR ===", err)
      );
      await refreshOnboardingStatus();
    } catch (error) {
      logger.error("Failed to save terms acceptance:", error);
      notify.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="document-text"
            size={64}
            color={theme.colors.primary}
          />
        </View>

        <Text style={styles.title}>Terms & Privacy</Text>
        <Text style={styles.subtitle}>
          Please review and accept our terms to continue
        </Text>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setTermsChecked(!termsChecked)}
            activeOpacity={0.7}
          >
            <View
              style={[styles.checkbox, termsChecked && styles.checkboxChecked]}
            >
              {termsChecked && (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={theme.colors.textOnPrimary}
                />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the{" "}
              <Text style={styles.link} onPress={() => setShowTerms(true)}>
                Terms of Service
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setPrivacyChecked(!privacyChecked)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                privacyChecked && styles.checkboxChecked,
              ]}
            >
              {privacyChecked && (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={theme.colors.textOnPrimary}
                />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read the{" "}
              <Text style={styles.link} onPress={() => setShowPrivacy(true)}>
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons
            name="shield-checkmark"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.infoText}>
            Your privacy matters. We only collect data necessary to provide
            personalized safety recommendations. You control what demographic
            information you share.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleAccept}
          disabled={!canContinue || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      <IubendaDocument
        type="privacy-policy"
        publicId={IUBENDA_PUBLIC_ID}
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
      />

      <IubendaDocument
        type="terms-and-conditions"
        publicId={IUBENDA_PUBLIC_ID}
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms of Service"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.screenPadding,
  },
  iconContainer: {
    alignItems: "center",
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  checkboxContainer: {
    marginBottom: theme.spacing.xl,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  link: {
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: theme.spacing.screenPadding,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: theme.colors.border,
  },
  buttonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
});
