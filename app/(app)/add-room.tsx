import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';

import { DateField, SelectField, TextField } from '@/components/form-fields';
import { ScreenHeader } from '@/components/screen-header';
import { ChipGroup, AppText, Button, InlineAlert, Screen, ScreenScroll } from '@/components/ui';
import type { ChipOption } from '@/components/ui';
import { PH_CITIES } from '@/constants/locations';
import { useApp } from '@/hooks/use-app';
import { toMessage } from '@/lib/errors';
import { ROOM_TYPE_OPTIONS } from '@/services/room-service';
import { parsePesoInput } from '@/utils/format';
import { colors, spacing } from '@/theme';
import type { Room, RoomType } from '@/lib/types';

interface FormValues {
  title: string;
  roomType: RoomType;
  monthlyRent: string;
  city: string;
  barangay: string;
  landmark: string;
  availableFrom: string;
  slots: string;
  description: string;
}

const CITY_OPTIONS = PH_CITIES.map((city) => ({ value: city.label, label: city.label }));

/**
 * Landmarks you tap instead of type — the same kinds of places the old
 * placeholder used to ask for, plus a few common ones.
 */
const LANDMARK_OPTIONS: ChipOption<string>[] = [
  { value: 'Shopping center', label: 'Shopping center' },
  { value: 'School', label: 'School' },
  { value: 'University', label: 'University' },
  { value: 'Terminal', label: 'Terminal' },
  { value: 'Market', label: 'Market' },
  { value: 'Mall', label: 'Mall' },
  { value: 'Hospital', label: 'Hospital' },
  { value: 'Church', label: 'Church' },
  { value: 'Park', label: 'Park' },
];

/**
 * Add or edit a room as a normal full-screen form.
 *
 * Submitted rooms are written to local storage and merged straight into the
 * listings — no backend is involved. Editing passes `?id=` with an existing
 * custom room.
 */
