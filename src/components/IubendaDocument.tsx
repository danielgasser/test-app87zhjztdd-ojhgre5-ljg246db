import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Modal,
} from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/styles/theme";
import { logger } from "@/utils/logger";
import { commonStyles } from "@/styles/common";

const IUBENDA_API_BASE = "https://www.iubenda.com/api";

type DocumentType = "privacy-policy" | "terms-and-conditions";

interface IubendaDocumentProps {
  type: DocumentType;
  publicId: string;
  visible: boolean;
  onClose: () => void;
  title?: string;
}

export function IubendaDocument({
  type,
  publicId,
  visible,
  onClose,
  title,
}: IubendaDocumentProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchDocument();
    }
  }, [visible, type, publicId]);

  const fetchDocument = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${IUBENDA_API_BASE}/${type}/${publicId}`);
      const data = await response.json();

      if (data.success && data.content) {
        setContent(data.content);
      } else {
        setError(data.error || "Failed to load document");
      }
    } catch (err) {
      logger.error("Failed to fetch iubenda document:", err);
      setError("Failed to load document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const htmlWrapper = (body: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: ${theme.colors.text};
            padding: 16px;
            margin: 0;
            background-color: ${theme.colors.background};
          }
          h1, h2, h3 {
            color: ${theme.colors.primary};
          }
          a {
            color: ${theme.colors.primary};
          }
          ul, ol {
            padding-left: 20px;
          }
        </style>
      </head>
      <body>
        ${body}
      </body>
    </html>
  `;

  const displayTitle =
    title ||
    (type === "privacy-policy" ? "Privacy Policy" : "Terms and Conditions");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={commonStyles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>{displayTitle}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {error && (
          <View style={styles.centered}>
            <Ionicons
              name="alert-circle"
              size={48}
              color={theme.colors.error}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchDocument}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && content && (
          <WebView
            source={{ html: htmlWrapper(content) }}
            style={styles.webview}
            originWhitelist={["*"]}
            showsVerticalScrollIndicator={true}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: "center",
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  retryText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  webview: {
    flex: 1,
  },
});
