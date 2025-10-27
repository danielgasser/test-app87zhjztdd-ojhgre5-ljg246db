import { StyleSheet } from "react-native";
import { theme } from "@/styles/theme";

// ============================================
// CENTRALIZED NOTIFICATION STYLES
// Used by both Snackbar and ConfirmationSheet
// ============================================

export const notificationStyles = StyleSheet.create({
    // ============================================
    // SNACKBAR STYLES
    // ============================================
    snackbarContainer: {
        position: "absolute",
        top: 60,
        left: 16,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 8,

        // Shadow (works on both platforms)
        shadowColor: theme.colors.shadowLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,

        zIndex: 9999,

        // Try border INSIDE a wrapper if needed
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
    },
    snackbarTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    snackbarTitle: {
        color: theme.colors.background,
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 2,
    },
    snackbarMessage: {
        flex: 1,
        color: theme.colors.background,
        fontSize: 18,
        fontWeight: "600",
        paddingTop: 5,
    },
    snackbarActionButton: {
        marginLeft: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    snackbarActionText: {
        color: theme.colors.background,
        fontSize: 14,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    snackbarCloseButton: {
        marginLeft: 8,
        padding: 4,
    },

    // ============================================
    // CONFIRMATION SHEET STYLES
    // ============================================
    confirmationOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    confirmationContainer: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    confirmationIconContainer: {
        alignItems: "center",
        marginBottom: 16,
    },
    confirmationTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: theme.colors.text,
        marginBottom: 12,
        textAlign: "center",
    },
    confirmationMessage: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 24,
        textAlign: "center",
        lineHeight: 24,
    },
    confirmationButtonsContainer: {
        gap: 12,
    },
    confirmationButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    confirmationButtonDefault: {
        backgroundColor: theme.colors.primary,
    },
    confirmationButtonDestructive: {
        backgroundColor: theme.colors.error,
    },
    confirmationButtonCancel: {
        backgroundColor: theme.colors.primary,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    confirmationButtonText: {
        color: theme.colors.textOnPrimary,
        fontSize: 16,
        fontWeight: "600",
    },
    confirmationButtonTextDefault: {
        color: theme.colors.background,
    },
    confirmationButtonTextDestructive: {
        color: theme.colors.background,
    },
    confirmationButtonTextCancel: {
        color: theme.colors.textOnPrimary,
    },
});

// ============================================
// SNACKBAR BACKGROUND COLORS
// ============================================
export const getSnackbarBackgroundColor = (
    type: "success" | "error" | "info"
): string => {
    switch (type) {
        case "success":
            return theme.colors.secondary; // Green
        case "error":
            return theme.colors.error; // Red
        case "info":
            return theme.colors.primary; // Blue
    }
};

// ============================================
// SNACKBAR ICONS
// ============================================
export const getSnackbarIcon = (
    type: "success" | "error" | "info"
): "checkmark-circle" | "alert-circle" | "information-circle" => {
    switch (type) {
        case "success":
            return "checkmark-circle";
        case "error":
            return "alert-circle";
        case "info":
            return "information-circle";
    }
};

// ============================================
// CONFIRMATION SHEET ICONS
// ============================================
export const getConfirmationIcon = (
    icon?: "warning" | "info" | "question"
): "warning" | "information-circle" | "help-circle" | "alert-circle" => {
    switch (icon) {
        case "warning":
            return "warning";
        case "info":
            return "information-circle";
        case "question":
            return "help-circle";
        default:
            return "alert-circle";
    }
};

// ============================================
// CONFIRMATION ICON COLORS
// ============================================
export const getConfirmationIconColor = (
    icon?: "warning" | "info" | "question"
): string => {
    switch (icon) {
        case "warning":
            return theme.colors.accent;
        case "info":
            return theme.colors.primary;
        default:
            return theme.colors.textSecondary;
    }
};