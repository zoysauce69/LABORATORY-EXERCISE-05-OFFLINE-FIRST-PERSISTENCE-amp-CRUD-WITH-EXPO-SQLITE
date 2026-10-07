import { forwardRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui';
import { colors, hitSlop, layout, palette, radii, spacing } from '@/theme';
import type { IconName } from '@/lib/types';

/* ------------------------------------------------------------------ */
/* Field wrapper                                                      */
/* ------------------------------------------------------------------ */

/**
 * Label + control + message, shared by every field below.
 *
 * Renders exactly one message: the error if there is one, otherwise the hint.
 * Showing both at once contradicts itself on a form this small.
 */
export function FieldShell({
  label,
  error,
  hint,
  required,
  children,
  style,
}: {
  label: string;
  error?: string | undefined;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      <View style={styles.labelRow}>
        <AppText variant="captionStrong" color={colors.textSecondary}>
          {label}
        </AppText>
        {required ? (
          <AppText variant="caption" color={colors.danger}>
            Required
          </AppText>
        ) : null}
      </View>
      {children}
      {error ? (
        <View style={styles.messageRow}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <AppText variant="caption" color={colors.danger} style={styles.messageText}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" color={colors.textMuted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

/** The bordered box a control sits in. Shared so every field lines up. */
function controlShell(error: string | undefined, pressed = false) {
  return [
    styles.control,
    error ? styles.controlError : null,
    pressed ? styles.controlPressed : null,
  ];
}

/* ------------------------------------------------------------------ */
/* Text input                                                         */
/* ------------------------------------------------------------------ */

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string | undefined;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  icon?: IconName;
  /** Static text rendered inside the control, before the input. e.g. "₱". */
  prefix?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  maxLength?: number;
  editable?: boolean;
  /** Wired to react-hook-form so a field is only marked touched once left. */
  onBlur?: () => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done' | 'go' | 'search';
  testID?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    value,
    onChangeText,
    error,
    hint,
    placeholder,
    required,
    icon,
    prefix,
    secureTextEntry,
    keyboardType,
    autoCapitalize = 'none',
    autoCorrect = false,
    multiline,
    maxLength,
    editable = true,
    onBlur,
    onFocus,
    onSubmitEditing,
    returnKeyType,
    testID,
  },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      <View style={controlShell(error)}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={error ? colors.danger : colors.textMuted}
          />
        ) : null}
        {prefix ? (
          <AppText variant="body" color={colors.textSecondary}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          ref={ref}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          maxLength={maxLength}
          editable={editable}
          onBlur={onBlur}
          onFocus={onFocus}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          accessibilityLabel={label}
          accessibilityHint={hint}
          style={[
            styles.input,
            multiline ? styles.inputMultiline : null,
            editable ? null : styles.inputDisabled,
          ]}
        />
      </View>
    </FieldShell>
  );
});

/* ------------------------------------------------------------------ */
/* Select                                                             */
/* ------------------------------------------------------------------ */

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
}

interface SelectFieldProps<T extends string | number> {
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string | undefined;
  hint?: string;
  required?: boolean;
  /**
   * Adds an explicit "Any" row that clears the selection. Requires `onChange`
   * to accept `null`, so it is separate from the required `onChange`.
   */
  onClear?: () => void;
  testID?: string;
}

