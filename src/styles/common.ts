// src/styles/common.ts
import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const commonStyles = StyleSheet.create({
  // ==================== CONTAINERS ====================
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  screenPadding: {
    paddingHorizontal: theme.spacing.screenPadding,
  },

  scrollContainer: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==================== SECTIONS & CARDS ====================
  section: {
    marginTop: theme.spacing.sectionSpacing,
    backgroundColor: theme.colors.card,
    paddingVertical: theme.spacing.lg,
  },

  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.cardPadding,
    ...theme.shadows.sm,
  },

  cardElevated: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.cardPadding,
    ...theme.shadows.md,
  },

  cardBordered: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.cardPadding,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  // ==================== BUTTONS ====================
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.buttonPadding,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  cancelButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.buttonPadding,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },

  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.buttonPadding - 2,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ghostButton: {
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.buttonPadding,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dangerButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.buttonPadding,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },

  warningButton: {
    backgroundColor: theme.colors.warning,
    paddingVertical: theme.spacing.buttonPadding,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  smallButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },

  largeButton: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },

  // ==================== BUTTON TEXT STYLES ====================
  primaryButtonText: {
    color: theme.colors.textOnPrimary,
    ...theme.typography.button,
  },
  cancelButtonText: {
    color: theme.colors.text,
    ...theme.typography.button,
  },
  secondaryButtonText: {
    color: theme.colors.textOnSecondary,
    ...theme.typography.button,
  },

  outlineButtonText: {
    color: theme.colors.primary,
    ...theme.typography.button,
  },

  ghostButtonText: {
    color: theme.colors.primary,
    ...theme.typography.button,
  },

  dangerButtonText: {
    color: theme.colors.textOnPrimary,
    ...theme.typography.button,
  },

  warningButtonText: {
    color: theme.colors.text,
    ...theme.typography.button,
  },

  // ==================== TEXT STYLES ====================
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.screenPadding,
    marginBottom: theme.spacing.md,
  },

  subtitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
  },

  bodyText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },

  bodySmallText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
  },

  captionText: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
  },

  textBold: {
    fontWeight: '600',
  },

  textCenter: {
    textAlign: 'center',
  },

  textRight: {
    textAlign: 'right',
  },

  textPrimary: {
    color: theme.colors.primary,
  },

  textSecondary: {
    color: theme.colors.secondary,
  },

  textError: {
    color: theme.colors.error,
  },

  textSuccess: {
    color: theme.colors.success,
  },

  // ==================== INPUT STYLES ====================
  input: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  inputFocused: {
    borderColor: theme.colors.inputFocus,
    borderWidth: 2,
  },

  inputError: {
    borderColor: theme.colors.error,
  },

  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // ==================== FORM STYLES ====================
  formContainer: {
    paddingHorizontal: theme.spacing.screenPadding,
  },
  form: {
    width: "100%",
  },
  formField: {
    marginBottom: theme.spacing.lg,
  },

  formLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },

  formHelper: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  formError: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },

  requiredAsterisk: {
    color: theme.colors.error,
    marginLeft: 2,
  },

  // ==================== MODAL STYLES ====================
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    margin: theme.spacing.lg,
    maxHeight: '80%',
    width: '90%',
    ...theme.shadows.lg,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },

  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },

  modalBody: {
    flex: 1,
  },

  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },

  // ==================== LIST STYLES ====================
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },

  listItemText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },

  listItemSubtext: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.md,
  },

  // ==================== HEADER STYLES ====================
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },

  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },

  headerSubtitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  // ==================== SAFETY MARKER STYLES ====================
  safeMarker: {
    backgroundColor: theme.colors.safeGreen,
  },

  mixedMarker: {
    backgroundColor: theme.colors.mixedYellow,
  },

  unsafeMarker: {
    backgroundColor: theme.colors.unsafeRed,
  },

  noDataMarker: {
    backgroundColor: theme.colors.noDataGray,
  },

  // ==================== BADGE STYLES ====================
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
  },

  badgePrimary: {
    backgroundColor: theme.colors.primary,
  },

  badgeSecondary: {
    backgroundColor: theme.colors.secondary,
  },

  badgeSuccess: {
    backgroundColor: theme.colors.success,
  },

  badgeWarning: {
    backgroundColor: theme.colors.warning,
  },

  badgeError: {
    backgroundColor: theme.colors.error,
  },

  badgeText: {
    ...theme.typography.caption,
    color: theme.colors.textOnPrimary,
    fontWeight: '600',
  },

  // ==================== DIVIDER ====================
  divider: {
    height: 1,
    backgroundColor: theme.colors.separator,
    marginVertical: theme.spacing.md,
  },

  dividerThick: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },

  // ==================== SPACING UTILITIES ====================
  marginTopSm: {
    marginTop: theme.spacing.sm,
  },

  marginTopMd: {
    marginTop: theme.spacing.md,
  },

  marginTopLg: {
    marginTop: theme.spacing.lg,
  },

  marginBottomSm: {
    marginBottom: theme.spacing.sm,
  },

  marginBottomMd: {
    marginBottom: theme.spacing.md,
  },

  marginBottomLg: {
    marginBottom: theme.spacing.lg,
  },

  paddingMd: {
    padding: theme.spacing.md,
  },

  paddingLg: {
    padding: theme.spacing.lg,
  },

  // ==================== FLEXBOX UTILITIES ====================
  row: {
    flexDirection: 'row',
  },

  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  column: {
    flexDirection: 'column',
  },

  columnCenter: {
    flexDirection: 'column',
    alignItems: 'center',
  },

  // ==================== RATING STYLES ====================
  ratingContainer: {
    marginBottom: theme.spacing.lg,
  },

  ratingLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },

  stars: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
});