import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Controller, useForm, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ScreenHeader } from '@/components/tab-screen-header';
import { DatePickerField } from '@/components/date-picker-field';
import {
  MoneyField,
  NumberField,
  PlainSelectField,
  PlainTextField,
  SegmentedField,
  SelectField,
  TextField,
} from '@/components/form-fields';
import {
  AppText,
  Button,
  Card,
  ChipGroup,
  Divider,
  ErrorState,
  InlineAlert,
  LoadingState,
  Screen,
} from '@/components/ui';
import { GENDER_PREFERENCE_OPTIONS, PROPERTY_TYPE_OPTIONS } from '@/constants/options';
import { barangaysFor, cities } from '@/constants/locations';
import { useAuth } from '@/hooks/use-auth';
import { useAction, useAsyncData } from '@/hooks/use-async-data';
import { imageService } from '@/services/image-service';
import { fail, ok, type Result } from '@/lib/errors';
import { propertyService } from '@/services/property-service';
import type { AmenityRow, PropertyRow } from '@/lib/database.types';
import {
  canPublishProperty,
  propertySchema,
  validateBarangayForCity,
  type PropertyFormInput,
  type PropertyFormValues,
} from '@/utils/validation';
import { colors, radii, spacing } from '@/theme';

export interface PropertyEditorProps {
  /** Undefined creates a new listing; defined loads it for editing. */
  propertyId?: string;
}

/**
 * Create / edit form for a landlord listing.
 *
 * One component serves both flows so the validation rules, particularly the
 * publish requirements, cannot drift apart between "new" and "edit".
 */
