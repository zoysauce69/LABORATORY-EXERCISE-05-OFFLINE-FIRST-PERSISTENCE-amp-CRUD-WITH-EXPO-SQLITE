import { forwardRef, type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, hitSlop, layout, radii, shadows, spacing, typography } from '@/theme';
import type { IconName } from '@/constants/options';

/* ------------------------------------------------------------------ */
/* Text                                                                 */
/* ------------------------------------------------------------------ */

type TextVariant = keyof typeof typography;

interface AppTextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text' | 'link';
  accessibilityLabel?: string;
  testID?: string;
}

export function AppText({
  variant = 'body',
  color,
  align,
  style,
  children,
  numberOfLines,
  accessibilityRole,
  accessibilityLabel,
  testID,
}: AppTextProps) {
  return (
    <Text
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      numberOfLines={numberOfLines}
      style={[typography[variant], { color: color ?? typography[variant].color }, align ? { textAlign: align } : null, style]}
    >
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* Screen scaffolding                                                   */
/* ------------------------------------------------------------------ */

export function Screen({
  children,
  edges = ['top', 'left', 'right'],
  backgroundColor = colors.background,
  testID,
}: {
  children: ReactNode;
  edges?: readonly Edge[];
  backgroundColor?: string;
  testID?: string;
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor }]} testID={testID}>
      {children}
    </SafeAreaView>
  );
}

