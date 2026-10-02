import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { AppText } from '@/components/ui';
import type { IconName } from '@/constants/options';
import { colors, hitSlop, radii, spacing } from '@/theme';

type IconNameType = ComponentProps<typeof Ionicons>['name'];

export interface TabScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Rendered on the trailing edge, e.g. a notifications button. */
  action?: ReactNode;
}

/**
 * Standard heading for the five tab screens.
 *
 * Keeps every tab visually identical at the top so switching tabs does not feel
 * like navigating to a different app.
 */
export function TabScreenHeader({ title, subtitle, action }: TabScreenHeaderProps) {
  return (
    <View style={styles.tabRoot}>
      <View style={styles.text}>
        <AppText variant="title" accessibilityRole="header" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  /** Rendered on the trailing edge, e.g. an edit or overflow button. */
  action?: ReactNode;
}

/** Header for screens pushed above the tab bar, with an optional back control. */
export function ScreenHeader({ title, subtitle, onBack, backLabel = 'Back', action }: ScreenHeaderProps) {
  return (
    <View style={styles.root}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          hitSlop={hitSlop}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}

      <View style={styles.text}>
        <AppText variant="heading" accessibilityRole="header" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

/** Circular icon button sized for a 44pt touch target. */
export function HeaderIconButton({
  icon,
  label,
  onPress,
  count,
}: {
  icon: IconNameType;
  label: string;
  onPress: () => void;
  /** Optional unread/total count badge. */
  count?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count && count > 0 ? `${label}, ${count}` : label}
      onPress={onPress}
      hitSlop={hitSlop}
      style={({ pressed }) => [styles.iconButton, pressed && styles.backPressed]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
      {count !== undefined && count > 0 ? (
        <View style={styles.badge}>
          <AppText variant="overline" color={colors.textInverse}>
            {count > 99 ? '99+' : String(count)}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  tabRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  text: { flex: 1, gap: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  backPressed: { opacity: 0.7 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
});