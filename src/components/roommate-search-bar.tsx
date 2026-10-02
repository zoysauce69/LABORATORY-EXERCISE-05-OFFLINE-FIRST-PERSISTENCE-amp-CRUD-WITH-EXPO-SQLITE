import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ChipGroup } from '@/components/ui';
import { colors, layout, radii, spacing } from '@/theme';

export interface RoommateSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  city: string | undefined;
  onChangeCity: (city: string | undefined) => void;
  cities: string[];
}

/**
 * Search and city filter for the Roommates tab.
 *
 * Split out so the tab screen stays about data, not chrome. Deliberately
 * uncontrolled by the database: the `search_roommates` RPC takes both values
 * directly, so there is nothing to reconcile.
 */
export function RoommateSearchBar({
  value,
  onChange,
  city,
  onChangeCity,
  cities,
}: RoommateSearchBarProps) {
  return (
    <View style={styles.root}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Search by name or headline"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search roommates"
          accessibilityHint="Filters the roommate list as you type"
          style={styles.input}
        />
        {value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear roommate search"
            onPress={() => onChange('')}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ChipGroup
          options={[
            { value: '', label: 'All cities' },
            ...cities.map((c) => ({ value: c, label: c })),
          ]}
          selected={[city ?? '']}
          onToggle={(next) => onChangeCity(next === '' ? undefined : next)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  searchBox: {
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
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: spacing.sm },
});