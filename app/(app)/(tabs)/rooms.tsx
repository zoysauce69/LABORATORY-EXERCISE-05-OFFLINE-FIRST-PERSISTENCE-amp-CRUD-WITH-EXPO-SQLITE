import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { FilterSheet } from '@/components/filter-sheet';
import { RoomCard } from '@/components/room-card';
import { ScreenHeader } from '@/components/screen-header';
import { SearchBar } from '@/components/search-bar';
import {
  AppText,
  Button,
  ChipGroup,
  EmptyState,
  Screen,
  ScreenScroll,
} from '@/components/ui';
import { DateField, SelectField } from '@/components/form-fields';
import { useApp } from '@/hooks/use-app';
import { useRoomSearch } from '@/hooks/use-search';
import { AMENITIES } from '@/lib/mock-data';
import { cities } from '@/constants/locations';
import {
  ROOM_SORT_OPTIONS,
  ROOM_TYPE_OPTIONS,
  rentBounds,
  roomTypeLabel,
} from '@/services/room-service';
import { formatPeso } from '@/utils/format';
import {
  countActiveRoomFilters,
  defaultRoomFilters,
  hasActiveRoomFilters,
  type RoomFilters,
} from '@/lib/types';
import { colors, radii, spacing } from '@/theme';

/**
 * Room search.
 *
 * Every filter the brief asks for is here, and the result count sits above the
 * list so it is obvious what a filter actually did. Free-text search runs
 * immediately against the fixture list; the sheet's controls wait for "show
 * results" so the list does not reflow while someone is mid-decision.
 */
