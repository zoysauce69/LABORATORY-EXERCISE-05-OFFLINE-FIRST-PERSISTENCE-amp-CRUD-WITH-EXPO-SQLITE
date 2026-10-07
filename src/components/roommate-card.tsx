import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText, Avatar, Badge, Card } from '@/components/ui';
import { colors, layout, radii, spacing } from '@/theme';
import { lifestyleSummary } from '@/constants/options';
import { formatPesoRange, formatRelativeFuture } from '@/utils/format';
import type { MatchKind, Roommate } from '@/lib/types';

interface RoommateCardProps {
  roommate: Roommate;
  onPress: () => void;
  onToggleSave?: () => void;
  isSaved?: boolean;
  onMessage?: () => void;
  /** Width for the landing page rail. Undefined means full width. */
  width?: number;
  testID?: string;
}

const MATCH_TONE: Record<MatchKind, 'success' | 'warning' | 'danger'> = {
  match: 'success',
  near: 'warning',
  mismatch: 'danger',
};

const MATCH_ICON: Record<MatchKind, 'checkmark-circle' | 'ellipse-outline' | 'close-circle'> = {
  match: 'checkmark-circle',
  near: 'ellipse-outline',
  mismatch: 'close-circle',
};

/**
 * A roommate, scored against the signed-in profile.
 *
 * The compatibility percentage leads because it is the reason this person
 * surfaced at all, and the top two match reasons are shown rather than hidden,
 * so the score is explainable instead of magic.
 */
function RoommateCardComponent({
  roommate,
  onPress,
  onToggleSave,
  isSaved = false,
  onMessage,
  width,
  testID,
}: RoommateCardProps) {
  const topReasons = roommate.matchReasons.filter((r) => r.kind === 'match').slice(0, 2);
  const topMismatch = roommate.matchReasons.find((r) => r.kind === 'mismatch');

  return (
    <Card
      onPress={onPress}
      style={width ? { width } : undefined}
      accessibilityLabel={`${roommate.fullName}, ${roommate.compatibilityScore}% compatible`}
      accessibilityHint="Opens the roommate profile"
      testID={testID ?? `roommate-card-${roommate.id}`}
    >
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Avatar uri={roommate.avatarUrl} name={roommate.fullName} size={layout.avatarMd} verified={roommate.verified} />
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <AppText variant="subheading" numberOfLines={1}>
                {roommate.fullName}
              </AppText>
            </View>
            <AppText variant="caption" numberOfLines={1}>
              {roommate.schoolOrWork}
            </AppText>
          </View>
          {onToggleSave ? (
            <Pressable
              onPress={onToggleSave}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityState={{ selected: isSaved }}
              accessibilityLabel={isSaved ? 'Remove from saved' : `Save ${roommate.fullName}`}
              style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={20}
                color={isSaved ? colors.primary : colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreBlock}>
            <AppText variant="scoreValue">{roommate.compatibilityScore}%</AppText>
            <AppText variant="caption">compatible</AppText>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreFacts}>
            <AppText variant="captionStrong">
              {formatPesoRange(roommate.budgetMin, roommate.budgetMax)}/mo
            </AppText>
            <AppText variant="caption">
              {roommate.preferredCity} · free {formatRelativeFuture(roommate.moveInDate)}
            </AppText>
          </View>
        </View>

        <View style={styles.summaryBox}>
          <AppText variant="caption" numberOfLines={2}>
            {lifestyleSummary(roommate.lifestyle)}
          </AppText>
        </View>

        {topReasons.length > 0 ? (
          <View style={styles.reasonList}>
            {topReasons.map((reason) => (
              <View key={reason.label} style={styles.reasonRow}>
                <Ionicons name={MATCH_ICON[reason.kind]} size={14} color={MATCH_TONE[reason.kind] === 'success' ? colors.success : colors.textMuted} />
                <AppText variant="caption" numberOfLines={1} style={styles.reasonText}>
                  {reason.detail}
                </AppText>
              </View>
            ))}
            {topMismatch ? (
              <View style={styles.reasonRow}>
                <Ionicons name={MATCH_ICON[topMismatch.kind]} size={14} color={colors.danger} />
                <AppText variant="caption" numberOfLines={1} style={styles.reasonText} color={colors.textMuted}>
                  {topMismatch.detail}
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}

        {roommate.requestStatus ? (
          <View style={styles.statusRow}>
            <Badge
              label={
                roommate.requestStatus === 'approved'
                  ? 'Connected'
                  : roommate.requestStatus === 'pending'
                    ? 'Request sent'
                    : roommate.requestStatus === 'rejected'
                      ? 'Declined'
                      : 'Request cancelled'
              }
              tone={roommate.requestStatus === 'approved' ? 'success' : 'warning'}
              icon="paper-plane"
            />
          </View>
        ) : onMessage ? (
          <Pressable
            onPress={onMessage}
            accessibilityRole="button"
            accessibilityLabel={`Message ${roommate.fullName}`}
            style={({ pressed }) => [styles.messageButton, pressed && styles.messageButtonPressed]}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
            <AppText variant="captionStrong" color={colors.primary}>
              Say hello
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

export const RoommateCard = memo(RoommateCardComponent);

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  saveButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonPressed: { opacity: 0.6 },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  scoreBlock: { alignItems: 'center' },
  scoreDivider: { width: 1, height: 32, backgroundColor: colors.divider },
  scoreFacts: { flex: 1, gap: 2 },

  summaryBox: {
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },

  reasonList: { gap: spacing.xs },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reasonText: { flex: 1 },

  statusRow: { flexDirection: 'row' },

  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  messageButtonPressed: { opacity: 0.7 },
});