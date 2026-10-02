import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/tab-screen-header';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  InlineAlert,
  LoadingState,
  Screen,
} from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { formatTimeAgo } from '@/utils/format';
import type { IconName } from '@/constants/options';
import type { NotificationRow } from '@/lib/database.types';
import { colors, radii, spacing } from '@/theme';

/**
 * Shared notification centre.
 *
 * Backed by the `notifications` table, so it stays useful even when the device
 * denies push permission — the unread badge is the source of truth.
 */
export function NotificationCentre() {
  const router = useRouter();
  const { user, role } = useAuth();
  const notifications = useNotifications(user?.id);

  const isLandlord = role === 'landlord';
  const backRoute = isLandlord ? '/(landlord)/(tabs)' : '/(student)/(tabs)';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Notifications"
          onBack={() => router.push(backRoute)}
          backLabel="Back"
          action={
            notifications.unreadCount > 0 ? (
              <Button
                label="Mark all read"
                variant="ghost"
                size="sm"
                onPress={() => void notifications.markAllRead()}
              />
            ) : null
          }
        />

        {notifications.error ? (
          <ErrorState message={notifications.error} onRetry={notifications.reload} />
        ) : null}

        {notifications.actionError ? (
          <InlineAlert
            tone="danger"
            message={notifications.actionError}
            actionLabel="Dismiss"
            onAction={notifications.clearActionError}
          />
        ) : null}

        {notifications.isInitialLoading ? (
          <LoadingState label="Loading notifications…" />
        ) : (notifications.data ?? []).length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="Nothing to report"
            message={
              isLandlord
                ? 'Viewing and rental requests appear here as soon as a renter sends one.'
                : 'Updates to your requests and saved listings will appear here.'
            }
          />
        ) : (
          <View style={styles.list}>
            {notifications.unreadCount > 0 ? (
              <InlineAlert
                tone="info"
                message={`${notifications.unreadCount} unread update${notifications.unreadCount === 1 ? '' : 's'}.`}
              />
            ) : null}

            {(notifications.data ?? []).map((item) => {
              const target = notificationTarget(item, isLandlord);
              return (
                <NotificationItem
                  key={item.id}
                  item={item}
                  target={target}
                  onPress={() => {
                    // Mark read first so the row is not still unread on return.
                    void notifications.markRead(item.id);
                    if (target) {
                      // The link comes from the database at runtime, so it cannot
                      // be narrowed to a literal route at compile time.
                      router.push(target as Href);
                    }
                  }}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

interface NotificationItemProps {
  item: NotificationRow;
  /** In-app path this row opens, or null when there is nowhere safe to go. */
  target: string | null;
  onPress: () => void;
}

function NotificationItem({ item, target, onPress }: NotificationItemProps) {
  const unread = item.read_at === null;

  const content = (
    <>
      <View style={[styles.itemIcon, unread && styles.itemIconUnread]}>
        <Ionicons
          name={iconForType(item.type)}
          size={18}
          color={unread ? colors.primary : colors.textMuted}
        />
      </View>

      <View style={styles.itemText}>
        <View style={styles.itemTitleRow}>
          <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
            {item.title}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {formatTimeAgo(item.created_at)}
          </AppText>
        </View>
        <AppText variant="caption" numberOfLines={3}>
          {item.body}
        </AppText>
        {target ? (
          <AppText variant="caption" color={colors.primary}>
            Tap to open
          </AppText>
        ) : null}
      </View>

      {unread ? <View style={styles.unreadDot} /> : null}
    </>
  );

  if (!target) {
    return <View style={[styles.item, unread && styles.itemUnread]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${unread ? ', unread' : ''}`}
      accessibilityHint="Opens the related screen"
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        unread && styles.itemUnread,
        pressed && styles.itemPressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

/**
 * Resolves the screen a notification links to.
 *
 * Links are stored as a path string in `data.link` by the database triggers.
 * Unknown or missing links render as a non-tappable row rather than navigating
 * somewhere arbitrary.
 */
function notificationTarget(
  item: NotificationRow,
  isLandlord: boolean,
): string | null {
  const link = item.data?.link;
  if (typeof link !== 'string' || link.length === 0) return null;

  // Only in-app paths are followed; anything else is ignored on purpose so a
  // compromised trigger cannot turn a notification into an arbitrary redirect.
  if (!link.startsWith('/')) return null;

  const tabRoot = isLandlord ? '/(landlord)' : '/(student)';
  return link.startsWith('/') && !link.startsWith('/(auth)') && !link.startsWith('/(student)') && !link.startsWith('/(landlord)')
    ? link
    : link.startsWith(tabRoot)
      ? link
      : `${tabRoot}${link}`;
}

function iconForType(type: NotificationRow['type']): IconName {
  switch (type) {
    case 'booking_update':
      return 'calendar-outline';
    case 'roommate_request':
      return 'person-add-outline';
    case 'roommate_response':
      return 'people-outline';
    case 'listing_update':
      return 'home-outline';
    case 'verification_update':
      return 'shield-checkmark-outline';
    case 'system':
    default:
      return 'information-circle-outline';
  }
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.huge },
  list: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  itemUnread: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  itemPressed: { opacity: 0.85 },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconUnread: { backgroundColor: colors.surface },
  itemText: { flex: 1, gap: 2 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
});