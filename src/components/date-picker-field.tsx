import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import type { Control, FieldValues } from 'react-hook-form';

import { AppText } from '@/components/ui';
import { DateField } from '@/components/form-fields';
import { formatDate } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';

export interface DatePickerFieldProps {
  name: string;
  control: Control<FieldValues>;
  label?: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  value: string;
  onChange: (nextIsoDate: string) => void;
  minimumDate?: Date;
}

export function DatePickerField({
  name,
  control,
  label,
  error,
  hint,
  required,
  value,
  onChange,
  minimumDate,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  // Midday avoids the classic off-by-one where a UTC-parsed date shifts a day.
  const selected = value ? new Date(`${value}T12:00:00`) : null;

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    // Android dismisses on selection; iOS keeps the modal open for a Done tap.
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'set' && date) onChange(toIsoDate(date));
  };

  return (
    <>
      <DateField
        name={name}
        control={control}
        label={label}
        error={error}
        hint={hint}
        required={required}
        onPress={() => setOpen(true)}
        displayValue={value ? formatDate(value) : 'Select a date'}
      />

      {open && Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable
            style={styles.backdrop}
            accessibilityRole="button"
            accessibilityLabel="Cancel date picker"
            onPress={() => setOpen(false)}
          >
            <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
              <View style={styles.header}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={() => setOpen(false)}
                  hitSlop={8}
                >
                  <AppText variant="body" color={colors.primary}>
                    Cancel
                  </AppText>
                </Pressable>

                <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>
                  {label ?? name}
                </AppText>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                  onPress={() => setOpen(false)}
                  hitSlop={8}
                >
                  <AppText variant="bodyStrong" color={colors.primary}>
                    Done
                  </AppText>
                </Pressable>
              </View>

              <DateTimePicker
                value={selected ?? new Date()}
                mode="date"
                display="inline"
                minimumDate={minimumDate}
                onChange={handleChange}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {open && Platform.OS !== 'ios' ? (
        <DateTimePicker
          value={selected ?? new Date()}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      ) : null}
    </>
  );
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: { flex: 1, textAlign: 'center' },
});