export default function RoomsScreen() {
  const router = useRouter();
  const { toggleSavedRoom } = useApp();
  const params = useLocalSearchParams<{ query?: string }>();

  const [filters, setFilters] = useState<RoomFilters>(() => ({
    ...defaultRoomFilters(),
    // The landing page's hero search hands its query over as a param so the
    // first thing a visitor typed survives the navigation.
    query: params.query ?? '',
  }));
  const [draft, setDraft] = useState<RoomFilters>(filters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { rooms, isSaved } = useRoomSearch(filters);

  const activeCount = useMemo(() => countActiveRoomFilters(filters), [filters]);
  const bounds = useMemo(() => rentBounds(), []);

  const openFilters = useCallback(() => {
    setDraft(filters);
    setIsFilterOpen(true);
  }, [filters]);

  function applyFilters() {
    setFilters(draft);
    setIsFilterOpen(false);
  }

  function clearFilters() {
    // Clears the draft too, so reopening the sheet does not show the old values
    // waiting behind an empty result list.
    const cleared = defaultRoomFilters();
    setDraft(cleared);
    setFilters(cleared);
    setIsFilterOpen(false);
  }

  function updateQuery(query: string) {
    setFilters((current) => ({ ...current, query }));
  }

  return (
    <Screen testID="rooms-screen">
      <ScreenHeader
        title="Rooms"
        subtitle={hasActiveRoomFilters(filters) ? `${rooms.length} matching your filters` : 'All listings'}
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
          onChangeText={updateQuery}
          placeholder="City, barangay, school or landmark"
          testID="room-search"
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

        {rooms.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No rooms match that"
            message="Try widening the budget or dropping a filter. There are listings outside what you picked."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        ) : (
          <>
            <AppText variant="caption">
              {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} · sorted by{' '}
              {ROOM_SORT_OPTIONS.find((o) => o.value === filters.sort)?.label.toLowerCase() ?? 'recommended'}
            </AppText>
            <View style={styles.list}>
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onPress={() => router.push(`/(app)/room/${room.id}`)}
                  onToggleSave={() => void toggleSavedRoom(room.id)}
                  isSaved={isSaved(room.id)}
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
        title="Filter rooms"
        activeCount={countActiveRoomFilters(draft)}
      >
        <SelectField
          label="City"
          value={draft.city}
          options={cities().map((city) => ({ value: city, label: city }))}
          onChange={(city) => setDraft((c) => ({ ...c, city }))}
          onClear={() => setDraft((c) => ({ ...c, city: null }))}
          placeholder="Anywhere in Metro Manila"
          hint="Straight-line distance from your preferred city is shown on each card."
        />

        <View style={styles.budgetRow}>
          <View style={styles.budgetField}>
            <SelectField
              label="Minimum rent"
              value={draft.minRent}
              options={rentSteps(bounds.min, bounds.max).map((amount) => ({
                value: amount,
                label: formatPeso(amount),
              }))}
              onChange={(amount) => setDraft((c) => ({ ...c, minRent: amount }))}
              onClear={() => setDraft((c) => ({ ...c, minRent: null }))}
              placeholder="No minimum"
            />
          </View>
          <View style={styles.budgetField}>
            <SelectField
              label="Maximum rent"
              value={draft.maxRent}
              options={rentSteps(bounds.min, bounds.max).map((amount) => ({
                value: amount,
                label: formatPeso(amount),
              }))}
              onChange={(amount) => setDraft((c) => ({ ...c, maxRent: amount }))}
              onClear={() => setDraft((c) => ({ ...c, maxRent: null }))}
              placeholder="No maximum"
            />
          </View>
        </View>

        <ChipGroup
          label="Room type"
          options={ROOM_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          selected={draft.roomTypes}
          onToggle={(value) =>
            setDraft((c) => ({
              ...c,
              roomTypes: c.roomTypes.includes(value)
                ? c.roomTypes.filter((t) => t !== value)
                : [...c.roomTypes, value],
            }))
          }
          helperText="Pick as many as you like."
        />

        <ChipGroup
          label="Must have"
          options={AMENITIES.map((amenity) => ({ value: amenity.slug, label: amenity.label, icon: amenity.icon }))}
          selected={draft.amenities}
          onToggle={(slug) =>
            setDraft((c) => ({
              ...c,
              amenities: c.amenities.includes(slug)
                ? c.amenities.filter((a) => a !== slug)
                : [...c.amenities, slug],
            }))
          }
        />

        <DateField
          label="Available before"
          value={draft.availableBefore ?? ''}
          onChange={(value) => setDraft((c) => ({ ...c, availableBefore: value || null }))}
          hint="Only show rooms whose slot is free by this date"
          presets={[7, 14, 30, 60]}
        />

        <SelectField
          label="Minimum occupant match"
          value={draft.minCompatibility}
          options={[60, 70, 80, 90].map((score) => ({
            value: score,
            label: `${score}% or better`,
            description:
              score >= 90
                ? 'Very few rooms will match this'
                : score >= 80
                  ? 'Only well-matched listings'
                  : 'A reasonable filter',
          }))}
          onChange={(score) => setDraft((c) => ({ ...c, minCompatibility: score }))}
          onClear={() => setDraft((c) => ({ ...c, minCompatibility: null }))}
          placeholder="Any match"
          hint="How well the current occupants match your lifestyle."
        />

        <SelectField
          label="Sort by"
          value={draft.sort}
          options={ROOM_SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          onChange={(sort) => setDraft((c) => ({ ...c, sort }))}
        />
      </FilterSheet>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Rent filter steps, rounded to something a person would actually pick. */
function rentSteps(min: number, max: number): number[] {
  const steps: number[] = [];
  const first = Math.ceil(min / 500) * 500;
  for (let amount = first; amount <= max; amount += 500) steps.push(amount);
  return steps;
}

/** One-line descriptions of the active filters, for the chips above the list. */
function activeSummaries(filters: RoomFilters): string[] {
  const summaries: string[] = [];

  if (filters.query.trim()) summaries.push(`“${filters.query.trim()}”`);
  if (filters.city) summaries.push(filters.city);
  if (filters.minRent !== null || filters.maxRent !== null) {
    summaries.push(
      `${filters.minRent !== null ? formatPeso(filters.minRent) : 'Any'} – ${filters.maxRent !== null ? formatPeso(filters.maxRent) : 'Any'}`,
    );
  }
  for (const type of filters.roomTypes) summaries.push(roomTypeLabel(type));
  if (filters.amenities.length > 0) summaries.push(`${filters.amenities.length} amenities`);
  if (filters.availableBefore) summaries.push('available before a date');
  if (filters.minCompatibility !== null) summaries.push(`${filters.minCompatibility}% match or better`);

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