// src/styles/theme.ts
// SafePath Theme - Safety-Focused Color Palette

interface Colors {
    // Primary brand colors - Safety focused
    primary: string;              // Deep blue - trust & security
    primaryLight: string;
    primaryDark: string;

    secondary: string;            // Soft green - safety & growth
    secondaryLight: string;
    secondaryDark: string;

    accent: string;               // Coral/Orange - warnings only
    accentLight: string;

    // Safety rating colors (for map markers & scores)
    safeGreen: string;           // 4.0+ rating
    mixedYellow: string;         // 2.5-3.9 rating  
    unsafeRed: string;           // <2.5 rating
    noDataGray: string;          // No data available

    // UI colors
    background: string;
    backgroundSecondary: string;
    surface: string;
    card: string;

    // Text colors
    text: string;
    textSecondary: string;
    textLight: string;
    textOnPrimary: string;
    textOnSecondary: string;

    // Interactive colors
    success: string;
    warning: string;
    error: string;
    info: string;

    // Border and separator colors
    border: string;
    borderDark: string;
    borderLight: string;
    separator: string;

    // Input colors
    inputBackground: string;
    inputBorder: string;
    inputFocus: string;

    // Shadow colors
    shadowLight: string;
    shadowMedium: string;
    shadowDark: string;
    shadowBlack: string;

    // Overlay colors
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
        // PRIMARY: Deep Blue - Trust, Security, Reliability
        primary: '#2A5C99',           // Deep trustworthy blue
        primaryLight: '#4A7BB9',      // Lighter shade for hover states
        primaryDark: '#1A4679',       // Darker shade for pressed states

        // SECONDARY: Soft Green - Safety, Growth, Balance
        secondary: '#5FB878',         // Calming green (not too bright)
        secondaryLight: '#7FC898',    // Lighter green for backgrounds
        secondaryDark: '#4A9858',     // Darker green for emphasis

        // ACCENT: Coral/Orange - Warnings & Important Actions ONLY
        accent: '#FF7043',            // Warm coral for warnings
        accentLight: '#FF8A65',       // Lighter for less critical warnings

        // Safety rating colors (map markers, location scores)
        safeGreen: '#5FB878',         // 4.0+ Very safe
        mixedYellow: '#FFB74D',       // 2.5-3.9 Mixed/Caution
        unsafeRed: '#EF5350',         // <2.5 Unsafe
        noDataGray: '#90A4AE',        // No data available

        // UI Background colors
        background: '#FFFFFF',         // Main background
        backgroundSecondary: '#F5F7FA', // Secondary background
        surface: '#FAFBFC',           // Cards, elevated surfaces
        card: '#FFFFFF',              // Card backgrounds

        // Text colors
        text: '#2C3E50',              // Primary text (dark blue-gray)
        textSecondary: '#607D8B',     // Secondary text
        textLight: '#90A4AE',         // Light text, placeholders
        textOnPrimary: '#FFFFFF',     // Text on primary blue
        textOnSecondary: '#FFFFFF',   // Text on secondary green

        // Interactive colors
        success: '#5FB878',           // Same as secondary green
        warning: '#FFB74D',           // Yellow for warnings
        error: '#EF5350',             // Red for errors
        info: '#2A5C99',              // Same as primary blue

        // Borders and separators
        border: '#CFD8DC',            // Default borders
        borderDark: '#1e4d87ff',            // Default borders
        borderLight: '#ECEFF1',       // Lighter borders
        separator: '#F5F7FA',         // Section separators

        // Input colors
        inputBackground: '#FAFBFC',   // Input fields background
        inputBorder: '#CFD8DC',       // Input borders
        inputFocus: '#2A5C99',        // Focused input border (primary)

        // Shadow colors
        shadowLight: 'rgba(42, 92, 153, 0.08)',   // Light shadow (primary tint)
        shadowMedium: 'rgba(42, 92, 153, 0.12)',  // Medium shadow
        shadowDark: 'rgba(42, 92, 153, 0.16)',    // Dark shadow
        shadowBlack: 'rgba(0, 0, 0, 1)',    // Dark shadow

        // Overlay colors
        overlay: 'rgba(0, 0, 0, 0.5)',
        backdrop: 'rgba(44, 62, 80, 0.4)',
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,

        screenPadding: 20,
        cardPadding: 16,
        buttonPadding: 16,
        sectionSpacing: 24,
    },

    typography: {
        h1: {
            fontSize: 36,
            fontWeight: 'bold' as const,
            lineHeight: 44,
        },
        h2: {
            fontSize: 28,
            fontWeight: 'bold' as const,
            lineHeight: 36,
        },
        h3: {
            fontSize: 22,
            fontWeight: '600' as const,
            lineHeight: 30,
        },
        h4: {
            fontSize: 18,
            fontWeight: '600' as const,
            lineHeight: 26,
        },

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
            lineHeight: 18,
        },

        button: {
            fontSize: 16,
            fontWeight: '600' as const,
        },
        buttonLarge: {
            fontSize: 18,
            fontWeight: '600' as const,
        },

        subtitle: {
            fontSize: 16,
            lineHeight: 22,
        },
        description: {
            fontSize: 14,
            lineHeight: 20,
        },
    },

    borderRadius: {
        sm: 6,
        md: 10,
        lg: 14,
        xl: 18,
        full: 9999,
    },

    shadows: {
        sm: {
            shadowColor: '#2A5C99',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 3,
            elevation: 2,
        },
        md: {
            shadowColor: '#2A5C99',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 6,
            elevation: 4,
        },
        lg: {
            shadowColor: '#2A5C99',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.16,
            shadowRadius: 10,
            elevation: 8,
        },
    },

    animation: {
        fast: 150,
        normal: 250,
        slow: 400,
    },

    layout: {
        headerHeight: 60,
        tabBarHeight: 50,
        statusBarHeight: 44,
    },
};