import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { FilterSheet } from '@/components/filter-sheet';
import { RoommateCard } from '@/components/roommate-card';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar } from '@/components/search-bar';
import { SegmentedControl, SelectField } from '@/components/form-fields';
import {
  AppText,
  Button,
  ChipGroup,
  EmptyState,
  Screen,
  ScreenScroll,
} from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { useRoommateSearch } from '@/hooks/use-search';
import { INTERESTS } from '@/lib/mock-data';
import { cities } from '@/constants/locations';
import {
  ROOMMATE_SORT_OPTIONS,
  SLEEP_SCHEDULE_OPTIONS,
  STUDY_HABIT_OPTIONS,
  budgetBounds,
} from '@/services/roommate-service';
import { formatPeso } from '@/utils/format';
import {
  countActiveRoommateFilters,
  defaultRoommateFilters,
  hasActiveRoommateFilters,
  type RoommateFilters,
} from '@/lib/types';
import { colors, radii, spacing } from '@/theme';

/**
 * Roommate search.
 *
 * Same structure as the rooms tab on purpose — two search screens that behave
 * differently is worse than one pattern applied twice. The filters that matter
 * here are lifestyle rather than price, since the compatibility score already
 * accounts for budget.
 */
export default function RoommatesScreen() {
  const router = useRouter();
  const { toggleSavedRoommate } = useApp();
  const params = useLocalSearchParams<{ query?: string }>();

  const [filters, setFilters] = useState<RoommateFilters>(() => ({
    ...defaultRoommateFilters(),
    query: params.query ?? '',
  }));
  const [draft, setDraft] = useState<RoommateFilters>(filters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { roommates } = useRoommateSearch(filters);

  const activeCount = useMemo(() => countActiveRoommateFilters(filters), [filters]);
  const bounds = useMemo(() => budgetBounds(), []);

  const openFilters = useCallback(() => {
    setDraft(filters);
    setIsFilterOpen(true);
  }, [filters]);

  function applyFilters() {
    setFilters(draft);
    setIsFilterOpen(false);
  }

  function clearFilters() {
    const cleared = defaultRoommateFilters();
    setDraft(cleared);
    setFilters(cleared);
    setIsFilterOpen(false);
  }

  return (
    <Screen testID="roommates-screen">
      <ScreenHeader
        title="Roommates"
        subtitle={
          hasActiveRoommateFilters(filters)
            ? `${roommates.length} matching your filters`
            : 'Scored against your profile'
        }
        onBack={false}
        right={
          <Button
            label={activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
            variant={activeCount > 0 ? 'primary' : 'ghost'}
            size="sm"
            icon="options-outline"
            onPress={openFilters}
            accessibilityHint={`${activeCount} filters active`}
          />
        }
      />

      <ScreenScroll>
        <SearchBar
          value={filters.query}
          onChangeText={(query) => setFilters((c) => ({ ...c, query }))}
          placeholder="Name, school, workplace or city"
          testID="roommate-search"
        />

        {activeCount > 0 ? (
          <View style={styles.activeRow}>
            <View style={styles.activeChips}>
              {activeSummaries(filters).map((summary) => (
                <View key={summary} style={styles.activeChip}>
                  <AppText variant="caption" color={colors.primary}>
                    {summary}
                  </AppText>
                </View>
              ))}
            </View>
            <Button label="Clear" variant="ghost" size="sm" onPress={clearFilters} />
          </View>
        ) : null}

        {roommates.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Nobody matches that yet"
            message="Our fixture set is small. Dropping a filter or two will bring people back — and your own lifestyle affects who shows up here."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        ) : (
          <>
            <AppText variant="caption">
              {roommates.length} {roommates.length === 1 ? 'person' : 'people'} · sorted by{' '}
              {ROOMMATE_SORT_OPTIONS.find((o) => o.value === filters.sort)?.label.toLowerCase() ??
                'compatibility'}
            </AppText>
            <View style={styles.list}>
              {roommates.map((roommate) => (
                <RoommateCard
                  key={roommate.id}
                  roommate={roommate}
                  onPress={() => router.push(`/(app)/roommate/${roommate.id}`)}
                  onToggleSave={() => void toggleSavedRoommate(roommate.id)}
                  isSaved={roommate.isSaved}
                />
              ))}
            </View>
          </>
        )}
      </ScreenScroll>

      <FilterSheet
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={applyFilters}
        onClear={clearFilters}
        title="Filter roommates"
        activeCount={countActiveRoommateFilters(draft)}
      >
        <SelectField
          label="City"
          value={draft.city}
          options={cities().map((city) => ({ value: city, label: city }))}
          onChange={(city) => setDraft((c) => ({ ...c, city }))}
          onClear={() => setDraft((c) => ({ ...c, city: null }))}
          placeholder="Anywhere in Metro Manila"
        />

        <View style={styles.budgetRow}>
          <View style={styles.budgetField}>
            <SelectField
              label="Minimum budget"
              value={draft.minBudget}
              options={budgetSteps(bounds.min, bounds.max).map((amount) => ({
                value: amount,
                label: formatPeso(amount),
              }))}
              onChange={(amount) => setDraft((c) => ({ ...c, minBudget: amount }))}
              onClear={() => setDraft((c) => ({ ...c, minBudget: null }))}
              placeholder="No minimum"
            />
          </View>
          <View style={styles.budgetField}>
            <SelectField
              label="Maximum budget"
              value={draft.maxBudget}
              options={budgetSteps(bounds.min, bounds.max).map((amount) => ({
                value: amount,
                label: formatPeso(amount),
              }))}
              onChange={(amount) => setDraft((c) => ({ ...c, maxBudget: amount }))}
              onClear={() => setDraft((c) => ({ ...c, maxBudget: null }))}
              placeholder="No maximum"
            />
          </View>
        </View>

        <ChipGroup
          label="Interests"
          options={INTERESTS.map((interest) => ({ value: interest, label: interest }))}
          selected={draft.interests}
          onToggle={(interest) =>
            setDraft((c) => ({
              ...c,
              interests: c.interests.includes(interest)
                ? c.interests.filter((i) => i !== interest)
                : [...c.interests, interest],
            }))
          }
          helperText="Show people who share at least one of these."
        />

        <ChipGroup
          label="Study habits"
          options={STUDY_HABIT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          selected={draft.studyHabits}
          onToggle={(value) =>
            setDraft((c) => ({
              ...c,
              studyHabits: c.studyHabits.includes(value)
                ? c.studyHabits.filter((h) => h !== value)
                : [...c.studyHabits, value],
            }))
          }
        />

        <ChipGroup
          label="Sleep schedule"
          options={SLEEP_SCHEDULE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          selected={draft.sleepSchedules}
          onToggle={(value) =>
            setDraft((c) => ({
              ...c,
              sleepSchedules: c.sleepSchedules.includes(value)
                ? c.sleepSchedules.filter((s) => s !== value)
                : [...c.sleepSchedules, value],
            }))
          }
        />

        <SegmentedControl
          label="Smoking"
          value={draft.nonSmokersOnly ? 'non_smoker' : 'any'}
          options={[
            { value: 'any', label: 'Anyone' },
            { value: 'non_smoker', label: 'Non-smokers only' },
          ]}
          onChange={(value) => setDraft((c) => ({ ...c, nonSmokersOnly: value === 'non_smoker' }))}
        />

        <SelectField
          label="Sort by"
          value={draft.sort}
          options={ROOMMATE_SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          onChange={(sort) => setDraft((c) => ({ ...c, sort }))}
        />
      </FilterSheet>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function budgetSteps(min: number, max: number): number[] {
  const steps: number[] = [];
  const first = Math.ceil(min / 500) * 500;
  for (let amount = first; amount <= max; amount += 500) steps.push(amount);
  return steps;
}

function activeSummaries(filters: RoommateFilters): string[] {
  const summaries: string[] = [];

  if (filters.query.trim()) summaries.push(`“${filters.query.trim()}”`);
  if (filters.city) summaries.push(filters.city);
  if (filters.minBudget !== null || filters.maxBudget !== null) {
    summaries.push(
      `${filters.minBudget !== null ? formatPeso(filters.minBudget) : 'Any'} – ${filters.maxBudget !== null ? formatPeso(filters.maxBudget) : 'Any'}`,
    );
  }
  if (filters.interests.length > 0) summaries.push(`${filters.interests.length} interests`);
  if (filters.studyHabits.length > 0) summaries.push('study habits');
  if (filters.sleepSchedules.length > 0) summaries.push('sleep schedule');
  if (filters.nonSmokersOnly) summaries.push('non-smokers');

  return summaries;
}

const styles = StyleSheet.create({
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  activeChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  activeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  list: { gap: spacing.md },
  budgetRow: { flexDirection: 'row', gap: spacing.md },
  budgetField: { flex: 1 },
});