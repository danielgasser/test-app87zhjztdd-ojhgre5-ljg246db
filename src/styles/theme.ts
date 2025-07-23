// src/styles/theme.ts

interface Colors {
  primary: string;
  secondary: string;
  accent: string;
  safeGreen: string;
  mixedYellow: string;
  unsafeRed: string;
  noDataBlue: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textLight: string;
  textOnPrimary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  border: string;
  separator: string;
  inputBackground: string;
  inputBorder: string;
  inputFocus: string;
  shadowLight: string;
  shadowMedium: string;
  shadowDark: string;
  overlay: string;
  backdrop: string;
}

interface Spacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  screenPadding: number;
  cardPadding: number;
  buttonPadding: number;
  sectionSpacing: number;
}

interface Typography {
  h1: { fontSize: number; fontWeight: 'bold'; lineHeight: number };
  h2: { fontSize: number; fontWeight: 'bold'; lineHeight: number };
  h3: { fontSize: number; fontWeight: '600'; lineHeight: number };
  h4: { fontSize: number; fontWeight: '600'; lineHeight: number };
  body: { fontSize: number; lineHeight: number };
  bodySmall: { fontSize: number; lineHeight: number };
  caption: { fontSize: number; lineHeight: number };
  button: { fontSize: number; fontWeight: '600' };
  buttonLarge: { fontSize: number; fontWeight: '600' };
  subtitle: { fontSize: number; lineHeight: number };
  description: { fontSize: number; lineHeight: number };
}

interface BorderRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

interface Shadows {
  sm: Shadow;
  md: Shadow;
  lg: Shadow;
}

interface Animation {
  fast: number;
  normal: number;
  slow: number;
}

interface Layout {
  headerHeight: number;
  tabBarHeight: number;
  statusBarHeight: number;
}

export interface Theme {
  colors: Colors;
  spacing: Spacing;
  typography: Typography;
  borderRadius: BorderRadius;
  shadows: Shadows;
  animation: Animation;
  layout: Layout;
}

export const theme: Theme = {
  colors: {
    // Primary brand colors
    primary: '#4CAF50',      // Green (safe)
    secondary: '#007AFF',    // Blue (iOS blue)
    accent: '#FFC107',       // Yellow (mixed safety)
    
    // Safety marker colors
    safeGreen: '#4CAF50',
    mixedYellow: '#FFC107', 
    unsafeRed: '#F44336',
    noDataBlue: '#2196F3',
    
    // UI colors
    background: '#fff',
    surface: '#f5f5f5',
    card: '#fff',
    
    // Text colors
    text: '#333',
    textSecondary: '#666',
    textLight: '#999',
    textOnPrimary: '#fff',
    
    // Interactive colors
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
    
    // Border and separator colors
    border: '#E0E0E0',
    separator: '#f0f0f0',
    
    // Input colors
    inputBackground: '#f9f9f9',
    inputBorder: '#ddd',
    inputFocus: '#007AFF',
    
    // Shadow colors
    shadowLight: 'rgba(0, 0, 0, 0.1)',
    shadowMedium: 'rgba(0, 0, 0, 0.15)',
    shadowDark: 'rgba(0, 0, 0, 0.25)',
    
    // Overlay colors
    overlay: 'rgba(0, 0, 0, 0.5)',
    backdrop: 'rgba(0, 0, 0, 0.3)',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    
    // Common padding/margin patterns
    screenPadding: 20,
    cardPadding: 15,
    buttonPadding: 15,
    sectionSpacing: 20,
  },
  
  typography: {
    // Headers
    h1: {
      fontSize: 36,
      fontWeight: 'bold' as const,
      lineHeight: 44,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    
    // Body text
    body: {
      fontSize: 16,
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
    },
    
    // Button text
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    buttonLarge: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    
    // Special text
    subtitle: {
      fontSize: 18,
      lineHeight: 24,
    },
    description: {
      fontSize: 16,
      lineHeight: 24,
    },
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  
  // Animation durations
  animation: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  
  // Screen dimensions helpers
  layout: {
    headerHeight: 60,
    tabBarHeight: 50,
    statusBarHeight: 44, // iOS default
  },
};