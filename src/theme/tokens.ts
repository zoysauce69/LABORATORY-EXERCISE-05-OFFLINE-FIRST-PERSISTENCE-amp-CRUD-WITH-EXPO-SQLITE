/**
 * RoomLink design tokens.
 *
 * Single source of truth for colour, spacing, radii, typography and elevation.
 * Screens and components must not hardcode hex values, pixel sizes or shadows.
 *
 * NOTE ON FIDELITY: these values implement the blue-and-white RoomLink palette
 * described in the product brief. The Figma file was not reachable during
 * implementation (login gated), so exact hex codes, type scale and radii have
 * NOT been matched to the source design. Once design assets are provided, this
 * file is the only place that needs editing.
 */

/** Brand palette — blue ramp used for primary actions and surfaces. */
export const palette = {
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue200: '#BFDBFE',
  blue300: '#93C5FD',
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue800: '#1E40AF',
  blue900: '#1E3A8A',
  blue950: '#172554',

  white: '#FFFFFF',

  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',

  green50: '#F0FDF4',
  green100: '#DCFCE7',
  green500: '#22C55E',
  green600: '#16A34A',
  green700: '#15803D',

  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber700: '#B45309',

  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',

  violet50: '#F5F3FF',
  violet100: '#EDE9FE',
  violet600: '#7C3AED',

  black: '#000000',
} as const;

export const colors = {
  /** Primary brand colour — buttons, active tabs, links. */
  primary: palette.blue700,
  primaryDark: palette.blue900,
  primaryPressed: palette.blue800,
  primaryLight: palette.blue500,
  primarySoft: palette.blue50,
  primarySoftBorder: palette.blue100,

  background: palette.white,
  backgroundSubtle: palette.slate50,
  surface: palette.white,
  surfaceMuted: palette.slate100,

  text: palette.slate900,
  textSecondary: palette.slate600,
  textMuted: palette.slate500,
  textInverse: palette.white,
  textOnPrimary: palette.white,

  border: palette.slate200,
  borderStrong: palette.slate300,
  divider: palette.slate100,

  success: palette.green600,
  successSoft: palette.green50,
  warning: palette.amber600,
  warningSoft: palette.amber50,
  danger: palette.red600,
  dangerSoft: palette.red50,
  info: palette.blue600,
  infoSoft: palette.blue50,
  accent: palette.violet600,

  /** Scrim behind modals / bottom sheets. */
  overlay: 'rgba(15, 23, 42, 0.55)',
  /** Elevation shadow colour. Kept pure black so shadows read as depth, not tint. */
  shadow: palette.black,
  skeleton: palette.slate200,
  skeletonHighlight: palette.slate100,
} as const;

/** 4pt base scale. */
export const spacing = {
  none: 0,
  xxs: 2,
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

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.7,
} as const;

export const typography = {
  display: {
    fontSize: fontSize.display,
    lineHeight: Math.round(fontSize.display * lineHeight.tight),
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  title: {
    fontSize: fontSize.xxl,
    lineHeight: Math.round(fontSize.xxl * lineHeight.snug),
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  heading: {
    fontSize: fontSize.lg,
    lineHeight: Math.round(fontSize.lg * lineHeight.snug),
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  subheading: {
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.snug),
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  body: {
    fontSize: fontSize.base,
    lineHeight: Math.round(fontSize.base * lineHeight.normal),
    fontWeight: fontWeight.regular,
    color: colors.text,
  },
  bodyStrong: {
    fontSize: fontSize.base,
    lineHeight: Math.round(fontSize.base * lineHeight.normal),
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  caption: {
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.snug),
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
  },
  captionStrong: {
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.snug),
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  overline: {
    fontSize: fontSize.xs,
    lineHeight: Math.round(fontSize.xs * lineHeight.snug),
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  /** Currency emphasis, e.g. ₱4,500 /mo */
  price: {
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * lineHeight.tight),
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  /** Roommate compatibility percentage, e.g. 86 */
  scoreValue: {
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * lineHeight.tight),
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
} as const;

export const shadows = {
  none: {},
  sm: {
    shadowColor: palette.slate900,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: palette.slate900,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: palette.slate900,
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primary: {
    shadowColor: palette.blue800,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

/** Minimum touch target per platform accessibility guidance. */
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minTouchTarget = 44;

export const layout = {
  screenPadding: spacing.lg,
  cardPadding: spacing.lg,
  tabBarHeight: 60,
  controlHeight: 48,
  inputHeight: 50,
  avatarSm: 32,
  avatarMd: 44,
  avatarLg: 88,
  propertyImageHeight: 190,
  galleryImageHeight: 260,
  maxContentWidth: 640,
} as const;

export const theme = {
  palette,
  colors,
  spacing,
  radii,
  fontSize,
  fontWeight,
  lineHeight,
  typography,
  shadows,
  hitSlop,
  minTouchTarget,
  layout,
} as const;

export type Theme = typeof theme;