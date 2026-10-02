import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { AppText } from '@/components/ui';
import type { IconName } from '@/constants/options';
import { colors, hitSlop, layout, radii, spacing } from '@/theme';

interface FieldShellProps {
  label?: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function FieldShell({ label, error, hint, required, children, style }: FieldShellProps) {
  return (
    <View style={[{ gap: spacing.xs }, style]}>
      {label ? (
        <AppText variant="captionStrong">
          {label}
          {required ? <AppText variant="captionStrong" color={colors.danger}> *</AppText> : null}
        </AppText>
      ) : null}
      {children}
      {error ? (
        <View style={styles.fieldMessage}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <AppText variant="caption" color={colors.danger} style={{ flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
}

/**
 * Contract shared by every field that registers itself with React Hook Form.
 *
 * Both members are generic so a screen cannot hand a field a name that does not
 * exist on its form values, which removes the need to cast the name.
 */
export interface BoundFieldProps<TFieldValues extends FieldValues> {
  /** The form instance the field registers with. */
  control: Control<TFieldValues>;
  /** Dotted path of the field inside the form values. */
  name: Path<TFieldValues>;
}

/* ------------------------------------------------------------------ */
/* Text input                                                           */
/* ------------------------------------------------------------------ */

export interface TextFieldProps<TFieldValues extends FieldValues>
  extends BoundFieldProps<TFieldValues>,
    Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  icon?: IconName;
  containerStyle?: StyleProp<ViewStyle>;
  /** Renders the prefix, e.g. "₱" for money fields. */
  prefix?: string;
}

export function TextField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  error,
  hint,
  required,
  icon,
  containerStyle,
  prefix,
  multiline,
  ...rest
}: TextFieldProps<TFieldValues>) {
  const [focused, setFocused] = useState(false);

  return (
    <FieldShell label={label} error={error} hint={hint} required={required} style={containerStyle}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View
            style={[
              styles.inputContainer,
              multiline && styles.inputContainerMultiline,
              focused && styles.inputContainerFocused,
              error ? styles.inputContainerError : null,
            ]}
          >
            {icon ? (
              <Ionicons
                name={icon}
                size={17}
                color={focused ? colors.primary : colors.textMuted}
                style={{ marginRight: spacing.sm }}
              />
            ) : null}
            {prefix ? (
              <AppText variant="body" color={colors.textMuted} style={{ marginRight: 4 }}>
                {prefix}
              </AppText>
            ) : null}
            <TextInput
              value={value === null || value === undefined ? '' : String(value)}
              onChangeText={onChange}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              onFocus={() => setFocused(true)}
              multiline={multiline}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={label ?? name}
              accessibilityHint={hint}
              style={[styles.input, multiline && styles.inputMultiline]}
              {...rest}
            />
          </View>
        )}
      />
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Password input                                                       */
/* ------------------------------------------------------------------ */

export function PasswordField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  error,
  hint,
  required,
  ...rest
}: TextFieldProps<TFieldValues>) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={[styles.inputContainer, error ? styles.inputContainerError : null]}>
            <Ionicons name="lock-closed-outline" size={17} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
            <TextInput
              value={value === null || value === undefined ? '' : String(value)}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={!visible}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={label ?? name}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, styles.inputWithButton]}
              {...rest}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Hide password' : 'Show password'}
              onPress={() => setVisible((v) => !v)}
              hitSlop={hitSlop}
            >
              <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
      />
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Select / option row                                                  */
/* ------------------------------------------------------------------ */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export function SelectField<T extends string, TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  label,
  options,
  error,
  hint,
  required,
  placeholder = 'Select an option',
  onOpenPicker,
}: BoundFieldProps<TFieldValues> & {
  label?: string;
  options: SelectOption<T>[];
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  placeholder?: string;
  /** When supplied the row is treated as a launcher instead of a plain display. */
  onOpenPicker?: () => void;
}) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => {
          // Compared as strings because the form value arrives as an indexed
          // access type, not as the literal union the options are built from.
          const selected = options.find((option) => option.value === String(value));
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label ?? name}: ${selected?.label ?? placeholder}`}
              onPress={onOpenPicker}
              style={[styles.inputContainer, error ? styles.inputContainerError : null]}
            >
              <Text style={[styles.input, !selected && { color: colors.textMuted }]}>
                {selected?.label ?? placeholder}
              </Text>
              <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
            </Pressable>
          );
        }}
      />
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Switch field                                                         */
/* ------------------------------------------------------------------ */

export function SwitchField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  description,
  hint,
  error,
}: BoundFieldProps<TFieldValues> & {
  label: string;
  description?: string;
  hint?: string;
  /** Needed for consent switches where "on" is the only valid submission. */
  error?: string | undefined;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <AppText variant="bodyStrong">{label}</AppText>
              {description ? <AppText variant="caption">{description}</AppText> : null}
            </View>
            <Switch
              value={Boolean(value)}
              onValueChange={onChange}
              accessibilityLabel={label}
              accessibilityHint={hint ?? description}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={value ? colors.primary : colors.surface}
            />
          </View>
          {error ? (
            <View style={styles.fieldMessage}>
              <Ionicons name="alert-circle" size={13} color={colors.danger} />
              <AppText variant="caption" color={colors.danger} style={{ flex: 1 }}>
                {error}
              </AppText>
            </View>
          ) : null}
        </View>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Date field                                                           */
/* ------------------------------------------------------------------ */

export function DateField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  error,
  hint,
  required,
  onPress,
  displayValue,
  minimumDate,
}: BoundFieldProps<TFieldValues> & {
  label?: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  onPress: () => void;
  displayValue: string;
  minimumDate?: Date;
}) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label ?? String(name)}: ${displayValue}`}
            onPress={onPress}
            style={[styles.inputContainer, error ? styles.inputContainerError : null]}
          >
            <Ionicons name="calendar-outline" size={17} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
            <Text style={[styles.input, !value && { color: colors.textMuted }]}>{displayValue}</Text>
            <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
          </Pressable>
        )}
      />
      {minimumDate ? <View pointerEvents="none" style={{ height: 0 }} /> : null}
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                    */
/* ------------------------------------------------------------------ */

