import { useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm, useWatch, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ScreenHeader } from '@/components/tab-screen-header';
import { DatePickerField } from '@/components/date-picker-field';
import {
  NumberField,
  PlainSelectField,
  PlainTextField,
  TextField,
} from '@/components/form-fields';
import {
  AppText,
  Button,
  Card,
  Divider,
  InlineAlert,
  LoadingState,
  Screen,
} from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useAction, useAsyncData } from '@/hooks/use-async-data';
import { bookingService } from '@/services/booking-service';
import { fail, ok, type Result } from '@/lib/errors';
import { propertyService } from '@/services/property-service';
import {
  VISIT_TIME_SLOTS,
  bookingRequestSchema,
  type BookingRequestInput,
  type BookingRequestValues,
} from '@/utils/validation';
import { formatMonthlyRent } from '@/utils/format';
import { colors, spacing } from '@/theme';

/**
 * Applications carry no scheduled slot, but the `bookings` table requires one.
 * A far-future sentinel satisfies the constraint and is hidden everywhere the
 * date is rendered.
 */
const APPLICATION_SENTINEL_DATE = '2999-12-31';
const APPLICATION_SENTINEL_TIME = '00:00:00';

/**
 * Create a viewing request or a rental application.
 *
 * Both kinds share one screen because they share a table and a form; the only
 * difference is which half of the form is shown. Contact details are captured
 * here rather than read from the profile because a renter may want to use a
 * different number for a specific landlord.
 */
