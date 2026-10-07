import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { SmartImage } from '@/components/image';
import { DateField, SelectField, TextField } from '@/components/form-fields';
import { AppText, Button, InlineAlert } from '@/components/ui';
import { PH_CITIES } from '@/constants/locations';
import { useApp } from '@/hooks/use-app';
import { toMessage } from '@/lib/errors';
import { ROOM_TYPE_OPTIONS } from '@/services/room-service';
import { parsePesoInput } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';
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

/** Photos a single room may carry, kept low so storage stays predictable. */
const MAX_PHOTOS = 3;

/**
 * Add or edit a room, presented as a floating sheet rather than a full screen.
 *
 * The sheet is capped at a fraction of the viewport and scrolls internally,
 * with the actions pinned to its foot, so the form stays reachable on small
 * phones as well as large ones. Submitted rooms are written to local storage
 * and merged straight into the listings — no backend is involved. Editing
 * passes `?id=` with an existing custom room.
 */
export default function AddRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile, customRooms, addCustomRoom, updateCustomRoom } = useApp();

  const existing = id ? customRooms.find((room) => room.id === id) : undefined;
  const isEditing = existing !== undefined;

  // The sheet is capped against the real viewport: a percentage height cannot
  // be relied on inside every navigator container, especially on web.
  const { height } = useWindowDimensions();
  const sheetMaxHeight = Math.round(height * 0.92);

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

  const [images, setImages] = useState<string[]>(() => existing?.images ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Guards the backdrop against the very touch that opened the sheet.
   *
   * Written in an effect because reading the clock during render is impure.
   */
  const openedAt = useRef<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    openedAt.current = Date.now();
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function dismiss() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    router.back();
  }

  /** Backdrop close, ignored for the first beat after opening. */
  function dismissFromBackdrop() {
    if (openedAt.current === null || Date.now() - openedAt.current < 400) return;
    dismiss();
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

  async function pickPhotos() {
    if (images.length >= MAX_PHOTOS) return;
    setPhotoNotice(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        // Inline rather than Alert.alert, which does nothing on the web preview.
        setPhotoNotice(
          'Photo access is off. Allow it in your phone settings, then try adding a picture again.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - images.length,
        quality: 0.7,
      });

      if (result.canceled) return;

      const picked = result.assets.map((asset) => asset.uri);
      setImages((current) => [...new Set([...current, ...picked])].slice(0, MAX_PHOTOS));
    } catch {
      setPhotoNotice('We could not open your photo library. Please try again.');
    }
  }

  function removePhoto(uri: string) {
    setImages((current) => current.filter((item) => item !== uri));
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
      images,
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

    // Shown inside the sheet rather than through Alert, which is a no-op on web,
    // then the sheet closes on its own so the message is seen either way.
    setSavedMessage(isEditing ? 'Room updated successfully!' : 'Room added successfully!');
    closeTimer.current = setTimeout(dismiss, 900);
  }

  return (
    <View style={[styles.overlay, { height }]}>
      {/* Tapping the dimmed backdrop closes the sheet. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={dismissFromBackdrop}
        accessibilityRole="button"
        accessibilityLabel="Close add room"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={[styles.sheet, { maxHeight: sheetMaxHeight }]} testID="add-room-screen">
          <View style={styles.grabber} />

          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleBlock}>
              <AppText variant="heading" accessibilityRole="header">
                {isEditing ? 'Edit room' : 'Add room'}
              </AppText>
              <AppText variant="caption" color={colors.textMuted}>
                Published to your listings on this device.
              </AppText>
            </View>
            <Pressable
              onPress={dismiss}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {formError ? <InlineAlert tone="danger" message={formError} /> : null}
            {photoNotice ? <InlineAlert tone="warning" message={photoNotice} /> : null}
            {savedMessage ? <InlineAlert tone="success" message={savedMessage} /> : null}

            {/* Photos */}
            <View style={styles.fieldBlock}>
              <AppText variant="captionStrong">Photos</AppText>
              <View style={styles.photoRow}>
                {images.map((uri) => (
                  <View key={uri} style={styles.thumbWrap}>
                    <SmartImage
                      uri={uri}
                      style={styles.thumb}
                      borderRadius={radii.md}
                      accessibilityLabel="Room photo"
                    />
                    <Pressable
                      onPress={() => removePhoto(uri)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                      style={({ pressed }) => [styles.thumbRemove, pressed && styles.pressed]}
                    >
                      <Ionicons name="close" size={13} color={colors.white} />
                    </Pressable>
                  </View>
                ))}

                {images.length < MAX_PHOTOS ? (
                  <Pressable
                    onPress={() => void pickPhotos()}
                    accessibilityRole="button"
                    accessibilityLabel="Add photo"
                    style={({ pressed }) => [styles.addPhoto, pressed && styles.pressed]}
                  >
                    <Ionicons name="camera-outline" size={20} color={colors.primary} />
                    <AppText variant="caption" color={colors.primary}>
                      Add photo
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
              <AppText variant="caption" color={colors.textMuted}>
                Up to {MAX_PHOTOS} pictures. Photos stay on this device.
              </AppText>
            </View>

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

            <TextField
              label="Nearest landmark"
              value={values.landmark}
              onChangeText={(value) => update('landmark', value)}
              placeholder="Shopping center, school, terminal"
              error={errors.landmark}
              autoCapitalize="words"
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
          </ScrollView>

          {/* Pinned actions: always reachable, even on a small phone. */}
          <View style={styles.footer}>
            <Button
              label={isEditing ? 'Save changes' : 'Add room'}
              icon={isEditing ? 'checkmark' : 'add'}
              isLoading={isSaving}
              onPress={() => void handleSubmit()}
              style={styles.footerPrimary}
            />
            <Button label="Cancel" variant="ghost" onPress={dismiss} style={styles.footerGhost} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 47, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetTitleBlock: { flex: 1, gap: 2 },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  fieldBlock: { gap: spacing.sm },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 76,
    height: 76,
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.dark ?? '#0A192F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  addPhoto: {
    width: 76,
    height: 76,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.surfaceMuted,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerPrimary: { flex: 1 },
  footerGhost: { minWidth: 96 },
  pressed: { opacity: 0.7 },
});
