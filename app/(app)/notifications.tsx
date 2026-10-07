import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/screen-header';
import { AppText, Badge, Button, EmptyState, Screen, ScreenScroll } from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { NOTIFICATION_META } from '@/services/notification-service';
import { formatRelativePast, RECENCY_BUCKET_LABEL, RECENCY_BUCKETS, recencyBucket } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';
import type { AppNotification } from '@/lib/types';

/**
 * Everything that happened while you were elsewhere.
 *
 * Reading the screen clears it, because the point of a notification is that
 * once you have seen it there is nothing left to do. "Mark all read" stays
 * available for when someone just wants the list tidy without reading it.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();

  /**
   * Grouped newest-first by recency.
   *
   * The bucket comes from a shared helper rather than date arithmetic here, so
   * the component stays a pure function of the notification list it was handed.
   */
  const groups = useMemo(
    () =>
      RECENCY_BUCKETS.map((bucket) => ({
        label: RECENCY_BUCKET_LABEL[bucket],
        items: notifications.filter((notification) => recencyBucket(notification.createdAt) === bucket),
      })).filter((group) => group.items.length > 0),
    [notifications],
  );

  function open(notification: AppNotification) {
    void markNotificationRead(notification.id);
    if (!notification.href) return;

    // Fixtures were authored before the route groups existed, so the stored
    // hrefs are rewritten here rather than trusting a stale string.
    router.push(normaliseHref(notification.href));
  }

  return (
    <Screen testID="notifications-screen">
      <ScreenHeader
        title="Notifications"
        subtitle={
          unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'You are all caught up'
        }
        action={
          unreadNotificationCount > 0
            ? {
                icon: 'checkmark-done-outline',
                label: 'Mark all as read',
                onPress: () => void markAllNotificationsRead(),
              }
            : undefined
        }
      />

      <ScreenScroll>
        {notifications.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="Nothing yet"
            message="Applications, roommate requests and new messages show up here. Nothing else does."
            actionLabel="Browse rooms"
            onAction={() => router.push('/(app)/(tabs)/rooms')}
          />
        ) : (
          groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <AppText variant="overline" color={colors.textMuted}>
                {group.label}
              </AppText>
              {group.items.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onPress={() => open(notification)}
                />
              ))}
            </View>
          ))
        )}

        <Button
          label="Manage notifications"
          variant="ghost"
          size="sm"
          icon="options-outline"
          onPress={() => router.push('/(app)/settings')}
        />
      </ScreenScroll>
    </Screen>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const meta = NOTIFICATION_META[notification.kind];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}. ${notification.title}. ${notification.body}${
        notification.isRead ? '' : '. Unread'
      }`}
      accessibilityHint={notification.href ? 'Opens what this is about' : undefined}
      style={({ pressed }) => [
        styles.row,
        notification.isRead ? null : styles.rowUnread,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, notification.isRead ? styles.iconRead : styles.iconNew]}>
        <Ionicons name={meta.icon} size={17} color={notification.isRead ? colors.textSecondary : colors.primary} />
      </View>

      <View style={styles.rowText}>
        <View style={styles.rowHeader}>
          <Badge label={meta.label} tone={meta.tone} />
          <AppText variant="overline" color={colors.textMuted} style={styles.time}>
            {formatRelativePast(notification.createdAt)}
          </AppText>
        </View>
        <AppText variant="bodyStrong">{notification.title}</AppText>
        <AppText variant="caption">{notification.body}</AppText>
      </View>

      {!notification.isRead ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

/**
 * Maps a stored notification href onto a current route.
 *
 * The fixture hrefs read like `/room/x` or `/messages/convo-alex`; the live tree
 * nests those under `/(app)`. Rewriting here keeps the fixtures free of router
 * details and means a route move does not need a data migration.
 */
function normaliseHref(href: string): string {
  if (href.startsWith('/(app)')) return href;
  if (href === '/applications') return '/(app)/applications';
  if (href === '/messages') return '/(app)/messages';
  if (href.startsWith('/messages/')) return `/(app)/messages/${href.slice('/messages/'.length)}`;
  if (href.startsWith('/roommate/')) return `/(app)/roommate/${href.slice('/roommate/'.length)}`;
  if (href.startsWith('/room/')) return `/(app)/room/${href.slice('/room/'.length)}`;
  return '/(app)/(tabs)';
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  rowUnread: { borderColor: colors.primarySoftBorder, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.7 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRead: { backgroundColor: colors.surfaceMuted },
  iconNew: { backgroundColor: colors.surface },
  rowText: { flex: 1, gap: 2 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  time: { flexShrink: 0 },
  dot: {
    width: 8,
    height: 8,
    marginTop: spacing.md,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