export function SegmentedField<T extends string, TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  label,
  options,
  error,
  hint,
}: BoundFieldProps<TFieldValues> & {
  label?: string;
  options: SelectOption<T>[];
  error?: string | undefined;
  hint?: string | undefined;
}) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <View style={styles.segmented} accessibilityRole="radiogroup">
            {options.map((option) => {
              const active = option.value === String(value);
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={option.label}
                  onPress={() => onChange(option.value)}
                  style={[styles.segment, active && styles.segmentActive]}
                >
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]} numberOfLines={1}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      />
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Slider-ish stepper for 1-5 scales                                   */
/* ------------------------------------------------------------------ */

export function ScaleField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  options,
  error,
  hint,
}: BoundFieldProps<TFieldValues> & {
  label?: string;
  options: { value: number; label: string }[];
  error?: string | undefined;
  hint?: string | undefined;
}) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <View style={styles.scaleRow}>
            {options.map((option) => {
              const active = option.value === Number(value);
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={option.label}
                  onPress={() => onChange(option.value)}
                  style={[styles.scaleDot, active && styles.scaleDotActive]}
                >
                  <Text style={[styles.scaleLabel, active && styles.scaleLabelActive]}>{option.value}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      />
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Photo picker field                                                   */
/* ------------------------------------------------------------------ */

export function PhotoPickerField({
  photos,
  onAddFromLibrary,
  onTakePhoto,
  onRemove,
  isUploading,
  error,
  maxPhotos = 8,
}: {
  photos: { id: string; url: string | null; isLocal?: boolean }[];
  onAddFromLibrary: () => void;
  onTakePhoto: () => void;
  onRemove: (id: string) => void;
  isUploading?: boolean;
  error?: string | undefined;
  maxPhotos?: number;
}) {
  const isFull = photos.length >= maxPhotos;

  return (
    <FieldShell
      label="Photos"
      error={error}
      hint={isFull ? `Maximum of ${maxPhotos} photos.` : 'Add at least one clear photo of the unit.'}
    >
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoCell}>
            {photo.url ? (
              <Image
                source={{ uri: photo.url }}
                style={styles.photoImage}
                contentFit="cover"
                transition={120}
                accessibilityLabel={`Property photo ${photos.indexOf(photo) + 1}`}
              />
            ) : (
              <View style={[styles.photoImage, styles.photoPlaceholder]}>
                <Ionicons name="image-outline" size={20} color={colors.textMuted} />
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              onPress={() => onRemove(photo.id)}
              style={styles.photoRemove}
              hitSlop={hitSlop}
            >
              <Ionicons name="close" size={14} color={colors.textInverse} />
            </Pressable>
          </View>
        ))}

        {!isFull ? (
          <View style={{ gap: spacing.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add photos from library"
              onPress={onAddFromLibrary}
              style={styles.photoAdd}
            >
              <Ionicons name="images-outline" size={20} color={colors.primary} />
              <Text style={styles.photoAddLabel}>Library</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take a photo with the camera"
              onPress={onTakePhoto}
              style={styles.photoAdd}
            >
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={styles.photoAddLabel}>Camera</Text>
            </Pressable>
          </View>
        ) : null}

        {isUploading ? (
          <View style={styles.photoUploading}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
            <Text style={styles.photoUploadingLabel}>Uploading…</Text>
          </View>
        ) : null}
      </View>
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Standalone (non-form) inputs                                         */
/* ------------------------------------------------------------------ */

/**
 * Controlled input that is not bound to React Hook Form.
 *
 * Used by the filter sheet, which keeps a plain draft object rather than a
 * form instance. Same look as TextField so the UI stays consistent.
 */
export function PlainTextField({
  label,
  value,
  onChangeText,
  error,
  hint,
  required,
  icon,
  prefix,
  multiline,
  containerStyle,
  ...rest
}: Omit<TextFieldProps<FieldValues>, 'name' | 'control'> & {
  label?: string | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  icon?: IconName | undefined;
  prefix?: string | undefined;
  containerStyle?: StyleProp<ViewStyle> | undefined;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <FieldShell label={label} error={error} hint={hint} required={required} style={containerStyle}>
      <View
        style={[
          styles.inputContainer,
          multiline && styles.inputContainerMultiline,
          focused && styles.inputContainerFocused,
          error ? styles.inputContainerError : null,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={17}
            color={focused ? colors.primary : colors.textMuted}
            style={{ marginRight: spacing.sm }}
          />
        ) : null}
        {prefix ? (
          <AppText variant="body" color={colors.textMuted} style={{ marginRight: 4 }}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label}
          style={[styles.input, multiline && styles.inputMultiline]}
          {...rest}
        />
      </View>
    </FieldShell>
  );
}

export function PlainSelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  error,
  hint,
  required,
  searchable = false,
}: {
  label?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  /** Adds a search box — needed for long lists such as barangays. */
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);

  const visibleOptions = useMemo(() => {
    if (!searchable || query.trim() === '') return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query, searchable]);

  const choose = (next: T) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Select'}: ${selected?.label ?? placeholder}`}
        accessibilityHint="Opens a list of options"
        onPress={() => setOpen(true)}
        style={[styles.inputContainer, error ? styles.inputContainerError : null]}
      >
        <Text style={[styles.input, !selected && { color: colors.textMuted }]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close options"
          style={styles.pickerBackdrop}
          onPress={() => setOpen(false)}
        >
          <Pressable style={styles.pickerSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.pickerHeader}>
              <AppText variant="subheading">{label ?? 'Select an option'}</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close options"
                onPress={() => setOpen(false)}
                hitSlop={hitSlop}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            {searchable ? (
              <PlainTextField
                value={query}
                onChangeText={setQuery}
                placeholder="Type to filter"
                icon="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : null}

            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
              {visibleOptions.length === 0 ? (
                <AppText variant="caption" align="center" style={{ paddingVertical: spacing.lg }}>
                  No option matches “{query}”.
                </AppText>
              ) : (
                visibleOptions.map((option) => {
                  const active = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="menuitem"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={option.label}
                      onPress={() => choose(option.value)}
                      style={({ pressed }) => [styles.pickerItem, pressed && styles.pickerItemPressed]}
                    >
                      <Text
                        style={[styles.pickerItemLabel, active && { color: colors.primary, fontWeight: '700' }]}
                        numberOfLines={1}
                      >
                        {option.label}
                      </Text>
                      {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Numeric input with peso handling                                     */
/* ------------------------------------------------------------------ */

export function MoneyField<TFieldValues extends FieldValues>(props: TextFieldProps<TFieldValues>) {
  return (
    <TextField
      keyboardType="numeric"
      inputMode="numeric"
      returnKeyType="done"
      prefix="₱"
      {...props}
    />
  );
}

export function NumberField<TFieldValues extends FieldValues>(
  props: Omit<TextFieldProps<TFieldValues>, 'prefix'> & { keyboardType?: KeyboardTypeOptions },
) {
  return <TextField keyboardType="number-pad" inputMode="numeric" {...props} />;
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.inputHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  inputContainerMultiline: { minHeight: 120, alignItems: 'flex-start', paddingVertical: spacing.md },
  inputContainerFocused: { borderColor: colors.primary },
  inputContainerError: { borderColor: colors.danger },

  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.md,
    // Web reset so the field does not render with a browser focus ring.
    // `outlineWidth` rather than `outlineStyle: 'none'`: React Native's style
    // types only allow solid/dotted/dashed.
    outlineWidth: 0,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  inputWithButton: { paddingRight: spacing.sm },

  fieldMessage: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.controlHeight,
    paddingVertical: spacing.xs,
  },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentLabel: { fontSize: 13, color: colors.textSecondary },
  segmentLabelActive: { color: colors.primary, fontWeight: '700' },

  scaleRow: { flexDirection: 'row', gap: spacing.sm },
  scaleDot: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  scaleDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleLabel: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  scaleLabelActive: { color: colors.textInverse },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoCell: { width: 88, height: 88, borderRadius: radii.md, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15,23,42,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 88,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoAddLabel: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  photoUploading: {
    width: 88,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoUploadingLabel: { fontSize: 10, color: colors.primary },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  pickerSheet: {
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerList: { flexGrow: 0 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: layout.controlHeight,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pickerItemPressed: { backgroundColor: colors.surfaceMuted },
  pickerItemLabel: { flex: 1, fontSize: 15, color: colors.text },
});
