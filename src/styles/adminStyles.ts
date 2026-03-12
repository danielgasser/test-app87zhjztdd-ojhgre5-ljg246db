import { StyleSheet } from "react-native";
import { theme } from "./theme";

export const adminStyles = StyleSheet.create({
    stickyHeader: {
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderLight,
    },
    listContentNoHeader: {
        padding: theme.spacing.md,
        paddingBottom: 40,
    },
    centered: {
        flex: 1,
        alignSelf: "center",
        marginTop: 60,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
    },
    backBtn: {
        padding: 4,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: theme.colors.textOnPrimary,
    },
    tabBar: {
        flexDirection: "row",
        backgroundColor: theme.colors.card,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tabItem: {
        flex: 1,
        paddingVertical: theme.spacing.sm + 2,
        alignItems: "center",
    },
    tabItemActive: {
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.primary,
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: theme.colors.textSecondary,
    },
    tabLabelActive: {
        color: theme.colors.primary,
        fontWeight: "700",
    },
    content: {
        flex: 1,
    },
    listContent: {
        padding: theme.spacing.md,
        paddingBottom: 40,
    },
    searchInput: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    countLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
        ...theme.shadows.sm,
    },
    cardHeader: {
        marginBottom: theme.spacing.sm,
    },
    cardTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        marginBottom: 2,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: theme.colors.text,
        flex: 1,
    },
    cardSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    cardMeta: {
        fontSize: 11,
        color: theme.colors.textLight,
    },
    cardComment: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontStyle: "italic",
        marginVertical: 4,
    },
    cardActions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: theme.spacing.sm,
        marginTop: theme.spacing.xs,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "600",
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.sm,
    },
    actionBtnActive: {
        backgroundColor: theme.colors.primary,
    },
    actionBtnOutline: {
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    actionBtnDanger: {
        backgroundColor: theme.colors.error,
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: "500",
    },
    actionBtnTextActive: {
        color: theme.colors.textOnPrimary,
    },
    actionBtnTextOutline: {
        color: theme.colors.textSecondary,
    },
    chipRow: {
        marginBottom: theme.spacing.sm,
    },
    chip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.sm,
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    chipTextActive: {
        color: theme.colors.textOnPrimary,
        fontWeight: "600",
    },

});
