import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText, Button, ChipGroup } from '@/components/ui';
import { colors, hitSlop, layout, radii, spacing } from '@/theme';
import type { ChipOption } from '@/components/ui';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  title: string;
  /** Number of narrowing filters, shown on the sheet's Apply button. */
  activeCount: number;
  children: ReactNode;
}

/**
 * A bottom sheet that holds a screen's filter form.
 *
 * Filters apply on confirm rather than live, so the result count on the list
 * behind the sheet never flickers while someone is still mid-decision. "Clear"
 * resets the form and applies immediately, because that intent is never
 * ambiguous.
 */
export function FilterSheet({
  visible,
  onClose,
  onApply,
  onClear,
  title,
  activeCount,
  children,
}: FilterSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close filters" />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <AppText variant="subheading" accessibilityRole="header">
            {title}
          </AppText>
          <Pressable
            onPress={onClose}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Clear all"
            variant="ghost"
            onPress={onClear}
            disabled={activeCount === 0}
            style={styles.footerSecondary}
          />
          <Button
            label={activeCount > 0 ? `Show results (${activeCount})` : 'Show results'}
            onPress={onApply}
            style={styles.footerPrimary}
          />
        </View>
      </View>
    </Modal>
  );
}

/** A labelled group of toggleable filter chips. */
export function FilterChips<T extends string | number>({
  label,
  options,
  selected,
  onToggle,
  multiple = true,
}: {
  label: string;
  options: ChipOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  multiple?: boolean;
}) {
  return (
    <ChipGroup label={label} options={options} selected={selected} onToggle={onToggle} multiple={multiple} />
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingBottom: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceMuted },

  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    minHeight: layout.controlHeight + spacing.lg,
  },
  footerSecondary: { flexShrink: 1 },
  footerPrimary: { flex: 1 },
});