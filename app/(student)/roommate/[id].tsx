import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/tab-screen-header';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  InlineAlert,
  LoadingState,
  Screen,
} from '@/components/ui';
import {
  CLEANLINESS_LABELS,
  DRINKING_OPTIONS,
  GUEST_OPTIONS,
  PET_OPTIONS,
  SLEEP_SCHEDULE_OPTIONS,
  SMOKING_OPTIONS,
  STUDY_HABIT_OPTIONS,
} from '@/constants/options';
import { PlainTextField } from '@/components/form-fields';
import { fail, ok, type Result } from '@/lib/errors';
import { useAuth } from '@/hooks/use-auth';
import { useAction, useAsyncData } from '@/hooks/use-async-data';
import { useToggleSavedRoommate } from '@/hooks/use-roommates';
import { roommateService } from '@/services/roommate-service';
import { formatDate, formatMonthlyRent } from '@/utils/format';
import { colors, spacing } from '@/theme';

/**
 * Roommate candidate detail.
 *
 * Renders exactly what the consent projection in `search_roommates` returned.
 * There is no second read path, so a field the other person chose not to share
 * cannot be fetched behind this screen's back.
 */
export default function RoommateDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = typeof id === 'string' ? id : '';

  const [message, setMessage] = useState('');

  const match = useAsyncData(
    async () => (userId.length > 0 ? roommateService.getMatchByUserId(userId) : ok(null)),
    [userId],
    { enabled: userId.length > 0 },
  );

  const saved = useToggleSavedRoommate(user?.id);

  const sendState = useAction(async (): Promise<Result<true>> => {
    if (!user) {
      return fail('Sign in again before sending a roommate request.', 'not_signed_in');
    }

    const result = await roommateService.sendRequest(
      user.id,
      userId,
      message.trim() || undefined,
    );
    if (!result.ok) return result;

    await match.reload();
    return ok(true);
  });

  const toggleSave = useCallback(async () => {
    if (!match.data) return;
    await saved.toggle(match.data.roommate_profile_id);
    await match.reload();
  }, [match, saved]);

  const viewingSelf = Boolean(user && user.id === userId);

  if (match.isInitialLoading) {
    return (
      <Screen>
        <LoadingState label="Loading profile" />
      </Screen>
    );
  }

  if (viewingSelf) {
    return (
      <Screen>
        <ScreenHeader title="Roommate" onBack={() => router.back()} />
        <View style={styles.content}>
          <InlineAlert
            tone="info"
            title="That is you"
            message="search_roommates never returns your own row, so there is nothing to show here. Open your profile to edit it."
            actionLabel="Edit my profile"
            onAction={() => router.replace('/(student)/edit-roommate-profile')}
          />
        </View>
      </Screen>
    );
  }

  if (match.error || !match.data) {
    return (
      <Screen>
        <ScreenHeader title="Roommate" onBack={() => router.back()} />
        <View style={styles.content}>
          <InlineAlert
            tone="danger"
            title="Profile unavailable"
            message={
              match.error ??
              'This person may have stopped sharing their profile, or they are no longer discoverable.'
            }
          />
        </View>
      </Screen>
    );
  }

  const candidate = match.data;

  const requested = candidate.request_status !== null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Roommate" onBack={() => router.back()} />

        <Card style={styles.identity}>
          <Avatar name={candidate.full_name} uri={candidate.avatar_url} size={64} />
          <View style={styles.identityText}>
            <AppText variant="title" accessibilityRole="header" numberOfLines={2}>
              {candidate.full_name}
            </AppText>
            {candidate.headline ? (
              <AppText variant="caption" numberOfLines={2}>
                {candidate.headline}
              </AppText>
            ) : null}
            <Badge label={`${candidate.compatibility_score}% match`} tone="info" icon="heart-outline" />
          </View>
        </Card>

        {candidate.about ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              About
            </AppText>
            <AppText variant="body">{candidate.about}</AppText>
          </Card>
        ) : null}

        {candidate.occupation ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Studying or working
            </AppText>
            <AppText variant="body">{candidate.occupation}</AppText>
          </Card>
        ) : null}

        {candidate.budget_min !== null || candidate.budget_max !== null ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Budget
            </AppText>
            <AppText variant="bodyStrong">
              {candidate.budget_min !== null && candidate.budget_max !== null
                ? `${formatMonthlyRent(candidate.budget_min)} to ${formatMonthlyRent(candidate.budget_max)}`
                : formatMonthlyRent(candidate.budget_max ?? candidate.budget_min)}
            </AppText>
          </Card>
        ) : null}

        {candidate.preferred_city || candidate.preferred_barangay ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Preferred area
            </AppText>
            <AppText variant="body">
              {[candidate.preferred_barangay, candidate.preferred_city].filter(Boolean).join(', ')}
            </AppText>
          </Card>
        ) : null}

        {candidate.move_in_date ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Move-in date
            </AppText>
            <AppText variant="body">{formatDate(candidate.move_in_date)}</AppText>
          </Card>
        ) : null}

        {hasLifestyleFields(candidate) ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Living style
            </AppText>
            {candidate.cleanliness !== null ? (
              <DetailRow label="Tidiness" value={CLEANLINESS_LABELS[candidate.cleanliness] ?? '-'} />
            ) : null}
            <DetailRow label="Smoking" value={label(candidate.smoking_preference, SMOKING_OPTIONS)} />
            <DetailRow label="Alcohol" value={label(candidate.drinking_preference, DRINKING_OPTIONS)} />
            <DetailRow label="Pets" value={label(candidate.pets_preference, PET_OPTIONS)} />
            <DetailRow label="Guests" value={label(candidate.guests_preference, GUEST_OPTIONS)} />
            <DetailRow label="Studying" value={label(candidate.study_habits, STUDY_HABIT_OPTIONS)} />
            <DetailRow label="Sleep" value={label(candidate.sleep_schedule, SLEEP_SCHEDULE_OPTIONS)} />
          </Card>
        ) : null}

        {candidate.match_reasons.length > 0 ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Why you match
            </AppText>
            <View style={styles.reasons}>
              {candidate.match_reasons.map((reason) => (
                <View key={`${reason.label}-${reason.detail}`} style={styles.reason}>
                  <AppText variant="bodyStrong">{reason.label}</AppText>
                  <AppText variant="caption">{reason.detail}</AppText>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {requested ? (
          <InlineAlert
            tone="info"
            title="Request already sent"
            message="Track it, and withdraw it if you change your mind, from your roommate requests."
            actionLabel="View my requests"
            onAction={() => router.push('/(student)/roommate-requests')}
          />
        ) : null}

        {sendState.error ? <InlineAlert tone="danger" message={sendState.error} /> : null}

        {!requested ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Introduce yourself
            </AppText>
            <PlainTextField
              label="Message"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
              maxLength={600}
              placeholder="Optional. Your schedule, budget, and where you are looking."
              hint="This is a one-time message, not a chat. RoomLink has no messaging feature."
            />
            <Button
              label="Send roommate request"
              icon="paper-plane-outline"
              isLoading={sendState.isPending}
              onPress={() => void sendState.run()}
            />
          </Card>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          label={candidate.is_saved ? 'Saved' : 'Save profile'}
          variant={candidate.is_saved ? 'secondary' : 'outline'}
          icon={candidate.is_saved ? 'bookmark' : 'bookmark-outline'}
          style={styles.flex}
          isLoading={saved.pendingId === candidate.roommate_profile_id}
          onPress={() => void toggleSave()}
        />
      </View>
    </Screen>
  );
}

function hasLifestyleFields(candidate: {
  cleanliness: number | null;
  smoking_preference: string | null;
  drinking_preference: string | null;
  pets_preference: string | null;
  guests_preference: string | null;
  study_habits: string | null;
  sleep_schedule: string | null;
}): boolean {
  return (
    candidate.cleanliness !== null ||
    [
      candidate.smoking_preference,
      candidate.drinking_preference,
      candidate.pets_preference,
      candidate.guests_preference,
      candidate.study_habits,
      candidate.sleep_schedule,
    ].some((value) => value !== null && value !== 'no_preference')
  );
}

/** Resolves an enum token to its label; anything unshared renders as a dash. */
function label(value: string | null, options: { value: string; label: string }[]): string {
  if (!value) return '-';
  return options.find((option) => option.value === value)?.label ?? '-';
}

function DetailRow({ label: name, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" color={colors.textMuted}>
        {name}
      </AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.huge + 72 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: spacing.xs },
  card: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 3 },
  reasons: { gap: spacing.sm },
  reason: { gap: 2 },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});