export default function BookingRequestScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const params = useLocalSearchParams<{ propertyId: string; kind?: string }>();
  const propertyId = typeof params.propertyId === 'string' ? params.propertyId : '';
  const kind = params.kind === 'application' ? ('application' as const) : ('visit' as const);

  const property = useAsyncData(
    async () => (propertyId ? propertyService.getById(propertyId) : ok(null)),
    [propertyId],
    { enabled: propertyId.length > 0 },
  );

  const existing = useAsyncData(
    async () => (user && propertyId ? bookingService.hasActiveRequest(user.id, propertyId) : ok(null)),
    [user?.id, propertyId],
    { enabled: Boolean(user && propertyId) },
  );

  const form = useForm<BookingRequestInput, unknown, BookingRequestValues>({
    resolver: zodResolver(bookingRequestSchema),
    mode: 'onBlur',
    defaultValues: {
      kind,
      scheduledDate: '',
      scheduledTime: '',
      moveInDate: '',
      occupants: 1,
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      note: '',
    },
  });

  const { control, handleSubmit, setValue, formState } = form;

  const scheduledDate = useWatch({ control, name: 'scheduledDate' });
  const moveInDate = useWatch({ control, name: 'moveInDate' });

  // Prefill from the profile so the renter only corrects what actually changed.
  useEffect(() => {
    if (!profile) return;
    setValue('contactName', profile.full_name, { shouldValidate: false });
    setValue('contactEmail', user?.email ?? '', { shouldValidate: false });
  }, [profile, setValue, user?.email]);

  const submitState = useAction(
    async (values: BookingRequestValues): Promise<Result<{ id: string }>> => {
      if (!user || propertyId.length === 0) {
        return fail('This request link is missing the details needed to send it.', 'missing_id');
      }

      const isVisit = values.kind === 'visit';

      return bookingService.create({
        propertyId,
        requesterId: user.id,
        kind: values.kind,
        scheduledDate: isVisit ? values.scheduledDate : APPLICATION_SENTINEL_DATE,
        scheduledTime: isVisit ? values.scheduledTime : APPLICATION_SENTINEL_TIME,
        contactName: values.contactName.trim(),
        contactPhone: values.contactPhone.trim(),
        contactEmail: values.contactEmail?.trim() || undefined,
        note: values.note?.trim() || undefined,
        moveInDate: isVisit ? undefined : values.moveInDate,
        occupants: isVisit ? undefined : values.occupants,
      });
    },
  );

  const onSubmit = handleSubmit(async (values) => {
    const result = await submitState.run(values);
    if (result.ok) {
      Alert.alert(
        'Success',
        'Thank you, Carl Louise! Your request has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.replace(`/booking/${result.data.id}`),
          },
        ]
      );
    }
  });

  if (property.isInitialLoading) {
    return (
      <Screen>
        <LoadingState label="Loading listing" />
      </Screen>
    );
  }

  if (property.error || !property.data) {
    return (
      <Screen>
        <ScreenHeader title="Send a request" onBack={() => router.back()} />
        <InlineAlert
          tone="danger"
          title="Listing unavailable"
          message={property.error ?? 'This listing is no longer accepting requests.'}
        />
      </Screen>
    );
  }

  const listing = property.data?.property;

  if (existing.data !== null) {
    return (
      <Screen>
        <ScreenHeader title="Send a request" onBack={() => router.back()} />
        <View style={styles.content}>
          <Card style={styles.card}>
            <AppText variant="subheading" accessibilityRole="header">
              You already have a live request here
            </AppText>
            <AppText variant="caption">
              RoomLink keeps one open request per listing so a landlord is not flooded with
              duplicates. Follow it from your bookings tab, or cancel it there to send a new one.
            </AppText>
            <Button
              label="Go to my bookings"
              onPress={() => router.replace('/(student)/(tabs)/bookings')}
            />
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={kind === 'visit' ? 'Request a viewing' : 'Apply to rent'}
            onBack={() => router.back()}
          />

          <Card style={styles.card}>
            <AppText variant="bodyStrong" numberOfLines={2}>
              {listing.title}
            </AppText>
            <AppText variant="caption">
              {listing.barangay}, {listing.city} · {formatMonthlyRent(listing.monthly_rent)}
            </AppText>
          </Card>

          {submitState.error ? <InlineAlert tone="danger" message={submitState.error} /> : null}

          {kind === 'visit' ? (
            <>
              <Controller
                control={control}
                name="scheduledDate"
                render={({ field: { onChange } }) => (
                  <DatePickerField
                    name="scheduledDate"
                    control={control as unknown as import('react-hook-form').Control<FieldValues>}
                    label="Visit date"
                    value={scheduledDate}
                    onChange={onChange}
                    required
                    minimumDate={new Date()}
                    error={formState.errors.scheduledDate?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="scheduledTime"
                render={({ field: { onChange, value } }) => (
                  <PlainSelectField
                    label="Preferred time"
                    value={value}
                    options={VISIT_TIME_SLOTS.map((slot) => ({
                      value: slot.value,
                      label: slot.label,
                    }))}
                    onChange={onChange}
                    required
                    error={formState.errors.scheduledTime?.message}
                  />
                )}
              />

              <InlineAlert
                tone="info"
                message="The landlord approves your slot or proposes another. You will see the change in your bookings tab."
              />
            </>
          ) : (
            <>
              <Controller
                control={control}
                name="moveInDate"
                render={({ field: { onChange } }) => (
                  <DatePickerField
                    name="moveInDate"
                    control={control as unknown as import('react-hook-form').Control<FieldValues>}
                    label="Intended move-in date"
                    value={moveInDate}
                    onChange={onChange}
                    required
                    minimumDate={new Date()}
                    error={formState.errors.moveInDate?.message}
                  />
                )}
              />

              <NumberField
                    label="How many people will live there?"
                    control={control}
                    name="occupants"
                    placeholder="1"
                    required
                    error={formState.errors.occupants?.message}
                  />
            </>
          )}

          <Divider />

          <AppText variant="heading" accessibilityRole="header">
            How the landlord reaches you
          </AppText>
          <AppText variant="caption">
            These details travel with this request only. They are never published on your profile.
          </AppText>

          <Controller
            control={control}
            name="contactName"
            render={({ field }) => (
              <TextField
                label="Full name"
                control={control}
                name="contactName"
                autoCapitalize="words"
                placeholder="Juan dela Cruz"
                required
                error={formState.errors.contactName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="contactPhone"
            render={({ field }) => (
              <TextField
                label="Mobile number"
                control={control}
                name="contactPhone"
                keyboardType="phone-pad"
                placeholder="0917 000 0000"
                required
                hint="Used only to arrange viewings."
                error={formState.errors.contactPhone?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="contactEmail"
            render={({ field }) => (
              <TextField
                label="Email"
                control={control}
                name="contactEmail"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="you@example.com"
                error={formState.errors.contactEmail?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="note"
            render={({ field }) => (
              <PlainTextField
                label="Message to the landlord"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                multiline
                numberOfLines={4}
                maxLength={1000}
                placeholder="Optional. Anything they should know before meeting."
                hint="This is a one-time message, not a chat. RoomLink has no messaging feature."
              />
            )}
          />
        </ScrollView>

        <View style={styles.actions}>
          <Button
            label={kind === 'visit' ? 'Send viewing request' : 'Send application'}
            style={styles.flex}
            isLoading={submitState.isPending}
            onPress={() => void onSubmit()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  card: { padding: spacing.lg, gap: spacing.xs },
  actions: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});