export function PropertyEditor({ propertyId }: PropertyEditorProps) {
  const router = useRouter();
  const { user } = useAuth();
  /** Narrowed once so no call site needs a cast to satisfy the service types. */
  const editingId = propertyId ?? '';
  const isEditing = editingId.length > 0;

  const amenities = useAsyncData(async () => propertyService.listAmenities(), []);

  const existing = useAsyncData(
    async () => (editingId ? propertyService.getById(editingId) : ok(null)),
    [editingId],
    { enabled: isEditing },
  );

  const [seeded, setSeeded] = useState(!isEditing);

  const form = useForm<PropertyFormInput, unknown, PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    mode: 'onBlur',
    defaultValues: emptyPropertyValues(),
  });

  const { control, handleSubmit, reset, setValue, watch, formState } = form;

  // Seed once. `reset` replaces the whole default set, so no field can keep a
  // stale value from a previous listing.
  useEffect(() => {
    if (seeded || !existing.data) return;
    reset(toFormValues(existing.data.property, existing.data.amenities.map((a) => a.id)));
    setSeeded(true);
  }, [existing.data, reset, seeded]);

  const saveState = useAction(
    async (values: PropertyFormValues, publish: boolean): Promise<Result<{ id: string }>> => {
      if (!user) {
        return fail('Sign in again before saving this listing.', 'not_signed_in');
      }

      const payload = {
        title: values.title.trim(),
        description: values.description.trim(),
        property_type: values.propertyType,
        monthly_rent: values.monthlyRent,
        advance_amount: values.advanceAmount,
        other_fees: values.otherFees ?? [],
        city: values.city,
        barangay: values.barangay.trim(),
        address_line: values.addressLine?.trim() || null,
        landmark: values.landmark?.trim() || null,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        nearby_schools: values.nearbySchools ?? [],
        nearby_workplaces: values.nearbyWorkplaces ?? [],
        total_units: values.totalUnits,
        occupied_units: values.occupiedUnits,
        gender_preference: values.genderPreference,
        available_from: values.availableFrom || null,
        virtual_tour_url: values.virtualTourUrl ?? null,
        is_featured: false,
        status: publish ? ('published' as const) : ('draft' as const),
      };

      const saved = isEditing
        ? await propertyService.update(editingId, payload)
        : await propertyService.create({ ...payload, landlord_id: user.id });

      if (!saved.ok) return saved;

      const amenitiesSaved = await propertyService.setAmenities(saved.data.id, values.amenityIds);
      if (!amenitiesSaved.ok) {
        // The listing row exists but the amenity links did not save. Report the
        // partial write rather than navigating away as if all of it succeeded.
        return fail(
          `The listing was saved, but its amenities were not: ${amenitiesSaved.error.message}`,
          'partial_save',
        );
      }

      return ok({ id: saved.data.id });
    },
  );

  const save = saveState.run;
  const status = watch('status');
  const city = watch('city');
  const values = watch();
  const publishCheck = canPublishProperty({
    description: String(values.description ?? ''),
    landmark: values.landmark,
    addressLine: values.addressLine,
    totalUnits: Number(values.totalUnits ?? 0),
    occupiedUnits: Number(values.occupiedUnits ?? 0),
    amenityIds: values.amenityIds ?? [],
  });

  const onSubmit = handleSubmit(async (formValues) => {
    const result = await save(formValues, formValues.status === 'published');
    if (!result.ok) return;

    router.replace(
      isEditing ? `/(landlord)/property/${result.data.id}/edit` : '/(landlord)/(tabs)/listings',
    );
  });

  const saveDraft = handleSubmit(async (formValues) => {
    const result = await save({ ...formValues, status: 'draft' }, false);
    if (!result.ok) return;
    if (!isEditing) router.replace('/(landlord)/(tabs)/listings');
  });

  if (isEditing && existing.isInitialLoading) {
    return (
      <Screen>
        <LoadingState label="Loading listing…" />
      </Screen>
    );
  }

  // Never fall through to an empty form when the listing could not be read:
  // saving that would silently overwrite the landlord's real data with blanks.
  if (isEditing && existing.error) {
    return (
      <Screen>
        <ScreenHeader title="Edit listing" onBack={() => router.back()} />
        <ErrorState
          title="This listing could not be loaded"
          message={existing.error}
          onRetry={existing.reload}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={isEditing ? 'Edit listing' : 'New listing'}
            onBack={() => router.back()}
            action={
              isEditing ? (
                <Button
                  label="Preview"
                  variant="ghost"
                  size="sm"
                  onPress={() => router.push(`/(landlord)/property/${editingId}`)}
                />
              ) : null
            }
          />

          {existing.error ? <InlineAlert tone="danger" message={existing.error} /> : null}
          {saveState.error ? <InlineAlert tone="danger" message={saveState.error} /> : null}

          <TextField
            label="Listing title"
            control={control}
            name="title"
            placeholder="Sun Realty Boarding House"
            maxLength={120}
            required
            error={formState.errors.title?.message}
          />

          <SegmentedField
            label="Property type"
            control={control}
            name="propertyType"
            options={PROPERTY_TYPE_OPTIONS}
            error={formState.errors.propertyType?.message}
          />

          <TextField
            label="Description"
            control={control}
            name="description"
            placeholder="Describe the rooms, the neighbourhood, who you usually house, and what the space is like."
            multiline
            numberOfLines={6}
            maxLength={4000}
            required
            hint="At least 20 characters so renters can judge the place fairly."
            error={formState.errors.description?.message}
          />

          {isEditing && existing.data ? (
            <ExistingPhotos propertyId={editingId} />
          ) : null}

          <Divider />

          <AppText variant="heading" accessibilityRole="header">
            Location
          </AppText>

          <PlainSelectField
            label="City"
            value={city}
            options={cities().map((c) => ({ value: c, label: c }))}
            onChange={(next) => {
              setValue('city', next, { shouldValidate: true });
              setValue('barangay', '');
            }}
            placeholder="Select a city"
            searchable
            required
            error={formState.errors.city?.message}
          />

          <Controller
            control={control}
            name="barangay"
            render={({ field: { onChange, onBlur, value } }) => (
              <PlainTextField
                label="Barangay"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Commonwealth"
                autoCapitalize="words"
                required
                hint={
                  city && barangaysFor(city).length > 0
                    ? `Common: ${barangaysFor(city).slice(0, 4).join(', ')}`
                    : undefined
                }
                error={
                  validateBarangayForCity(city, value) === null
                    ? formState.errors.barangay?.message
                    : undefined
                }
              />
            )}
          />

          <Controller
            control={control}
            name="landmark"
            render={({ field: { onChange, onBlur, value } }) => (
              <PlainTextField
                label="Landmark"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Near Ateneo de Manila, five minutes walk"
                maxLength={120}
                hint="Helps renters find the right gate. Required to publish."
                error={formState.errors.landmark?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="addressLine"
            render={({ field: { onChange, onBlur, value } }) => (
              <PlainTextField
                label="Street address"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="18 Katipunan Avenue"
                maxLength={200}
                hint="Shared only with renters who send a request."
                error={formState.errors.addressLine?.message}
              />
            )}
          />

          <Divider />

          <AppText variant="heading" accessibilityRole="header">
            Rent and costs
          </AppText>

          <View style={styles.row}>
            <MoneyField
              label="Monthly rent"
              control={control}
              name="monthlyRent"
              placeholder="3500"
              required
              containerStyle={styles.flex}
              error={formState.errors.monthlyRent?.message}
            />
            <MoneyField
              label="Advance"
              control={control}
              name="advanceAmount"
              placeholder="3500"
              containerStyle={styles.flex}
              error={formState.errors.advanceAmount?.message}
            />
          </View>

          <Controller
            control={control}
            name="otherFees"
            render={({ field: { onChange, value } }) => (
              <OtherFeesField fees={value ?? []} onChange={onChange} />
            )}
          />

          <Divider />

          <AppText variant="heading" accessibilityRole="header">
            Capacity
          </AppText>

          <View style={styles.row}>
            <NumberField
              label="Total units"
              control={control}
              name="totalUnits"
              placeholder="1"
              containerStyle={styles.flex}
              error={formState.errors.totalUnits?.message}
            />
            <NumberField
              label="Occupied"
              control={control}
              name="occupiedUnits"
              placeholder="0"
              containerStyle={styles.flex}
              error={formState.errors.occupiedUnits?.message}
            />
          </View>

          <Controller
            control={control}
            name="availableFrom"
            render={({ field: { onChange, value } }) => (
              <DatePickerField
                name="availableFrom"
                control={control as unknown as import('react-hook-form').Control<FieldValues>}
                label="Available from"
                value={value ?? ''}
                onChange={onChange}
                required={status === 'published'}
                hint="Required to publish."
                error={formState.errors.availableFrom?.message}
              />
            )}
          />

          <SelectField
            label="Who can rent"
            control={control}
            name="genderPreference"
            options={GENDER_PREFERENCE_OPTIONS}
            hint="Advisory. RoomLink publishes it so renters know in advance."
            error={formState.errors.genderPreference?.message}
          />

          <Controller
            control={control}
            name="virtualTourUrl"
            render={({ field: { onChange, onBlur, value } }) => (
              <PlainTextField
                label="Virtual tour link"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="https://…"
                autoCapitalize="none"
                keyboardType="url"
                hint="Optional."
                error={formState.errors.virtualTourUrl?.message}
              />
            )}
          />

          <Divider />

          <AppText variant="heading" accessibilityRole="header">
            Amenities
          </AppText>

          <Controller
            control={control}
            name="amenityIds"
            render={({ field: { onChange, value } }) => (
              <AmenityPicker
                amenities={amenities.data ?? []}
                isLoading={amenities.isInitialLoading}
                selected={value ?? []}
                onChange={onChange}
              />
            )}
          />

          <Divider />

          <Controller
            control={control}
            name="status"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">Publish this listing</AppText>
                  <AppText variant="caption">Published listings appear in student search immediately.</AppText>
                </View>
                <Switch
                  value={value === 'published'}
                  onValueChange={(checked) => onChange(checked ? 'published' : 'draft')}
                  accessibilityLabel="Publish this listing"
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  thumbColor={value === 'published' ? colors.primary : colors.surface}
                />
              </View>
            )}
          />

          {status === 'published' && !publishCheck.ok ? (
            <InlineAlert tone="warning" title="Not ready to publish" message={publishCheck.reason ?? ''} />
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          <Button
            label="Save draft"
            variant="outline"
            style={styles.flex}
            onPress={() => void saveDraft()}
            isLoading={saveState.isPending}
          />
          <Button
            label={isEditing ? 'Save changes' : 'Publish listing'}
            style={styles.flex}
            onPress={() => void onSubmit()}
            isLoading={saveState.isPending}
            disabled={status === 'published' && !publishCheck.ok}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function AmenityPicker({
  amenities,
  isLoading,
  selected,
  onChange,
}: {
  amenities: AmenityRow[];
  isLoading: boolean;
  selected: number[];
  onChange: (next: number[]) => void;
}) {
  if (isLoading) return <LoadingState label="Loading amenities…" compact />;

  return (
    <ChipGroup
      multiple
      label="Included with the rent"
      options={amenities.map((amenity) => ({ value: amenity.id, label: amenity.label }))}
      selected={selected}
      onToggle={(id) => {
        onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);
      }}
      helperText="Only tick what you can guarantee. Renters rely on this list."
    />
  );
}

interface FeeDraft {
  label: string;
  amount: number;
  recurring: boolean;
}

function OtherFeesField({
  fees,
  onChange,
}: {
  fees: FeeDraft[];
  onChange: (next: FeeDraft[]) => void;
}) {
  const add = () => onChange([...fees, { label: '', amount: 0, recurring: true }]);

  const update = (index: number, patch: Partial<FeeDraft>) =>
    onChange(fees.map((fee, i) => (i === index ? { ...fee, ...patch } : fee)));

  const remove = (index: number) => onChange(fees.filter((_, i) => i !== index));

  return (
    <Card style={styles.feesCard}>
      <View style={styles.feesHeader}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Other monthly charges</AppText>
          <AppText variant="caption">
            Water, electricity, parking, Wi-Fi, anything else you bill separately.
          </AppText>
        </View>
        <Button label="Add" variant="ghost" size="sm" icon="add" onPress={add} />
      </View>

      {fees.map((fee, index) => (
        <View key={`fee-${index}`} style={styles.feeRow}>
          <PlainTextField
            label="Charge"
            value={fee.label}
            onChangeText={(text) => update(index, { label: text })}
            placeholder="Water"
            containerStyle={styles.feeLabel}
          />
          <PlainTextField
            label="Amount"
            value={fee.amount === 0 ? '' : String(fee.amount)}
            onChangeText={(text) =>
              update(index, { amount: Number(text.replace(/[^\d]/g, '')) || 0 })
            }
            keyboardType="numeric"
            inputMode="numeric"
            prefix="₱"
            placeholder="0"
            containerStyle={styles.feeAmount}
          />
          <Button
            label=""
            variant="ghost"
            size="sm"
            icon="trash-outline"
            onPress={() => remove(index)}
            accessibilityLabel={`Remove ${fee.label || 'charge'}`}
          />
        </View>
      ))}
    </Card>
  );
}

/**
 * Photo manager for an existing listing.
 *
 * Uploads go through `imageService` and the rows through `propertyService`, and
 * the strip re-reads from the database afterwards so what is on screen is
 * always what was actually persisted.
 */
function ExistingPhotos({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const images = useAsyncData(async () => propertyService.listImages(propertyId), [propertyId]);

  const actionState = useAction(
    async (mode: 'add' | 'remove', imageId?: string): Promise<Result<boolean>> => {
      if (mode === 'remove') {
        const target = (images.data ?? []).find((image) => image.id === imageId);
        return propertyService.removeImage(imageId ?? '', target?.storage_path ?? null);
      }

      if (!user) {
        return fail('Sign in again before changing the photos on this listing.', 'not_signed_in');
      }

      const picked = await imageService.pickFromLibrary(5);
      if (!picked.ok) return picked;
      // Cancelling the picker is a success, not a failure.
      if (picked.data.length === 0) return ok(false);

      const paths: string[] = [];
      for (const asset of picked.data) {
        const uploaded = await imageService.uploadPropertyImage(user.id, asset);
        if (!uploaded.ok) {
          // Stop at the first failure so a partial set never looks complete.
          return uploaded;
        }
        paths.push(uploaded.data);
      }

      const saved = await propertyService.addImages(propertyId, paths);
      if (!saved.ok) return saved;

      await images.reload();
      return ok(true);
    },
  );

  const action = actionState.run;

  if (images.isInitialLoading) return <LoadingState label="Loading photos…" compact />;

  const rows = images.data ?? [];

  return (
    <Card style={styles.feesCard}>
      <View style={styles.feesHeader}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Photos</AppText>
          <AppText variant="caption">
            {rows.length === 0
              ? 'Listings with three or more photos get noticeably more requests.'
              : `${rows.length} attached. The first photo is the cover.`}
          </AppText>
        </View>
        <Button
          label="Add"
          variant="ghost"
          size="sm"
          icon="add"
          isLoading={actionState.isPending}
          onPress={() => void action('add')}
        />
      </View>

      {actionState.error ? (
        <InlineAlert tone="danger" message={actionState.error} />
      ) : null}

      {rows.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photos}
        >
          {rows.map((image, index) => {
            const url = imageService.publicUrl(image.storage_path, image.is_uploaded);
            return (
              <View key={image.id} style={styles.photo}>
                {url ? (
                  <Image
                    source={{ uri: url }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={120}
                  />
                ) : null}
                {index === 0 ? (
                  <View style={styles.photoCover}>
                    <AppText variant="overline" color={colors.surface}>
                      Cover
                    </AppText>
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  disabled={actionState.isPending}
                  onPress={() => void action('remove', image.id)}
                  style={styles.photoRemove}
                >
                  <Ionicons name="close" size={14} color={colors.surface} />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      <Button
        label="Preview listing"
        variant="ghost"
        size="sm"
        icon="eye-outline"
        onPress={() => router.push(`/(landlord)/property/${propertyId}`)}
      />
    </Card>
  );
}

function emptyPropertyValues(): PropertyFormInput {
  return {
    title: '',
    propertyType: 'boarding_house',
    description: '',
    monthlyRent: 0,
    advanceAmount: 0,
    otherFees: [],
    city: '',
    barangay: '',
    landmark: '',
    addressLine: '',
    nearbySchools: [],
    nearbyWorkplaces: [],
    totalUnits: 1,
    occupiedUnits: 0,
    genderPreference: 'any',
    availableFrom: '',
    amenityIds: [],
    status: 'draft',
  };
}

function toFormValues(property: PropertyRow, amenityIds: number[]): PropertyFormInput {
  return {
    title: property.title,
    propertyType: property.property_type,
    description: property.description,
    monthlyRent: property.monthly_rent,
    advanceAmount: property.advance_amount,
    otherFees: property.other_fees ?? [],
    city: property.city,
    barangay: property.barangay,
    landmark: property.landmark ?? '',
    addressLine: property.address_line ?? '',
    nearbySchools: property.nearby_schools ?? [],
    nearbyWorkplaces: property.nearby_workplaces ?? [],
    totalUnits: property.total_units,
    occupiedUnits: property.occupied_units,
    genderPreference: property.gender_preference as 'any' | 'female_only' | 'male_only',
    availableFrom: property.available_from ?? '',
    amenityIds,
    status: property.status,
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  row: { flexDirection: 'row', gap: spacing.md },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  feesCard: { padding: spacing.md, gap: spacing.md, marginTop: spacing.xs },
  feesHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feeLabel: { flex: 2 },
  feeAmount: { flex: 1 },
  photos: { gap: spacing.sm, paddingVertical: spacing.xs },
  photo: {
    width: 76,
    height: 76,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  photoRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  photoCover: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
});