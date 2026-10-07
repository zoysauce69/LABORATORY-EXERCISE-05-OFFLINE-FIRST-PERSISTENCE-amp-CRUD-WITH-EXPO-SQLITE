import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RequestSheet } from '@/components/request-sheet';
import { RoommateCard } from '@/components/roommate-card';
import { ScreenHeader } from '@/components/screen-header';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Divider,
  EmptyState,
  InlineAlert,
} from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { useRoommate } from '@/hooks/use-search';
import {
  CLEANLINESS_LABELS,
  GUEST_OPTIONS,
  PET_OPTIONS,
  SMOKING_OPTIONS,
  DRINKING_OPTIONS,
  STUDY_HABIT_OPTIONS,
  SLEEP_SCHEDULE_OPTIONS,
  lifestyleSummary,
} from '@/constants/options';
import { topMatches } from '@/services/roommate-service';
import { formatPesoRange, formatRelativeFuture } from '@/utils/format';
import { colors, layout, radii, spacing } from '@/theme';
import type { IconName, MatchKind, MatchReason } from '@/lib/types';

/**
 * A roommate's profile.
 *
 * The compatibility breakdown is the centre of this screen. A bare percentage is
 * a black box, so every axis is shown with both people's answers next to each
 * other — that way a 72% is legible ("they have guests, I do not") rather than
 * something to take on trust.
 */
