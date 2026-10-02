import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText, Button, ChipGroup, Divider, InlineAlert } from '@/components/ui';
import { PlainSelectField, PlainTextField } from '@/components/form-fields';
import { amenityIcon, PROPERTY_TYPE_OPTIONS } from '@/constants/options';
import { PH_SCHOOLS, PH_WORKPLACES, cities, barangaysFor } from '@/constants/locations';
import type { AmenityRow, PropertyType } from '@/lib/database.types';
import {
  DEFAULT_PROPERTY_FILTERS,
  countActiveFilters,
  type PropertyFilterValues,
} from '@/utils/validation';
import { formatPeso } from '@/utils/format';
import { colors, layout, radii, spacing } from '@/theme';

export interface PropertyFilterSheetProps {
  visible: boolean;
  filters: PropertyFilterValues;
  amenities: AmenityRow[];
  onApply: (filters: PropertyFilterValues) => void;
  onClose: () => void;
}

/**
 * Filter sheet for the Search tab.
 *
 * Holds a working copy so Cancel really discards, and every control maps onto a
 * parameter the `search_properties` RPC understands.
 */
export function PropertyFilterSheet({
  visible,
  filters,
  amenities,
  onApply,
  onClose,
}: PropertyFilterSheetProps) {
  const [draft, setDraft] = useState<PropertyFilterValues>(filters);
  const [nearMode, setNearMode] = useState<'off' | 'school' | 'workplace'>(
    filters.nearLatitude !== undefined ? 'school' : 'off',
  );
  const [nearIndex, setNearIndex] = useState(0);

  // Re-seed the draft each time the sheet opens.
  const [lastFilters, setLastFilters] = useState(filters);
  if (visible && lastFilters !== filters) {
    setLastFilters(filters);
    setDraft(filters);
  }

  const activeCount = useMemo(() => countActiveFilters(draft), [draft]);

  const barangays = useMemo(() => barangaysFor(draft.city), [draft.city]);

  const cityOptions = useMemo(
    () => [{ value: '', label: 'Any city' }, ...cities().map((c) => ({ value: c, label: c }))],
    [],
  );

  const nearOptions = useMemo(() => {
    const source = nearMode === 'school' ? PH_SCHOOLS : PH_WORKPLACES;
    return source.map((place, index) => ({ value: String(index), label: `${place.label} — ${place.city}` }));
  }, [nearMode]);

  const apply = () => {
    if (nearMode === 'off') {
      onApply({
        ...draft,
        nearLatitude: undefined,
        nearLongitude: undefined,
        nearName: undefined,
        maxDistanceKm: undefined,
      });
      return;
    }

    const source = nearMode === 'school' ? PH_SCHOOLS : PH_WORKPLACES;
    const place = source[nearIndex];

    onApply({
      ...draft,
      nearLatitude: place?.latitude,
      nearLongitude: place?.longitude,
      nearName: place?.label,
    });
  };

  const reset = () => {
    setDraft(DEFAULT_PROPERTY_FILTERS);
    setNearMode('off');
    setNearIndex(0);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.header}>
        <AppText variant="title">Filters</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PlainTextField
          label="Search"
          value={draft.search}
          onChangeText={(text) => setDraft((d) => ({ ...d, search: text }))}
          placeholder="City, barangay, school or workplace"
          icon="search"
          autoCapitalize="none"
          returnKeyType="search"
          containerStyle={styles.field}
        />

        <PlainSelectField
          label="City"
          value={draft.city ?? ''}
          options={cityOptions}
          onChange={(value) => setDraft((d) => ({ ...d, city: value || undefined, barangay: undefined }))}
          placeholder="Any city"
          searchable
        />

        {draft.city && barangays.length > 0 ? (
          <ChipGroup
            label="Barangay"
            multiple
            options={barangays.map((b) => ({ value: b, label: b }))}
            selected={draft.barangay ? [draft.barangay] : []}
            onToggle={(value) =>
              setDraft((d) => ({ ...d, barangay: d.barangay === value ? undefined : value }))
            }
            helperText={draft.barangay ? undefined : 'Leave empty to search the whole city.'}
          />
        ) : null}

        <Divider />

        <AppText variant="heading">Monthly rent</AppText>
        <View style={styles.row}>
          <PlainTextField
            label="Minimum"
            value={draft.minPrice !== undefined ? String(draft.minPrice) : ''}
            onChangeText={(text) =>
              setDraft((d) => ({
                ...d,
                minPrice: text.replace(/[^\d]/g, '') === '' ? undefined : Number(text.replace(/[^\d]/g, '')),
              }))
            }
            keyboardType="numeric"
            inputMode="numeric"
            prefix="₱"
            placeholder="0"
            containerStyle={{ flex: 1 }}
          />
          <PlainTextField
            label="Maximum"
            value={draft.maxPrice !== undefined ? String(draft.maxPrice) : ''}
            onChangeText={(text) =>
              setDraft((d) => ({
                ...d,
                maxPrice: text.replace(/[^\d]/g, '') === '' ? undefined : Number(text.replace(/[^\d]/g, '')),
              }))
            }
            keyboardType="numeric"
            inputMode="numeric"
            prefix="₱"
            placeholder="10,000"
            containerStyle={{ flex: 1 }}
          />
        </View>
        {draft.minPrice !== undefined && draft.maxPrice !== undefined && draft.minPrice > draft.maxPrice ? (
          <InlineAlert tone="danger" message="The minimum price is above the maximum. Adjust the range." />
        ) : null}

        <Divider />

        <ChipGroup
          label="Property type"
          multiple
          options={PROPERTY_TYPE_OPTIONS.map((option) => ({ value: option.value as string, label: option.label }))}
          selected={draft.propertyTypes as string[]}
          onToggle={(value) =>
            setDraft((d) => {
              const current = d.propertyTypes as PropertyType[];
              const next = current.includes(value as PropertyType)
                ? current.filter((item) => item !== value)
                : [...current, value as PropertyType];
              return { ...d, propertyTypes: next };
            })
          }
          helperText="Select more than one to widen your search."
        />

        <Divider />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading">Distance</AppText>
          <ChipGroup
            options={[
              { value: 'off', label: 'Any distance' },
              { value: 'school', label: 'From school' },
              { value: 'workplace', label: 'From workplace' },
            ]}
            selected={[nearMode]}
            onToggle={(value) => {
              setNearMode(value as 'off' | 'school' | 'workplace');
              setNearIndex(0);
            }}
            helperText={
              nearMode === 'off'
                ? undefined
                : 'Straight-line distance between stored coordinates. It is an estimate, not a GPS-measured route.'
            }
          />

          {nearMode !== 'off' ? (
            <>
              <PlainSelectField
                label={nearMode === 'school' ? 'School' : 'Workplace'}
                value={String(nearIndex)}
                options={nearOptions}
                onChange={(value) => setNearIndex(Number(value))}
                searchable
              />
              <ChipGroup
                label="Within"
                options={[
                  { value: '1', label: '1 km' },
                  { value: '2', label: '2 km' },
                  { value: '3', label: '3 km' },
                  { value: '5', label: '5 km' },
                  { value: '10', label: '10 km' },
                ]}
                selected={draft.maxDistanceKm !== undefined ? [String(draft.maxDistanceKm)] : []}
                onToggle={(value) => {
                  const km = Number(value);
                  setDraft((d) => ({
                    ...d,
                    maxDistanceKm: d.maxDistanceKm === km ? undefined : km,
                  }));
                }}
                helperText="Any distance when nothing is selected."
              />
            </>
          ) : null}
        </View>

        <Divider />

        {amenities.length > 0 ? (
          <ChipGroup
            label="Amenities"
            multiple
            options={amenities.map((amenity) => ({
              value: amenity.id,
              label: amenity.label,
              icon: amenityIcon(amenity.slug),
            }))}
            selected={draft.amenityIds}
            onToggle={(value) =>
              setDraft((d) => {
                const amenityId = Number(value);
                const next = d.amenityIds.includes(amenityId)
                  ? d.amenityIds.filter((id) => id !== amenityId)
                  : [...d.amenityIds, amenityId];
                return { ...d, amenityIds: next };
              })
            }
            helperText="A listing must have every amenity you select."
          />
        ) : null}

        <Divider />

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: draft.availableOnly }}
          accessibilityLabel="Only show listings with vacant units"
          onPress={() => setDraft((d) => ({ ...d, availableOnly: !d.availableOnly }))}
          style={styles.switchRow}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Only show available listings</AppText>
            <AppText variant="caption">Hide listings where every unit is taken.</AppText>
          </View>
          <Ionicons
            name={draft.availableOnly ? 'checkbox' : 'square-outline'}
            size={24}
            color={draft.availableOnly ? colors.primary : colors.textMuted}
          />
        </Pressable>

        {draft.maxPrice !== undefined ? (
          <AppText variant="caption" align="center">
            Showing listings up to {formatPeso(draft.maxPrice)} per month.
          </AppText>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Reset" variant="outline" onPress={reset} style={{ flex: 1 }} />
        <Button
          label={activeCount > 0 ? `Apply (${activeCount})` : 'Apply filters'}
          onPress={apply}
          style={{ flex: 1.4 }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.giant,
    gap: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  field: {},
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: layout.controlHeight,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
});