import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { AppText, Avatar, Badge, EmptyState } from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { toMessage } from '@/lib/errors';
import { MESSAGE_MAX_LENGTH } from '@/utils/validation';
import { formatDayDivider, formatTime } from '@/utils/format';
import { colors, layout, radii, spacing } from '@/theme';

/**
 * One conversation.
 *
 * Messages are stored flat and rendered grouped by day, with a sent/received
 * alignment. The composer disables itself at the length limit rather than
 * silently truncating, because a cut-off message about move-in dates is worse
 * than one that never sends.
 */
export default function ConversationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id ?? '';

  const {
    profile,
    conversations,
    messages,
    sendMessage,
    markConversationRead,
  } = useApp();

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const conversation = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversations, conversationId],
  );

  const thread = useMemo(
    () =>
      messages
        .filter((message) => message.conversationId === conversationId)
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()),
    [messages, conversationId],
  );

  /**
   * Which messages start a new day, decided in one pass rather than by mutating
   * a variable as the list is walked during render.
   *
   * A date divider only earns its space when the day actually changes. Folding
   * here rather than inside the `.map` callback keeps render pure, and means
   * placement follows the message's position in the thread instead of depending
   * on evaluation order.
   */
  const decorated = useMemo(() => {
    const list: {
      message: (typeof thread)[number];
      day: string;
      startsNewDay: boolean;
    }[] = [];
    let previousDay = '';
    for (const message of thread) {
      const day = formatDayDivider(message.sentAt);
      list.push({ message, day, startsNewDay: day !== previousDay });
      previousDay = day;
    }
    return list;
  }, [thread]);

  // Opening a thread is what clears its badge, so this runs on the thread id
  // rather than on a "has unread" flag that would flip under us.
  useEffect(() => {
    if (!conversationId) return;
    void markConversationRead(conversationId);
  }, [conversationId, markConversationRead]);

  // New messages land at the bottom, so keep the view there.
  useEffect(() => {
    if (thread.length === 0) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(timer);
  }, [thread.length]);

  async function handleSend() {
    const body = draft.trim();
    if (body.length === 0 || isSending) return;

    setIsSending(true);
    setError(null);

    const result = await sendMessage(conversationId, body);
    setIsSending(false);

    if (!result.ok) {
      setError(toMessage(result.error, 'That message did not send.'));
      return;
    }
    setDraft('');
  }

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Conversation" />
        <EmptyState
          icon="chatbubbles-outline"
          title="That conversation is gone"
          message="It may have been cleared with the demo data."
          actionLabel="Back to messages"
          onAction={() => router.replace('/(app)/messages')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={conversation.roommateName}
        subtitle={conversation.roommateOccupation}
        right={
          <Pressable
            onPress={() => router.push(`/(app)/roommate/${conversation.roommateId}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${conversation.roommateName}'s profile`}
            style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
          >
            <Avatar
              uri={conversation.roommateAvatarUrl}
              name={conversation.roommateName}
              size={34}
            />
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contextCard}>
            <Badge
              label={`${conversation.roommateCompatibility}% compatible with you`}
              tone="info"
              icon="heart-outline"
            />
            <AppText variant="caption">
              You matched through a roommate request, so you can agree the details here before
              anything is signed.
            </AppText>
          </View>

          {thread.length === 0 ? (
            <AppText variant="caption" align="center" style={styles.emptyThread}>
              No messages yet. Say hello and mention where you want to live.
            </AppText>
          ) : null}

          {decorated.map(({ message, day, startsNewDay }) => {
            const isMine = message.senderId === profile.id;

            return (
              <View key={message.id}>
                {startsNewDay ? (
                  <View style={styles.divider}>
                    <AppText variant="overline" color={colors.textMuted}>
                      {day}
                    </AppText>
                  </View>
                ) : null}

                <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : null]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <AppText variant="body" color={isMine ? colors.textInverse : colors.text}>
                      {message.body}
                    </AppText>
                    <AppText
                      variant="overline"
                      color={isMine ? 'rgba(255,255,255,0.75)' : colors.textMuted}
                      style={styles.bubbleTime}
                    >
                      {formatTime(message.sentAt)}
                    </AppText>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={15} color={colors.danger} />
            <AppText variant="caption" color={colors.danger} style={styles.errorText}>
              {error}
            </AppText>
          </View>
        ) : null}

        <View style={styles.composer}>
          <View style={styles.composerField}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={MESSAGE_MAX_LENGTH}
              accessibilityLabel="Message"
              style={styles.composerInput}
            />
            <AppText variant="overline" color={colors.textMuted}>
              {draft.length}/{MESSAGE_MAX_LENGTH}
            </AppText>
          </View>
          <Pressable
            onPress={() => void handleSend()}
            disabled={draft.trim().length === 0 || isSending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: draft.trim().length === 0 }}
            style={({ pressed }) => [
              styles.sendButton,
              draft.trim().length === 0 && styles.sendButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="send" size={19} color={colors.textInverse} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.65 },

  scroll: { flex: 1 },
  scrollContent: { padding: layout.screenPadding, gap: spacing.xs, paddingBottom: spacing.xl },

  contextCard: {
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },

  emptyThread: { paddingVertical: spacing.xl },

  divider: { alignItems: 'center', paddingVertical: spacing.md },
  bubbleRow: { flexDirection: 'row', marginVertical: spacing.xxs },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '84%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.lg },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: radii.xs },
  bubbleTheirs: {
    backgroundColor: colors.surfaceMuted,
    borderBottomLeftRadius: radii.xs,
  },
  bubbleTime: { alignSelf: 'flex-end', marginTop: 2 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: layout.screenPadding },
  errorText: { flex: 1 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: layout.screenPadding,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  composerField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    maxHeight: 110,
    padding: 0,
    paddingTop: Platform.OS === 'ios' ? spacing.sm : 0,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: { backgroundColor: colors.borderStrong },
});