export default function RoommateDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, toggleSavedRoommate, requestRoommate, openConversation } = useApp();

  const [isRequestOpen, setIsRequestOpen] = useState(false);

  // Reads the fixture and re-scores it against the current profile, so editing
  // your lifestyle updates this page's numbers rather than leaving them stale.
  const roommate = useRoommate(id);

  const similar = useMemo(() => {
    if (!roommate) return [];
    return topMatches(profile, 8)
      .filter((r) => r.id !== roommate.id)
      .slice(0, 3);
  }, [roommate, profile]);

  if (!roommate) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Roommate" />
        <EmptyState
          icon="people-outline"
          title="We could not find that roommate"
          message="They may have stopped looking. Here are the people who match you best right now."
          actionLabel="See matches"
          onAction={() => router.replace('/(app)/(tabs)/roommates')}
        />
      </SafeAreaView>
    );
  }

  const isSaved = roommate.isSaved;

  function handleMessage() {
    void openConversation(roommate?.id ?? '').then((result) => {
      if (result.ok) router.push(`/(app)/messages/${result.data.id}`);
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={roommate.fullName}
        subtitle={roommate.schoolOrWork}
        right={
          <Pressable
            onPress={() => void toggleSavedRoommate(roommate.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSaved }}
            accessibilityLabel={isSaved ? 'Remove from saved' : `Save ${roommate.fullName}`}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={20}
              color={isSaved ? colors.primary : colors.textSecondary}
            />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity ─────────────────────────────────────────── */}
        <View style={styles.identity}>
          <Avatar
            uri={roommate.avatarUrl}
            name={roommate.fullName}
            size={layout.avatarLg}
            verified={roommate.verified}
          />
          <AppText variant="title" align="center">
            {roommate.fullName}
          </AppText>
          <AppText variant="caption" align="center">
            {roommate.schoolOrWork}
          </AppText>
          <AppText variant="body" align="center" style={styles.headline}>
            {roommate.headline}
          </AppText>
        </View>

        <View style={styles.badgeRow}>
          {roommate.verified ? <Badge label="ID verified" tone="success" icon="checkmark-circle" /> : null}
          <Badge label={`Replies in ${roommate.responseTime}`} tone="neutral" icon="time-outline" />
          {roommate.requestStatus ? (
            <Badge
              label={
                roommate.requestStatus === 'approved'
                  ? 'Connected'
                  : roommate.requestStatus === 'pending'
                    ? 'Request sent'
                    : roommate.requestStatus === 'rejected'
                      ? 'Declined'
                      : 'Request withdrawn'
              }
              tone={
                roommate.requestStatus === 'approved'
                  ? 'success'
                  : roommate.requestStatus === 'rejected'
                    ? 'danger'
                    : 'warning'
              }
              icon="paper-plane"
            />
          ) : null}
        </View>

        {/* ── Score ────────────────────────────────────────────── */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreBlock}>
            <AppText variant="display" color={colors.primary}>
              {roommate.compatibilityScore}%
            </AppText>
            <AppText variant="caption">compatible with you</AppText>
          </View>
          <View style={styles.scoreFacts}>
            <AppText variant="bodyStrong">
              {formatPesoRange(roommate.budgetMin, roommate.budgetMax)}/mo
            </AppText>
            <AppText variant="caption">
              Looking in {roommate.preferredBarangay}, {roommate.preferredCity}
            </AppText>
            <AppText variant="caption">
              Free {formatRelativeFuture(roommate.moveInDate)}
            </AppText>
          </View>
        </View>

        <InlineAlert
          tone="info"
          title="How this is calculated"
          message="Six axes: budget overlap, sleep schedule, study habits, cleanliness, guests and smoking. Each one moves the score, so edit your own lifestyle in your profile and this number changes."
        />

        {/* ── Why we think so ──────────────────────────────────── */}
        {roommate.matchReasons.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="heading" accessibilityRole="header">
              Where you agree
            </AppText>
            <View style={styles.reasonList}>
              {roommate.matchReasons.map((reason) => (
                <ReasonRow key={`${reason.kind}-${reason.label}`} reason={reason} />
              ))}
            </View>
          </View>
        ) : null}

        <Divider />

        {/* ── Side by side ─────────────────────────────────────── */}
        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            Side by side
          </AppText>

          <Comparison
            label="Sleep schedule"
            mine={SLEEP_SCHEDULE_OPTIONS.find((o) => o.value === profile.lifestyle.sleepSchedule)?.label ?? '—'}
            theirs={SLEEP_SCHEDULE_OPTIONS.find((o) => o.value === roommate.lifestyle.sleepSchedule)?.label ?? '—'}
            agree={profile.lifestyle.sleepSchedule === roommate.lifestyle.sleepSchedule}
          />
          <Comparison
            label="Study habits"
            mine={STUDY_HABIT_OPTIONS.find((o) => o.value === profile.lifestyle.studyHabits)?.label ?? '—'}
            theirs={STUDY_HABIT_OPTIONS.find((o) => o.value === roommate.lifestyle.studyHabits)?.label ?? '—'}
            agree={profile.lifestyle.studyHabits === roommate.lifestyle.studyHabits}
          />
          <Comparison
            label="Cleanliness"
            mine={`${CLEANLINESS_LABELS[profile.lifestyle.cleanliness] ?? '—'} (${profile.lifestyle.cleanliness}/5)`}
            theirs={`${CLEANLINESS_LABELS[roommate.lifestyle.cleanliness] ?? '—'} (${roommate.lifestyle.cleanliness}/5)`}
            agree={profile.lifestyle.cleanliness === roommate.lifestyle.cleanliness}
            warn={Math.abs(profile.lifestyle.cleanliness - roommate.lifestyle.cleanliness) >= 2}
          />
          <Comparison
            label="Guests"
            mine={GUEST_OPTIONS.find((o) => o.value === profile.lifestyle.guests)?.label ?? '—'}
            theirs={GUEST_OPTIONS.find((o) => o.value === roommate.lifestyle.guests)?.label ?? '—'}
            agree={profile.lifestyle.guests === roommate.lifestyle.guests}
            warn={profile.lifestyle.guests !== roommate.lifestyle.guests}
          />
          <Comparison
            label="Smoking"
            mine={SMOKING_OPTIONS.find((o) => o.value === profile.lifestyle.smoking)?.label ?? '—'}
            theirs={SMOKING_OPTIONS.find((o) => o.value === roommate.lifestyle.smoking)?.label ?? '—'}
            agree={profile.lifestyle.smoking === roommate.lifestyle.smoking}
            warn={profile.lifestyle.smoking !== roommate.lifestyle.smoking}
          />
          <Comparison
            label="Drinking"
            mine={DRINKING_OPTIONS.find((o) => o.value === profile.lifestyle.drinking)?.label ?? '—'}
            theirs={DRINKING_OPTIONS.find((o) => o.value === roommate.lifestyle.drinking)?.label ?? '—'}
            agree={profile.lifestyle.drinking === roommate.lifestyle.drinking}
          />
          <Comparison
            label="Pets"
            mine={PET_OPTIONS.find((o) => o.value === profile.lifestyle.pets)?.label ?? '—'}
            theirs={PET_OPTIONS.find((o) => o.value === roommate.lifestyle.pets)?.label ?? '—'}
            agree={profile.lifestyle.pets === roommate.lifestyle.pets}
          />
        </View>

        <Divider />

        {/* ── About ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            About {roommate.fullName.split(' ')[0]}
          </AppText>
          <AppText variant="body">{roommate.about}</AppText>

          <View style={styles.summaryBox}>
            <AppText variant="caption">{lifestyleSummary(roommate.lifestyle)}</AppText>
          </View>
        </View>

        {roommate.interests.length > 0 ? (
          <>
            <Divider />
            <View style={styles.section}>
              <AppText variant="heading" accessibilityRole="header">
                Into
              </AppText>
              <View style={styles.interests}>
                {roommate.interests.map((interest) => (
                  <View key={interest} style={styles.interestChip}>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {interest}
                    </AppText>
                  </View>
                ))}
              </View>
              {roommate.interests.some((i) => profile.interests.includes(i)) ? (
                <AppText variant="caption">
                  You have {roommate.interests.filter((i) => profile.interests.includes(i)).length}{' '}
                  {roommate.interests.filter((i) => profile.interests.includes(i)).length === 1 ? 'interest' : 'interests'} in
                  common.
                </AppText>
              ) : null}
            </View>
          </>
        ) : null}

        {similar.length > 0 ? (
          <>
            <Divider />
            <View style={styles.section}>
              <AppText variant="heading" accessibilityRole="header">
                Others who fit you
              </AppText>
              <View style={styles.similarList}>
                {similar.map((other) => (
                  <RoommateCard
                    key={other.id}
                    roommate={other}
                    onPress={() => router.push(`/(app)/roommate/${other.id}`)}
                    onToggleSave={() => void toggleSavedRoommate(other.id)}
                    isSaved={other.isSaved}
                  />
                ))}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* ── Sticky action bar ─────────────────────────────────── */}
      <View style={styles.actionBar}>
        <Button
          label="Say hello"
          variant="secondary"
          size="lg"
          icon="chatbubble-outline"
          onPress={handleMessage}
          style={styles.actionSecondary}
        />
        <Button
          label={
            roommate.requestStatus === 'pending'
              ? 'Request sent'
              : roommate.requestStatus === 'approved'
                ? 'Connected'
                : roommate.requestStatus
                  ? 'Send again'
                  : 'Ask to live together'
          }
          size="lg"
          icon="paper-plane-outline"
          disabled={roommate.requestStatus === 'pending' || roommate.requestStatus === 'approved'}
          onPress={() => setIsRequestOpen(true)}
          style={styles.actionPrimary}
        />
      </View>

      <RequestSheet
        visible={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        profile={profile}
        subject={{
          title: 'Send a request',
          subtitle: `${roommate.fullName} · ${roommate.compatibilityScore}% compatible`,
        }}
        maxOccupants={1}
        duplicateMessage="You already have a request open with this person."
        onSubmit={async (draft) => {
          const result = await requestRoommate({ ...draft, kind: 'roommate', roommateId: roommate.id });
          return result.ok ? { ok: true } : { ok: false, error: result.error.message };
        }}
      />
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

const MATCH_STYLE: Record<MatchKind, { icon: IconName; color: string; label: string }> = {
  match: { icon: 'checkmark-circle', color: colors.success, label: 'You agree' },
  near: { icon: 'ellipse-outline', color: colors.warning, label: 'Close enough' },
  mismatch: { icon: 'close-circle', color: colors.danger, label: 'You differ' },
};

function ReasonRow({ reason }: { reason: MatchReason }) {
  const style = MATCH_STYLE[reason.kind];

  return (
    <View style={styles.reasonRow}>
      <Ionicons name={style.icon} size={16} color={style.color} />
      <View style={styles.reasonText}>
        <AppText variant="captionStrong">{reason.label}</AppText>
        <AppText variant="caption">{reason.detail}</AppText>
      </View>
      <AppText variant="overline" color={style.color}>
        {style.label}
      </AppText>
    </View>
  );
}

/** One lifestyle axis with both answers and an explicit agree/differ marker. */
function Comparison({
  label,
  mine,
  theirs,
  agree,
  warn = false,
}: {
  label: string;
  mine: string;
  theirs: string;
  agree: boolean;
  warn?: boolean;
}) {
  const color = agree ? colors.success : warn ? colors.danger : colors.warning;

  return (
    <View style={styles.comparison}>
      <View style={styles.comparisonHeader}>
        <AppText variant="captionStrong" style={styles.comparisonLabel}>
          {label}
        </AppText>
        <Ionicons
          name={agree ? 'checkmark-circle' : 'alert-circle'}
          size={15}
          color={color}
        />
      </View>
      <View style={styles.comparisonRow}>
        <View style={styles.comparisonSide}>
          <AppText variant="overline">You</AppText>
          <AppText variant="caption">{mine}</AppText>
        </View>
        <View style={styles.comparisonSide}>
          <AppText variant="overline">{label.split(' ')[0]}</AppText>
          <AppText variant="caption">{theirs}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: layout.screenPadding, gap: spacing.lg, paddingBottom: spacing.huge },

  saveButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },

  identity: { alignItems: 'center', gap: spacing.xs },
  headline: { marginTop: spacing.xs },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
  },
  scoreBlock: { alignItems: 'center' },
  scoreFacts: { flex: 1, gap: 2 },

  section: { gap: spacing.md },
  reasonList: { gap: spacing.sm },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  reasonText: { flex: 1, gap: 1 },

  comparison: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comparisonHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  comparisonLabel: { flex: 1 },
  comparisonRow: { flexDirection: 'row', gap: spacing.md },
  comparisonSide: { flex: 1, gap: 1 },

  summaryBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },

  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  interestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },

  similarList: { gap: spacing.md },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: layout.screenPadding,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  actionSecondary: { flexShrink: 1 },
  actionPrimary: { flex: 1 },
});