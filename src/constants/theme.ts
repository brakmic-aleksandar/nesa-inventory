// Design System Theme
export const theme = {
  // Elevation system for shadows
  elevation: {
    none: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    low: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    high: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 6,
    },
    highest: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 10,
    },
  },

  // Border radius system
  radius: {
    none: 0,
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 20,
    round: 9999,
  },

  // Typography scale
  typography: {
    h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
    h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
    h5: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
    body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
    bodyMedium: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
    bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
    captionBold: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
    tiny: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  },

  // Icon sizes
  iconSize: {
    tiny: 16,
    small: 20,
    medium: 24,
    large: 28,
    xlarge: 32,
    huge: 48,
  },

  // Spacing system
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Light mode colors
  light: {
    primary: '#007AFF',
    primaryDark: '#0051D5',
    primaryLight: '#E3F2FD',
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceSecondary: '#f9f9f9',
    cardBackground: '#ffffff',
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textOnColor: '#ffffff',
    border: '#e0e0e0',
    borderLight: '#f0f0f0',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    info: '#007AFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
    placeholderIcon: '#999999',
    skeleton: '#E0E0E0',
    switchTrackOff: '#d1d1d6',
  },

  // Dark mode colors
  dark: {
    primary: '#0A84FF',
    primaryDark: '#007AFF',
    primaryLight: 'rgba(10, 132, 255, 0.15)',
    background: '#000000',
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    cardBackground: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: '#EBEBF599',
    textOnColor: '#ffffff',
    border: '#38383A',
    borderLight: '#48484A',
    error: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',
    info: '#0A84FF',
    overlay: 'rgba(0, 0, 0, 0.7)',
    placeholderIcon: '#666666',
    skeleton: '#38383A',
    switchTrackOff: '#48484A',
  },
};

export type Theme = typeof theme;