export default function AddRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile, customRooms, addCustomRoom, updateCustomRoom } = useApp();

  const existing = id ? customRooms.find((room) => room.id === id) : undefined;
  const isEditing = existing !== undefined;

  // A room saved before this picker existed may carry a typed landmark; keep
  // it as an option so editing never silently loses it.
  const landmarkOptions: ChipOption<string>[] =
    existing?.landmark && !LANDMARK_OPTIONS.some((option) => option.value === existing.landmark)
      ? [...LANDMARK_OPTIONS, { value: existing.landmark, label: existing.landmark }]
      : LANDMARK_OPTIONS;

  const [values, setValues] = useState<FormValues>(() => ({
    title: existing?.title ?? '',
    roomType: existing?.roomType ?? 'boarding_house',
    monthlyRent: existing ? String(existing.monthlyRent) : '',
    city: existing?.city ?? '',
    barangay: existing?.barangay ?? '',
    landmark: existing?.landmark ?? '',
    availableFrom: existing?.availableFrom ?? '',
    slots: existing ? String(existing.availableSlots) : '1',
    description: existing?.description ?? '',
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function dismiss() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    // Falls back to the tabs for direct URL loads, where there is no in-app
    // stack to pop and router.back() would go nowhere.
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)');
  }

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};

    if (values.title.trim().length < 3) next.title = 'Give the listing a short title.';
    const rent = parsePesoInput(values.monthlyRent);
    if (rent === null || rent <= 0) next.monthlyRent = 'Enter a valid monthly rent in pesos.';
    if (values.city.trim().length === 0) next.city = 'Pick a city.';
    if (values.barangay.trim().length === 0) next.barangay = 'Enter a barangay.';
    if (Number.isNaN(Date.parse(values.availableFrom))) {
      next.availableFrom = 'Use a date like 2026-11-01.';
    }
    const slots = Number.parseInt(values.slots, 10);
    if (Number.isNaN(slots) || slots < 1) next.slots = 'At least one slot is required.';

    return next;
  }

  async function handleSubmit() {
    setFormError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsSaving(true);

    const rent = parsePesoInput(values.monthlyRent) ?? 0;
    const slots = Number.parseInt(values.slots, 10) || 1;
    const city = PH_CITIES.find((option) => option.label === values.city);

    const room: Room = {
      id: existing?.id ?? `custom-${Date.now().toString(36)}`,
      title: values.title.trim(),
      roomType: values.roomType,
      monthlyRent: rent,
      advanceAmount: rent,
      city: values.city,
      barangay: values.barangay.trim(),
      landmark: values.landmark.trim() || values.barangay.trim(),
      latitude: city?.latitude ?? 0,
      longitude: city?.longitude ?? 0,
      availableFrom: values.availableFrom,
      minStayMonths: existing?.minStayMonths ?? 1,
      capacity: slots,
      availableSlots: slots,
      isFeatured: existing?.isFeatured ?? false,
      description:
        values.description.trim() ||
        `${values.title.trim()} in ${values.barangay.trim()}, ${values.city}.`,
      amenities: existing?.amenities ?? [],
      houseRules: existing?.houseRules ?? [],
      images: existing?.images ?? [],
      landlord: existing?.landlord ?? {
        name: profile.fullName,
        verified: false,
        avatarUrl: null,
        responseTime: 'Usually replies within a day',
      },
      occupants: existing?.occupants ?? [],
      distanceKm: existing?.distanceKm ?? null,
      rating: existing?.rating ?? 0,
      reviewCount: existing?.reviewCount ?? 0,
    };

    const result = isEditing ? await updateCustomRoom(room) : await addCustomRoom(room);
    setIsSaving(false);

    if (!result.ok) {
      setFormError(toMessage(result.error, 'We could not save that room.'));
      return;
    }

    // Shown inline rather than through Alert, which is a no-op on web, then the
    // screen returns on its own so the message is seen either way.
    setSavedMessage(isEditing ? 'Room updated successfully!' : 'Room added successfully!');
    closeTimer.current = setTimeout(dismiss, 900);
  }

  return (
    <Screen testID="add-room-screen">
      <ScreenHeader
        title={isEditing ? 'Edit room' : 'Add room'}
        subtitle="Published to your listings on this device."
      />

      <ScreenScroll contentContainerStyle={styles.content}>
        {formError ? <InlineAlert tone="danger" message={formError} /> : null}
        {savedMessage ? <InlineAlert tone="success" message={savedMessage} /> : null}

        <TextField
          label="Listing title"
          required
          value={values.title}
          onChangeText={(value) => update('title', value)}
          placeholder="Bright studio near UP Diliman"
          error={errors.title}
          autoCapitalize="sentences"
        />

        <SelectField
          label="Room type"
          required
          value={values.roomType}
          options={ROOM_TYPE_OPTIONS}
          onChange={(value) => update('roomType', value)}
          error={errors.roomType}
        />

        <TextField
          label="Monthly rent"
          required
          prefix="₱"
          keyboardType="number-pad"
          value={values.monthlyRent}
          onChangeText={(value) => update('monthlyRent', value)}
          placeholder="4500"
          error={errors.monthlyRent}
          hint="Amount in pesos per month."
        />

        <SelectField
          label="City"
          required
          value={values.city}
          options={CITY_OPTIONS}
          onChange={(value) => update('city', value)}
          error={errors.city}
        />

        <TextField
          label="Barangay"
          required
          value={values.barangay}
          onChangeText={(value) => update('barangay', value)}
          placeholder="Barangay UP Campus"
          error={errors.barangay}
          autoCapitalize="words"
        />

        <ChipGroup
          label="Nearest landmark"
          helperText="Tap the place closest to the room — no typing needed."
          options={landmarkOptions}
          selected={values.landmark ? [values.landmark] : []}
          onToggle={(value) => update('landmark', values.landmark === value ? '' : value)}
        />

        <DateField
          label="Available from"
          required
          value={values.availableFrom}
          onChange={(value) => update('availableFrom', value)}
          error={errors.availableFrom}
        />

        <TextField
          label="Slots available"
          required
          keyboardType="number-pad"
          value={values.slots}
          onChangeText={(value) => update('slots', value)}
          placeholder="1"
          error={errors.slots}
          hint="How many people can still move in."
        />

        <TextField
          label="Description"
          multiline
          value={values.description}
          onChangeText={(value) => update('description', value)}
          placeholder="What makes this room a good fit?"
          error={errors.description}
        />

        <AppText variant="caption" color={colors.textMuted}>
          Rooms you add live on this device only — there is no server behind them.
        </AppText>

        <View style={styles.actions}>
          <Button
            label={isEditing ? 'Save changes' : 'Add room'}
            icon={isEditing ? 'checkmark' : 'add'}
            isLoading={isSaving}
            fullWidth
            onPress={() => void handleSubmit()}
          />
          <Button label="Cancel" variant="ghost" fullWidth onPress={dismiss} />
        </View>
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
});
