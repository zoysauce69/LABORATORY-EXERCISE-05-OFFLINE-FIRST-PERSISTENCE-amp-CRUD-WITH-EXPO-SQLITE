import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/screen-header';
import {
  AppText,
  Avatar,
  EmptyState,
  Screen,
  ScreenScroll,
} from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { formatRelativePast } from '@/utils/format';
import { colors, layout, radii, spacing } from '@/theme';
import type { Conversation } from '@/lib/types';

/**
 * Message threads.
 *
 * One row per roommate, newest activity first. Messages are pre-seeded, so this
 * screen opens populated rather than empty on a fresh demo.
 */
export default function MessagesScreen() {
  const router = useRouter();
  const { conversations } = useApp();

  const sorted = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      ),
    [conversations],
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
    [conversations],
  );

  return (
    <Screen testID="messages-screen">
      <ScreenHeader
        title="Messages"
        subtitle={
          totalUnread > 0
            ? `${totalUnread} unread`
            : conversations.length > 0
              ? 'You are all caught up'
              : 'Nobody has written yet'
        }
      />

      <ScreenScroll>
        {sorted.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations yet"
            message="Find someone who scores well and say hello first. Talking before you apply is the cheapest way to find out whether it works."
            actionLabel="Find roommates"
            onAction={() => router.push('/(app)/(tabs)/roommates')}
          />
        ) : (
          <View style={styles.list}>
            {sorted.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                onOpen={() => router.push(`/(app)/messages/${conversation.id}`)}
              />
            ))}
          </View>
        )}
      </ScreenScroll>
    </Screen>
  );
}

function ConversationRow({
  conversation,
  onOpen,
}: {
  conversation: Conversation;
  onOpen: () => void;
}) {
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${conversation.roommateName}${
        hasUnread ? `, ${conversation.unreadCount} unread` : ''
      }. ${conversation.lastMessage}`}
      accessibilityHint="Opens this conversation"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar
        uri={conversation.roommateAvatarUrl}
        name={conversation.roommateName}
        size={layout.avatarMd}
      />

      <View style={styles.rowText}>
        <View style={styles.rowHeader}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.rowName}>
            {conversation.roommateName}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {formatRelativePast(conversation.lastMessageAt)}
          </AppText>
        </View>
        <AppText
          variant="caption"
          numberOfLines={2}
          color={hasUnread ? colors.text : colors.textMuted}
        >
          {conversation.lastMessage.length > 0 ? conversation.lastMessage : 'Say hello to start the conversation'}
        </AppText>
      </View>

      {hasUnread ? (
        <View style={styles.unreadBadge}>
          <AppText variant="overline" color={colors.textInverse}>
            {conversation.unreadCount}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  rowText: { flex: 1, gap: 2 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowName: { flex: 1 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
});