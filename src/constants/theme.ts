export const COLORS = {
  primary: "#2D6A4F",
  secondary: "#52B788",
  accent: "#F4845F",
  background: "#0F1923",
  surface: "#1A2634",
  surface2: "#243447",
  border: "#2E4057",
  textPrimary: "#F0F4F8",
  textSecondary: "#8FA3B1",
  textMuted: "#4A6274",
  success: "#52B788",
  warning: "#F4A261",
  error: "#E07070",
  overlay45: "rgba(0,0,0,0.45)",
  overlay50: "rgba(0,0,0,0.5)",
  overlay60: "rgba(0,0,0,0.6)",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 48,
} as const;

export const BORDER_RADIUS = {
  card: 12,
  input: 8,
  button: 24,
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    ios: "SF Pro Text",
    android: "Roboto",
    default: "System",
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    display: 32,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 26,
    xl: 28,
    xxl: 32,
    display: 40,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;
