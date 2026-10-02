import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText, Avatar, Badge, Button, Card } from '@/components/ui';
import {
  CLEANLINESS_LABELS,
  DRINKING_OPTIONS,
  GUEST_OPTIONS,
  PET_OPTIONS,
  SLEEP_SCHEDULE_OPTIONS,
  SMOKING_OPTIONS,
  STUDY_HABIT_OPTIONS,
  cleanlinessLabel,
} from '@/constants/options';
import type { RoommateMatchResult } from '@/lib/database.types';
import { formatDate, formatPeso, humaniseToken } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';

export interface RoommateCardProps {
  match: RoommateMatchResult;
  onOpen: () => void;
  onRequest?: (() => void) | undefined;
  onToggleSave?: (() => void) | undefined;
  /** True when a request already exists in either direction. */
  hasRequest?: boolean;
  isSaved?: boolean;
  isPending?: boolean;
}

/** Turns an enum token into a short label, or hides it when not shared. */
function preferenceLabel(
  value: string | null,
  options: { value: string; label: string }[],
): string | null {
  if (!value || value === 'no_preference') return null;
  return options.find((option) => option.value === value)?.label ?? humaniseToken(value);
}

function matchTone(kind: 'match' | 'near' | 'difference') {
  if (kind === 'match') return 'success' as const;
  if (kind === 'near') return 'warning' as const;
  return 'neutral' as const;
}

/**
 * Candidate card for the Roommates tab.
 *
 * Every field rendered here comes from the consent projection in
 * `search_roommates`, so anything that person chose not to share is simply
 * absent and the card renders without it.
 */
function RoommateCardComponent({
  match,
  onOpen,
  onRequest,
  onToggleSave,
  hasRequest = false,
  isSaved = false,
  isPending = false,
}: RoommateCardProps) {
  const traits = [
    preferenceLabel(match.smoking_preference, SMOKING_OPTIONS),
    preferenceLabel(match.drinking_preference, DRINKING_OPTIONS),
    preferenceLabel(match.pets_preference, PET_OPTIONS),
    preferenceLabel(match.guests_preference, GUEST_OPTIONS),
    preferenceLabel(match.study_habits, STUDY_HABIT_OPTIONS),
    preferenceLabel(match.sleep_schedule, SLEEP_SCHEDULE_OPTIONS),
    match.cleanliness ? CLEANLINESS_LABELS[match.cleanliness] ?? null : null,
  ].filter((trait): trait is string => Boolean(trait));

  const budgetLabel =
    match.budget_max !== null
      ? `${formatPeso(match.budget_min)} – ${formatPeso(match.budget_max)}`
      : match.budget_min !== null
        ? `Up to ${formatPeso(match.budget_min)}`
        : null;

  const requestBlocked = hasRequest || match.request_status !== null;

  return (
    <Card
      onPress={onOpen}
      accessibilityLabel={`${match.full_name}, ${match.compatibility_score} percent compatible`}
      accessibilityHint="Opens the roommate profile"
      style={styles.card}
      testID={`roommate-card-${match.roommate_profile_id}`}
    >
      <View style={styles.header}>
        <Avatar name={match.full_name} uri={match.avatar_url} size={48} />

        <View style={styles.headerText}>
          <AppText variant="subheading" numberOfLines={1}>
            {match.full_name}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {match.headline ?? 'Looking for a roommate'}
          </AppText>
        </View>

        <View style={styles.score}>
          <AppText variant="scoreValue">{match.compatibility_score}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            match
          </AppText>
        </View>

        {onToggleSave ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSaved, busy: isPending }}
            accessibilityLabel={isSaved ? 'Remove from saved' : 'Save this roommate'}
            onPress={onToggleSave}
            hitSlop={8}
            style={styles.saveButton}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isSaved ? colors.primary : colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {match.about ? (
        <AppText variant="caption" numberOfLines={3}>
          {match.about}
        </AppText>
      ) : null}

      <View style={styles.metaRow}>
        {budgetLabel ? (
          <View style={styles.metaItem}>
            <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
            <AppText variant="caption" numberOfLines={1}>
              {budgetLabel}/mo
            </AppText>
          </View>
        ) : null}

        {match.preferred_city ? (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <AppText variant="caption" numberOfLines={1}>
              {match.preferred_barangay ? `${match.preferred_barangay}, ` : ''}
              {match.preferred_city}
            </AppText>
          </View>
        ) : null}

        {match.move_in_date ? (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <AppText variant="caption">Moving {formatDate(match.move_in_date)}</AppText>
          </View>
        ) : null}

        {match.occupation ? (
          <View style={styles.metaItem}>
            <Ionicons name="briefcase-outline" size={14} color={colors.textSecondary} />
            <AppText variant="caption" numberOfLines={1}>
              {match.occupation}
            </AppText>
          </View>
        ) : null}
      </View>

      {traits.length > 0 ? (
        <View style={styles.traitRow}>
          {traits.slice(0, 4).map((trait) => (
            <View key={trait} style={styles.trait}>
              <AppText variant="caption" numberOfLines={1}>
                {trait}
              </AppText>
            </View>
          ))}
          {traits.length > 4 ? (
            <AppText variant="caption" color={colors.textMuted}>
              +{traits.length - 4}
            </AppText>
          ) : null}
        </View>
      ) : (
        <AppText variant="caption" color={colors.textMuted}>
          {cleanlinessLabel(match.cleanliness) === 'Not set'
            ? 'Lifestyle preferences are private.'
            : 'Lifestyle preferences hidden.'}
        </AppText>
      )}

      {match.match_reasons.length > 0 ? (
        <View style={styles.reasons}>
          {match.match_reasons.slice(0, 3).map((reason) => (
            <View key={`${reason.kind}-${reason.label}`} style={styles.reason}>
              <Badge label={reason.label} tone={matchTone(reason.kind)} />
              <AppText variant="caption" numberOfLines={2} style={{ flex: 1 }}>
                {reason.detail}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {onRequest ? (
        <Button
          label={requestBlocked ? 'Request sent' : 'Request to be roommates'}
          variant={requestBlocked ? 'outline' : 'primary'}
          size="sm"
          icon={requestBlocked ? 'checkmark' : 'person-add-outline'}
          onPress={onRequest}
          disabled={requestBlocked}
          isLoading={isPending}
          fullWidth
        />
      ) : null}
    </Card>
  );
}

export const RoommateCard = memo(RoommateCardComponent);

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, gap: 1 },
  score: { alignItems: 'center', minWidth: 44 },
  saveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  traitRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  trait: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  reasons: { gap: spacing.xs },
  reason: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});