export function ScreenScroll({
  children,
  contentContainerStyle,
  edges,
  refreshControl,
  testID,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
  refreshControl?: ReactElement<React.ComponentProps<typeof RefreshControl>> | null;
  testID?: string;
}) {
  return (
    <SafeAreaView edges={edges ?? ['top', 'left', 'right']} style={styles.screen} testID={testID}>
      <ScrollView
        contentContainerStyle={[
          { padding: layout.screenPadding, paddingBottom: spacing.huge, gap: spacing.lg },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // eslint-disable-next-line react/no-unstable-nested-components
        {...(refreshControl ? { refreshControl } : {})}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function ScreenSection({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      {(title || action) && (
        <View style={styles.sectionHeader}>
          {title ? (
            <AppText variant="heading" accessibilityRole="header">
              {title}
            </AppText>
          ) : (
            <View />
          )}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Button                                                               */
/* ------------------------------------------------------------------ */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    label,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    isLoading = false,
    disabled,
    fullWidth = false,
    style,
    accessibilityHint,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: isLoading }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        buttonSize[size],
        buttonVariant[variant].container,
        fullWidth && styles.buttonFullWidth,
        pressed && !isDisabled && buttonVariant[variant].pressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.textInverse : colors.primary}
        />
      ) : (
        <View style={styles.buttonContent}>
          {icon && iconPosition === 'left' ? (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={buttonVariant[variant].label.color}
              style={{ marginRight: spacing.sm }}
            />
          ) : null}
          <Text style={[buttonVariant[variant].label, buttonLabel[size]]} numberOfLines={1}>
            {label}
          </Text>
          {icon && iconPosition === 'right' ? (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={buttonVariant[variant].label.color}
              style={{ marginLeft: spacing.sm }}
            />
          ) : null}
        </View>
      )}
    </Pressable>
  );
});

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}) {
  if (!onPress) {
    return (
      <View style={[styles.card, style]} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
    >
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Badge / chips                                                        */
/* ------------------------------------------------------------------ */

export function Badge({
  label,
  tone = 'neutral',
  icon,
  style,
}: {
  label: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.badge, badgeTone[tone].container, style]}
    >
      {icon ? <Ionicons name={icon} size={12} color={badgeTone[tone].label} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.badgeLabel, { color: badgeTone[tone].label }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  icon?: IconName;
}

export function ChipGroup<T extends string | number>({
  label,
  options,
  selected,
  onToggle,
  error,
  helperText,
  multiple = false,
}: {
  label?: string;
  options: ChipOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  error?: string | undefined;
  helperText?: string;
  multiple?: boolean;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      {label ? <AppText variant="captionStrong">{label}</AppText> : null}
      <View style={styles.chipRow}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.label}
              onPress={() => onToggle(option.value)}
              hitSlop={hitSlop}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              {option.icon ? (
                <Ionicons
                  name={option.icon}
                  size={14}
                  color={isSelected ? colors.primary : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
              ) : null}
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption">{helperText}</AppText>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                               */
/* ------------------------------------------------------------------ */

export function LoadingState({
  label = 'Loading…',
  compact = false,
}: {
  label?: string;
  /** Smaller spinner for inline use inside a section that already has content. */
  compact?: boolean;
}) {
  return (
    <View
      style={compact ? styles.loadingCompact : styles.centered}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator size={compact ? 'small' : 'large'} color={colors.primary} />
      {label ? (
        <AppText variant="caption" style={{ marginTop: spacing.md }}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.centered}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <AppText variant="subheading" align="center" style={{ marginTop: spacing.md }}>
        {title}
      </AppText>
      <AppText variant="caption" align="center" style={{ marginTop: spacing.xs, maxWidth: 320 }}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="outline"
          size="sm"
          onPress={onAction}
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
  title = 'Something went wrong',
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <View style={styles.centered}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <AppText variant="subheading" align="center" style={{ marginTop: spacing.md }}>
        {title}
      </AppText>
      <AppText variant="caption" align="center" style={{ marginTop: spacing.xs, maxWidth: 320 }}>
        {message}
      </AppText>
      {onRetry ? (
        <Button
          label="Try again"
          variant="outline"
          size="sm"
          icon="refresh"
          onPress={onRetry}
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}

export function InlineAlert({
  tone = 'info',
  title,
  message,
  icon,
  actionLabel,
  onAction,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  message: string;
  icon?: IconName;
  /** Optional inline call to action, e.g. "Verify now". */
  actionLabel?: string;
  onAction?: () => void;
}) {
  const toneMap = {
    info: { container: colors.infoSoft, label: colors.info, defaultIcon: 'information-circle' as IconName },
    success: { container: colors.successSoft, label: colors.success, defaultIcon: 'checkmark-circle' as IconName },
    warning: { container: colors.warningSoft, label: colors.warning, defaultIcon: 'warning' as IconName },
    danger: { container: colors.dangerSoft, label: colors.danger, defaultIcon: 'alert-circle' as IconName },
  } as const;
  const chosen = toneMap[tone];

  return (
    <View
      accessibilityRole="alert"
      style={[styles.alert, { backgroundColor: chosen.container }]}
    >
      <Ionicons name={icon ?? chosen.defaultIcon} size={18} color={chosen.label} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        {title ? (
          <Text style={[styles.alertTitle, { color: chosen.label }]}>{title}</Text>
        ) : null}
        <Text style={styles.alertMessage}>{message}</Text>

        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            hitSlop={8}
            style={styles.alertAction}
          >
            <Text style={[styles.alertActionText, { color: chosen.label }]}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={14} color={chosen.label} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                            */
/* ------------------------------------------------------------------ */

export function Skeleton({ width, height, style }: { width?: number | string; height: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.skeleton,
        { height, width: width as ViewStyle['width'] },
        style,
      ]}
    />
  );
}

export function PropertyCardSkeleton() {
  return (
    <View style={styles.skeletonCard} testID="property-card-skeleton">
      <Skeleton height={180} style={{ borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg }} />
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Skeleton height={16} width="70%" />
        <Skeleton height={13} width="45%" />
        <Skeleton height={13} width="55%" />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3, renderItem }: { count?: number; renderItem: () => ReactNode }) {
  return (
    <View style={{ gap: spacing.lg }} testID="skeleton-list">
      {Array.from({ length: count }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <View key={index}>{renderItem()}</View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Misc primitives                                                      */
/* ------------------------------------------------------------------ */

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function Avatar({
  uri,
  name,
  size = layout.avatarMd,
  verified,
}: {
  uri?: string | null | undefined;
  name?: string | null | undefined;
  size?: number;
  verified?: boolean;
}) {
  const initials = (name ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <View
          accessibilityRole="image"
          accessibilityLabel={`${name ?? 'Profile'} photo`}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
            transition={150}
            accessible
          />
        </View>
      ) : (
        <View
          accessibilityRole="image"
          accessibilityLabel={`${name ?? 'Profile'}`}
          style={[
            styles.avatar,
            styles.avatarFallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.avatarInitials, { fontSize: size * 0.36 }]}>{initials || '?'}</Text>
        </View>
      )}
      {verified ? (
        <View style={styles.avatarVerified}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        </View>
      ) : null}
    </View>
  );
}

export function StatTile({
  label,
  value,
  icon,
  tone = 'info',
  onPress,
}: {
  label: string;
  value: string | number;
  icon?: IconName;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={[styles.statIcon, statTone[tone].container]}>
        <Ionicons name={icon ?? 'analytics-outline'} size={18} color={statTone[tone].label} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.statTile}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.statTile, pressed && styles.cardPressed]}
    >
      {content}
    </Pressable>
  );
}

export function Row({
  label,
  value,
  icon,
  onPress,
  valueColor,
}: {
  label: string;
  value?: string | null;
  icon?: IconName;
  onPress?: () => void;
  valueColor?: string;
}) {
  const body = (
    <View style={styles.row}>
      {icon ? <Ionicons name={icon} size={18} color={colors.textMuted} style={{ width: 24 }} /> : null}
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
        {value ?? '—'}
      </Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${value ? `: ${value}` : ''}`}
      onPress={onPress}
      hitSlop={hitSlop}
    >
      {body}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  button: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonFullWidth: { alignSelf: 'stretch' },
  buttonDisabled: { opacity: 0.55 },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  badgeLabel: { fontSize: 11, fontWeight: '600' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 34,
  },
  chipPressed: { backgroundColor: colors.surfaceMuted },
  chipSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipLabel: { fontSize: 13, color: colors.textSecondary },
  chipLabelSelected: { color: colors.primary, fontWeight: '600' },

  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.giant,
    paddingHorizontal: spacing.lg,
  },
  loadingCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  alert: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'flex-start',
  },
  alertTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  alertMessage: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  alertAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.sm,
    minHeight: 32,
  },
  alertActionText: { fontSize: 13, fontWeight: '700' },

  skeleton: { backgroundColor: colors.skeleton, borderRadius: radii.sm },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  divider: { height: 1, backgroundColor: colors.divider },

  avatar: { overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  avatarInitials: { color: colors.primary, fontWeight: '700' },
  avatarVerified: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },

  statTile: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: layout.controlHeight,
  },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text },
  rowValue: { fontSize: 14, color: colors.textSecondary, maxWidth: 180 },
});

/* ------------------------------------------------------------------ */
/* Variant maps                                                         */
/* ------------------------------------------------------------------ */

const buttonSize = StyleSheet.create({
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 36 },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: layout.controlHeight },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, minHeight: 56 },
});

const buttonLabel = StyleSheet.create({
  sm: { fontSize: 13, fontWeight: '600' },
  md: { fontSize: 15, fontWeight: '600' },
  lg: { fontSize: 16, fontWeight: '700' },
});

const buttonVariant = {
  primary: {
    container: { backgroundColor: colors.primary },
    pressed: { backgroundColor: colors.primaryPressed },
    label: { color: colors.textInverse },
  },
  secondary: {
    container: { backgroundColor: colors.primarySoft },
    pressed: { backgroundColor: colors.primarySoftBorder },
    label: { color: colors.primary },
  },
  outline: {
    container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    pressed: { backgroundColor: colors.surfaceMuted },
    label: { color: colors.text },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    pressed: { backgroundColor: colors.surfaceMuted },
    label: { color: colors.primary },
  },
  danger: {
    container: { backgroundColor: colors.danger },
    pressed: { backgroundColor: colors.danger },
    label: { color: colors.textInverse },
  },
} as const;

const badgeTone = {
  neutral: { container: { backgroundColor: colors.surfaceMuted }, label: colors.textSecondary },
  info: { container: { backgroundColor: colors.infoSoft }, label: colors.info },
  success: { container: { backgroundColor: colors.successSoft }, label: colors.success },
  warning: { container: { backgroundColor: colors.warningSoft }, label: colors.warning },
  danger: { container: { backgroundColor: colors.dangerSoft }, label: colors.danger },
} as const;

const statTone = {
  info: { container: { backgroundColor: colors.infoSoft }, label: colors.info },
  success: { container: { backgroundColor: colors.successSoft }, label: colors.success },
  warning: { container: { backgroundColor: colors.warningSoft }, label: colors.warning },
  danger: { container: { backgroundColor: colors.dangerSoft }, label: colors.danger },
  neutral: { container: { backgroundColor: colors.surfaceMuted }, label: colors.textSecondary },
} as const;

export { styles as uiStyles };