/**
 * A picker that opens a bottom sheet.
 *
 * A sheet rather than an inline dropdown so long option lists (cities, budget
 * bands) stay scrollable and tap targets stay at full width.
 */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  error,
  hint,
  required,
  onClear,
  testID,
}: SelectFieldProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${selected?.label ?? placeholder}`}
        accessibilityHint="Opens a list of options"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => controlShell(error, pressed)}
      >
        <AppText
          variant="body"
          color={selected ? colors.text : colors.textMuted}
          numberOfLines={1}
          style={styles.selectValue}
        >
          {selected?.label ?? placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.scrim}
          onPress={() => setIsOpen(false)}
          accessibilityLabel="Close options"
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <AppText variant="subheading" accessibilityRole="header">
              {label}
            </AppText>
            <Pressable
              onPress={() => setIsOpen(false)}
              hitSlop={hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetList}>
            {onClear ? (
              <Pressable
                onPress={() => {
                  onClear();
                  setIsOpen(false);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.optionRow, pressed && styles.controlPressed]}
              >
                <AppText variant="body" color={colors.textMuted}>
                  Any
                </AppText>
              </Pressable>
            ) : null}
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={String(option.value)}
                  onPress={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={option.label}
                  style={({ pressed }) => [
                    styles.optionRow,
                    isSelected ? styles.optionRowSelected : null,
                    pressed ? styles.controlPressed : null,
                  ]}
                >
                  <View style={styles.optionText}>
                    <AppText
                      variant={isSelected ? 'bodyStrong' : 'body'}
                      color={isSelected ? colors.primary : colors.text}
                    >
                      {option.label}
                    </AppText>
                    {option.description ? (
                      <AppText variant="caption">{option.description}</AppText>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Date field                                                         */
/* ------------------------------------------------------------------ */

/** ISO `YYYY-MM-DD` for a date `days` from today. */
export function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function quickPickLabel(days: number): string {
  if (days === 0) return 'ASAP';
  if (days % 7 === 0) return `${days / 7} wk`;
  return `${days}d`;
}

/**
 * Move-in date, as a text input plus tappable presets.
 *
 * Deliberately not a platform date picker: the presets cover the common case in
 * one tap and the text field accepts any date, without the dialog behaving
 * differently across iOS, Android and web. The value is always `YYYY-MM-DD`,
 * which is what the application schema validates.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  presets = [0, 7, 14, 30, 60],
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string;
  required?: boolean;
  presets?: number[];
}) {
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint ?? 'YYYY-MM-DD, or tap a preset'}
      required={required}
    >
      <View style={styles.control}>
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          style={styles.input}
        />
      </View>
      <View style={styles.presetRow}>
        {presets.map((days) => {
          const iso = isoDaysFromNow(days);
          const isSelected = value === iso;
          return (
            <Pressable
              key={days}
              onPress={() => onChange(iso)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Move in ${quickPickLabel(days)} from now`}
              style={({ pressed }) => [
                styles.preset,
                isSelected ? styles.presetSelected : null,
                pressed ? styles.controlPressed : null,
              ]}
            >
              <AppText
                variant="captionStrong"
                color={isSelected ? colors.primary : colors.textSecondary}
              >
                {quickPickLabel(days)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle                                                             */
/* ------------------------------------------------------------------ */

export function SwitchField({
  label,
  description,
  value,
  onChange,
  testID,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? <AppText variant="caption">{description}</AppText> : null}
      </View>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        accessibilityRole="switch"
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={palette.white}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                  */
/* ------------------------------------------------------------------ */

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  error?: string | undefined;
}) {
  return (
    <FieldShell label={label ?? ''} error={error}>
      <View style={styles.segmented} accessibilityRole="radiogroup">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.label}
              style={({ pressed }) => [
                styles.segment,
                isSelected ? styles.segmentSelected : null,
                pressed ? styles.controlPressed : null,
              ]}
            >
              <AppText
                variant="captionStrong"
                color={isSelected ? colors.primary : colors.textSecondary}
                align="center"
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  messageText: { flex: 1 },

  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.inputHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  controlError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  controlPressed: { backgroundColor: colors.surfaceMuted },

  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    // React Native's TextInput cannot have its vertical padding reduced on
    // Android without zeroing it here and re-adding it via the container's
    // minHeight.
    padding: 0,
  },
  inputMultiline: { minHeight: 76, paddingTop: spacing.md, textAlignVertical: 'top' },
  inputDisabled: { color: colors.textMuted },
  selectValue: { flex: 1 },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preset: {
    paddingHorizontal: spacing.md,
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  presetSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },

  scrim: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingBottom: spacing.xxl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  sheetList: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  optionRowSelected: { backgroundColor: colors.primarySoft },
  optionText: { flex: 1, gap: 2 },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.controlHeight,
    paddingVertical: spacing.sm,
  },
  switchText: { flex: 1, gap: 2 },

  segmented: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
  },
});