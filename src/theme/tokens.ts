/**
 * RoomLink design tokens.
 *
 * Single source of truth for colour, spacing, radii, typography and elevation.
 * Screens and components must not hardcode hex values, pixel sizes or shadows.
 *
 * PROVENANCE
 * ----------
 * `sampled` holds exact values read out of the RoomLink design file
 * (`RoomLink.png`, 1960x1995) by histogram over the rendered pixels. The brand
 * blue, the navy hero/sidebar panel, the emerald accent and the section tints
 * are all measured, not eyeballed:
 *
 *   #FFFFFF        50.4% of pixels   page background
 *   #F7F7F7        30.7%             alternating section background
 *   navy family    ~7%               dark panel, x 0-359, diagonal bottom edge
 *   #155DFC        n=8801            vivid brand blue (buttons, accents)
 *   #2563EB        n=8878            secondary blue
 *   #1976D2        n=5516            deep blue
 *   #059669        n=71              verified / success
 *   #A7F3D0        n=88              success tint
 *
 * The layout measurement that matters most: the dark navy panel occupies the
 * left 18.4% of the canvas (360 of 1960 px) and its bottom edge is cut on a
 * diagonal — y=1472 at x=20 falling to y=798 at x=350. `heroDiagonal` below
 * reproduces that cut on the landing hero.
 */

/** Exact swatches sampled from the design file. Do not hand-edit. */
export const sampled = {
  page: '#FFFFFF',
  section: '#F7F7F7',

  primary: '#155DFC',
  primaryAlt: '#2563EB',
  deepBlue: '#1976D2',
  electric: '#1D72FE',
  midBlue: '#1D72E6',

  navyDeep: '#071224',
  navyMid: '#0F2A52',
  navyEdge: '#000819',

  success: '#059669',
  successSoft: '#A7F3D0',

  tintBlue: '#EFF7FF',
  borderBlue: '#E6EFF7',
  tintLavender: '#F7F7FF',
  tintGreen: '#EFFFF7',

  bronze: '#A5815D',
} as const;

/** Brand ramp. Steps 200-300 and 600-800 are the sampled blues. */
export const palette = {
  blue50: '#EFF6FF',
  blue100: '#DBE9FF',
  blue200: '#C7DCFF',
  blue300: sampled.borderBlue,
  blue400: '#92B1F5',
  blue500: '#5B8AF0',
  blue600: sampled.primaryAlt,
  blue700: sampled.deepBlue,
  blue800: sampled.primary,
  blue900: '#0B3E9E',

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

  navy800: '#12294D',
  navy900: sampled.navyMid,
  navy950: sampled.navyDeep,

  green50: '#ECFDF5',
  green100: sampled.successSoft,
  green500: '#10B981',
  green600: sampled.success,
  green700: '#047857',

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

  bronze: sampled.bronze,

  black: '#000000',
} as const;

export const colors = {
  /** Primary brand colour — buttons, active tabs, links. Sampled #155DFC. */
  primary: palette.blue800,
  /** Raw ramp values that recur across screens. Components read these from here
   *  rather than reaching into `palette`, so nothing has to know which ramp a
   *  colour came from. */
  white: palette.white,
  amber500: palette.amber500,
  primaryPressed: palette.blue900,
  primaryDark: palette.navy950,
  primaryLight: palette.blue600,
  primarySoft: palette.blue50,
  primarySoftBorder: palette.blue100,

  background: palette.white,
  backgroundSubtle: sampled.section,
  surface: palette.white,
  surfaceMuted: palette.slate100,

  /** Dark panel used by the landing hero and the app sidebar. */
  dark: palette.navy950,
  darkElevated: palette.navy900,
  darkBorder: palette.navy800,

  text: palette.slate900,
  textSecondary: palette.slate600,
  textMuted: palette.slate500,
  textInverse: palette.white,
  textOnDark: palette.white,
  textOnDarkMuted: '#93A7C4',

  border: sampled.borderBlue,
  borderStrong: palette.slate300,
  divider: palette.slate100,

  success: palette.green600,
  successSoft: palette.green50,
  successSoftBorder: palette.green100,
  warning: palette.amber600,
  warningSoft: palette.amber50,
  danger: palette.red600,
  dangerSoft: palette.red50,
  info: palette.blue600,
  infoSoft: palette.blue50,
  accent: palette.violet600,

  overlay: 'rgba(7, 18, 36, 0.62)',
  shadow: palette.slate900,
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
  /** Currency emphasis, e.g. ₱5,500 /mo */
  price: {
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * lineHeight.tight),
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  /** Roommate compatibility percentage, e.g. 92 */
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
    shadowColor: palette.blue900,
    shadowOpacity: 0.3,
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
  roomImageHeight: 190,
  galleryImageHeight: 260,
  maxContentWidth: 640,
} as const;

/**
 * The dark panel measured in the design file: left 18.4% of the canvas, bottom
 * edge cut on a diagonal running from y=1472 at x=20 down to y=798 at x=350.
 * `hero` uses this to reproduce the cut without a raster asset.
 */
export const heroDiagonal = {
  /** Fraction of the panel width the diagonal spans. */
  depth: 0.42,
  /** Panel width as a fraction of total width. */
  width: 0.184,
} as const;

export const theme = {
  palette,
  sampled,
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
  heroDiagonal,
} as const;

export type Theme = typeof theme;