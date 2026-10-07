import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors, hitSlop, layout, radii, spacing } from '@/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  testID?: string;
}

/**
 * The rounded search field used on the rooms and roommates tabs.
 *
 * Clearing is a separate button rather than an `onChangeText('')` on the X,
 * because tapping the X while typing should not steal focus mid-word.
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  autoFocus = false,
  testID,
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.inputHeight,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    // Android needs the padding zeroed here to respect `minHeight` on the row.
    padding: 0,
    paddingVertical: spacing.sm,
  },
  clear: { padding: spacing.xs },
  pressed: { opacity: 0.6 },
});