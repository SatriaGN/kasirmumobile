export const Colors = {
  // Primary — Mint Breeze (teal–mint)
  primary: '#1DAA8B', // deep mint / teal
  primaryLight: '#4FD1B5', // bright mint
  primaryDark: '#0F7A65', // dark teal
  primarySoft: '#D9F5EC', // soft mint background

  // Secondary — coral peach (warm contrast pairing with mint)
  secondary: '#FF8A65',
  secondaryLight: '#FFAB91',
  secondarySoft: '#FFE6DC',

  // Gradient stops for "Mint Breeze"
  gradientStart: '#7FE7C8',
  gradientMid: '#4FD1B5',
  gradientEnd: '#1DAA8B',

  // Surfaces
  white: '#FFFFFF',
  background: '#EAFBF4', // pale mint canvas
  cardBg: '#FFFFFF',
  border: '#B8E8D9',
  borderLight: '#DDF3EB',

  // Text
  textPrimary: '#0F3D33',
  textSecondary: '#3D5B53',
  textLight: '#7A958C',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',

  // Status
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#F57F17',
  warningLight: '#FFF8E1',
  error: '#C62828',
  errorLight: '#FFEBEE',
  info: '#0277BD',
  infoLight: '#E1F5FE',
} as const;

export const Fonts = {
  regular: 'System',
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#1DAA8B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1DAA8B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1DAA8B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export type ColorKey = keyof typeof Colors;
export type ColorValue = (typeof Colors)[ColorKey];
export type FontSize = keyof typeof Fonts.sizes;
export type SpacingKey = keyof typeof Spacing;
export type RadiusKey = keyof typeof Radius;
