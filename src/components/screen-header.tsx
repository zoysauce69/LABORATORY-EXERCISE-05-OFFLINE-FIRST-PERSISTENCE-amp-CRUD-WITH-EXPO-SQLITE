import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui';
import { colors, hitSlop, layout, radii, spacing } from '@/theme';
import type { IconName } from '@/lib/types';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a back affordance. Defaults to true for every screen but the tabs. */
  onBack?: boolean | (() => void);
  right?: ReactNode;
  /** Single action rendered as an icon button, e.g. a filter bell. */
  action?: { icon: IconName; label: string; onPress: () => void; badge?: number };
}

/**
 * The top bar shared by every screen below the tabs.
 *
 * Kept as one component so the title baseline, back chevron and safe-area padding
 * are identical everywhere — a per-screen header is where those drift apart.
 */
export function ScreenHeader({ title, subtitle, onBack = true, right, action }: ScreenHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    // Falls back to the tabs so the header never dead-ends on a deep link.
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)');
  }

  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={handleBack}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}

      <View style={styles.titleBlock}>
        <AppText variant="heading" numberOfLines={1} accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {right}

      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel={
            action.badge && action.badge > 0
              ? `${action.label}, ${action.badge} unread`
              : action.label
          }
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name={action.icon} size={20} color={colors.text} />
          {action.badge && action.badge > 0 ? (
            <View style={styles.actionBadge}>
              <AppText variant="overline" color={colors.textInverse}>
                {action.badge > 9 ? '9+' : action.badge}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  titleBlock: { flex: 1, gap: 1 },
  actionBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
});