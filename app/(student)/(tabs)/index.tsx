import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppText, InlineAlert, Screen } from '@/components/ui';
import { PropertyFilterSheet } from '@/components/property-filter-sheet';
import { PropertyList } from '@/components/property-list';
import { cities } from '@/constants/locations';
import { useAuth } from '@/hooks/use-auth';
import { useAsyncData } from '@/hooks/use-async-data';
import { usePropertySearch, useSavedProperties } from '@/hooks/use-properties';
import { propertyService } from '@/services/property-service';
import { savedPropertyService } from '@/services/saved-service';
import type { AmenityRow, PropertySearchResult } from '@/lib/database.types';
import {
  DEFAULT_PROPERTY_FILTERS,
  countActiveFilters,
  type PropertyFilterValues,
} from '@/utils/validation';
import { effectiveDistanceMode } from '@/lib/config';
import { colors, layout, radii, spacing } from '@/theme';

const QUICK_CITIES = cities().slice(0, 8);

const SORT_OPTIONS: { value: PropertyFilterValues['sort']; label: string }[] = [
  { value: 'recent', label: 'Newest' },
  { value: 'price_asc', label: 'Cheapest first' },
  { value: 'price_desc', label: 'Most expensive' },
];

export default function StudentHomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [filters, setFilters] = useState<PropertyFilterValues>(DEFAULT_PROPERTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const amenities = useAsyncData<AmenityRow[]>(
    async () => propertyService.listAmenities(),
    [],
  );

  const searchParams = useMemo(
    () => ({
      search: filters.search,
      city: filters.city ?? null,
      barangay: filters.barangay ?? null,
      minPrice: filters.minPrice ?? null,
      maxPrice: filters.maxPrice ?? null,
      propertyTypes: filters.propertyTypes,
      amenityIds: filters.amenityIds,
      availableOnly: filters.availableOnly,
      nearLatitude: filters.nearLatitude ?? null,
      nearLongitude: filters.nearLongitude ?? null,
      nearName: filters.nearName ?? null,
      maxDistanceKm: filters.maxDistanceKm ?? null,
      sort: filters.sort,
    }),
    [filters],
  );

  const search = usePropertySearch(searchParams);
  const saved = useSavedProperties(user?.id);

  const savedIds = useMemo(
    () => new Set((saved.data ?? []).map((item) => item.id)),
    [saved.data],
  );

  const toggleSave = useCallback(
    async (propertyId: string) => {
      if (!user) return;
      setSavingId(propertyId);
      setSaveError(null);

      const result = await savedPropertyService.toggle(user.id, propertyId);
      setSavingId(null);

      if (!result.ok) {
        // The heart stays where it was, and the user is told why.
        setSaveError(result.error.message);
      }

      // Both lists change on a save, so refresh both.
      void saved.reload();
      search.refresh();
    },
    [saved, search, user],
  );

  const applySearchText = useCallback((text: string) => {
    setSearchDraft(text);
    setFilters((current) => ({ ...current, search: text.trim() }));
  }, []);

  const activeFilterCount = countActiveFilters(filters);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const openProperty = useCallback(
    (property: PropertySearchResult) => router.push(`/(student)/property/${property.id}`),
    [router],
  );

  return (
    <Screen>
      <PropertyList
        testID="home-property-list"
        items={search.items}
        isInitialLoading={search.isInitialLoading}
        isRefreshing={search.isRefreshing}
        error={search.error}
        hasMore={search.hasMore}
        onRefresh={search.refresh}
        onLoadMore={search.loadMore}
        onOpen={openProperty}
        onToggleSave={(property) => {
          void toggleSave(property.id);
        }}
        savedIds={savedIds}
        isSavingId={savingId}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.greetingRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={colors.textSecondary}>
                  {greeting},
                </AppText>
                <AppText variant="title" numberOfLines={1}>
                  {firstName}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => router.push('/(student)/notifications')}
                hitSlop={8}
                style={styles.iconButton}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  value={searchDraft}
                  onChangeText={applySearchText}
                  placeholder="City, barangay, school or workplace"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  accessibilityLabel="Search listings"
                  accessibilityHint="Filters listings as you type"
                  style={styles.searchInput}
                />
                {searchDraft.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    onPress={() => applySearchText('')}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filters'
                }
                onPress={() => setSheetOpen(true)}
                style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
              >
                <Ionicons
                  name="options-outline"
                  size={18}
                  color={activeFilterCount > 0 ? colors.textInverse : colors.text}
                />
                {activeFilterCount > 0 ? (
                  <View style={styles.filterCount}>
                    <AppText variant="overline" color={colors.textInverse}>
                      {String(activeFilterCount)}
                    </AppText>
                  </View>
                ) : null}
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickCities}
            >
              <QuickCity
                label="All cities"
                selected={!filters.city}
                onPress={() => setFilters((f) => ({ ...f, city: undefined, barangay: undefined }))}
              />
              {QUICK_CITIES.map((city) => (
                <QuickCity
                  key={city}
                  label={city}
                  selected={filters.city === city}
                  onPress={() =>
                    setFilters((f) => ({
                      ...f,
                      city: f.city === city ? undefined : city,
                      barangay: undefined,
                    }))
                  }
                />
              ))}
            </ScrollView>

            <View style={styles.resultRow}>
              <AppText variant="heading" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
                {filters.city ?? 'Available listings'}
              </AppText>
              {search.items.length > 0 ? (
                <AppText variant="caption" color={colors.textMuted}>
                  {search.items.length}{search.hasMore ? '+' : ''}
                </AppText>
              ) : null}
            </View>

            {saveError ? (
              <InlineAlert
                tone="danger"
                message={saveError}
                actionLabel="Dismiss"
                onAction={() => setSaveError(null)}
              />
            ) : null}

            <View style={styles.sortRow}>
              {SORT_OPTIONS.map((option) => {
                const active = filters.sort === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Sort by ${option.label}`}
                    onPress={() => setFilters((f) => ({ ...f, sort: option.value }))}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                  >
                    <AppText
                      variant="caption"
                      color={active ? colors.textInverse : colors.textSecondary}
                    >
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {filters.nearName ? (
              <View style={styles.nearBanner}>
                <Ionicons name="navigate-circle-outline" size={18} color={colors.primary} />
                <AppText variant="caption" color={colors.primary} style={{ flex: 1 }}>
                  Distance from {filters.nearName}
                  {effectiveDistanceMode === 'straightline' ? ' (approx.)' : ''}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear distance filter"
                  onPress={() =>
                    setFilters((f) => ({
                      ...f,
                      nearLatitude: undefined,
                      nearLongitude: undefined,
                      nearName: undefined,
                      maxDistanceKm: undefined,
                    }))
                  }
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color={colors.primary} />
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        emptyTitle="No listings match yet"
        emptyMessage={
          activeFilterCount > 0
            ? 'Try removing a filter or widening the price range.'
            : 'New boarding houses are added every week. Widen your search to see more.'
        }
        emptyIcon="home-outline"
        emptyActionLabel={activeFilterCount > 0 ? 'Clear filters' : undefined}
        onEmptyAction={
          activeFilterCount > 0
            ? () => {
                setSearchDraft('');
                setFilters(DEFAULT_PROPERTY_FILTERS);
              }
            : undefined
        }
      />

      <PropertyFilterSheet
        visible={sheetOpen}
        filters={filters}
        amenities={amenities.data ?? []}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}

function QuickCity({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.quickCity, selected && styles.quickCitySelected]}
    >
      <AppText variant="captionStrong" color={selected ? colors.textInverse : colors.textSecondary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingBottom: spacing.md },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  filterButton: {
    width: layout.controlHeight,
    height: layout.controlHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCities: { gap: spacing.sm, paddingRight: spacing.lg },
  quickCity: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    minHeight: 34,
    justifyContent: 'center',
  },
  quickCitySelected: { backgroundColor: colors.primary },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sortRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    minHeight: 32,
    justifyContent: 'center',
  },
  sortChipActive: { backgroundColor: colors.primaryDark },
  nearBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
});