import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const commonStyles = StyleSheet.create({
  // Container styles
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
  
  // Button styles
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.buttonPadding,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: theme.spacing.buttonPadding,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  dangerButton: {
    backgroundColor: theme.colors.error,
    padding: theme.spacing.buttonPadding,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonDisabled: {
    opacity: 0.7,
  },
  
  // Button text styles
  primaryButtonText: {
    color: theme.colors.textOnPrimary,
    ...theme.typography.button,
  },
  
  secondaryButtonText: {
    color: theme.colors.primary,
    ...theme.typography.button,
  },
  
  dangerButtonText: {
    color: theme.colors.textOnPrimary,
    ...theme.typography.button,
  },
  
  // Text styles
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  
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
  
  captionText: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
  },
  
  // Input styles
  input: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  
  inputFocused: {
    borderColor: theme.colors.inputFocus,
  },
  
  inputError: {
    borderColor: theme.colors.error,
  },
  
  // Form styles
  formContainer: {
    paddingHorizontal: theme.spacing.screenPadding,
  },
  
  formField: {
    marginBottom: theme.spacing.md,
  },
  
  formLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  
  // Modal styles
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
  
  // List item styles
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
  
  // Header styles
  header: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card,
  },
  
  headerSubtitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  
  // Safety marker styles
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
    backgroundColor: theme.colors.noDataBlue,
  },
  
  // Navigation styles
  tabBarStyle: {
    backgroundColor: theme.colors.card,
    borderTopColor: theme.colors.border,
    height: theme.layout.tabBarHeight,
  },
  
  // Utility styles
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  flex1: {
    flex: 1,
  },
  
  // Spacing utilities
  marginTopSm: { marginTop: theme.spacing.sm },
  marginTopMd: { marginTop: theme.spacing.md },
  marginTopLg: { marginTop: theme.spacing.lg },
  
  marginBottomSm: { marginBottom: theme.spacing.sm },
  marginBottomMd: { marginBottom: theme.spacing.md },
  marginBottomLg: { marginBottom: theme.spacing.lg },
  
  paddingHorizontalMd: { paddingHorizontal: theme.spacing.md },
  paddingVerticalMd: { paddingVertical: theme.spacing.md },
  
  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  
  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});