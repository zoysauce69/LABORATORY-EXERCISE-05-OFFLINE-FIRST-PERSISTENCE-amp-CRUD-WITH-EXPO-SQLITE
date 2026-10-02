import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Controller, useForm, useWatch, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ScreenHeader } from '@/components/tab-screen-header';
import { DatePickerField } from '@/components/date-picker-field';
import {
  MoneyField,
  PlainSelectField,
  PlainTextField,
  ScaleField,
  SelectField,
  SwitchField,
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
import {
  DRINKING_OPTIONS,
  GUEST_OPTIONS,
  PET_OPTIONS,
  SLEEP_SCHEDULE_OPTIONS,
  SMOKING_OPTIONS,
  STUDY_HABIT_OPTIONS,
  cleanlinessLabel,
} from '@/constants/options';
import { cities } from '@/constants/locations';
import { useAuth } from '@/hooks/use-auth';
import { useAction } from '@/hooks/use-async-data';
import { roommateService } from '@/services/roommate-service';
import { fail, ok, type Result } from '@/lib/errors';
import {
  roommateProfileSchema,
  type RoommateProfileInput,
  type RoommateProfileValues,
} from '@/utils/validation';
import type { RoommateProfileRow } from '@/lib/database.types';
import { spacing } from '@/theme';

/**
 * Roommate profile editor.
 *
 * Every visible field is paired with a `share_*` flag because the database only
 * exposes these values to other users through SECURITY DEFINER RPCs that read
 * the consent columns first. A flag switched off here actually hides the value,
 * it is not a display preference.
 */
export default function EditRoommateProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const form = useForm<RoommateProfileInput, unknown, RoommateProfileValues>({
    resolver: zodResolver(roommateProfileSchema),
    mode: 'onBlur',
    defaultValues: blankValues(),
  });

  const { control, handleSubmit, reset, formState } = form;

  const [existing, setExisting] = useState<ExistingState>({
    isLoading: Boolean(user?.id),
    error: null,
  });

  useEffect(() => {
    if (!user) {
      setExisting({ isLoading: false, error: null });
      return;
    }

    let cancelled = false;
    setExisting({ isLoading: true, error: null });

    void roommateService.getMyProfile(user.id).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setExisting({ isLoading: false, error: result.error.message });
        return;
      }
      if (result.data) reset(toFormValues(result.data));
      setExisting({ isLoading: false, error: null });
    });

    return () => {
      cancelled = true;
    };
  }, [reset, user]);

  const saveState = useAction(async (values: RoommateProfileValues): Promise<Result<true>> => {
    if (!user) {
      return fail('Sign in again before saving your roommate profile.', 'not_signed_in');
    }

    const result = await roommateService.upsertProfile(user.id, {
      headline: values.headline.trim(),
      about: values.about?.trim() || null,
      occupation: values.occupation?.trim() || null,
      budget_min: values.budgetMin,
      budget_max: values.budgetMax,
      preferred_city: values.preferredCity?.trim() || null,
      preferred_barangay: values.preferredBarangay?.trim() || null,
      move_in_date: values.moveInDate || null,
      cleanliness: values.cleanliness,
      smoking_preference: values.smokingPreference,
      drinking_preference: values.drinkingPreference,
      pets_preference: values.petsPreference,
      guests_preference: values.guestsPreference,
      study_habits: values.studyHabits,
      sleep_schedule: values.sleepSchedule,
      is_active: values.isActive,
      discoverable: values.discoverable,
      share_budget: values.shareBudget,
      share_location: values.shareLocation,
      share_move_in_date: values.shareMoveInDate,
      share_lifestyle: values.shareLifestyle,
      share_occupation: values.shareOccupation,
    });

    if (!result.ok) return result;

    router.back();
    return ok(true);
  });

  const removeState = useAction(async (): Promise<Result<true>> => {
    if (!user) {
      return fail('Sign in again before removing your roommate profile.', 'not_signed_in');
    }

    const result = await roommateService.deleteProfile(user.id);
    if (!result.ok) return result;

    router.back();
    return ok(true);
  });

  const budgetMin = useWatch({ control, name: 'budgetMin' });
  const shareBudget = useWatch({ control, name: 'shareBudget' });
  const moveInDate = useWatch({ control, name: 'moveInDate' });

  const onSubmit = handleSubmit(async (values) => {
    await saveState.run(values);
  });

  if (existing.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your roommate profile" />
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
          <ScreenHeader title="Roommate profile" onBack={() => router.back()} />

          {existing.error ? <InlineAlert tone="danger" message={existing.error} /> : null}
          {saveState.error ? <InlineAlert tone="danger" message={saveState.error} /> : null}

          <InlineAlert
            tone="info"
            message="This profile is what other students see when you both have it switched on. Fill in only what you are comfortable sharing."
          />

          <TextField
            label="Headline"
            control={control}
            name="headline"
            maxLength={120}
            placeholder="IT student, early riser, keeps to myself on weekdays"
            required
            error={formState.errors.headline?.message}
          />

          <Controller
            control={control}
            name="about"
            render={({ field }) => (
              <PlainTextField
                label="About you"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                multiline
                numberOfLines={5}
                maxLength={800}
                placeholder="Study habits, routine, what you need from a housemate."
                error={formState.errors.about?.message}
              />
            )}
          />

          <Divider />

          <AppText variant="heading" accessibilityRole="header">
            Budget
          </AppText>

          <View style={styles.row}>
            <MoneyField
                  label="Minimum"
                  control={control}
                  name="budgetMin"
                  placeholder="2000"
                  containerStyle={styles.flex}
                  error={formState.errors.budgetMin?.message}
                />
            <MoneyField
                  label="Maximum"
                  control={control}
                  name="budgetMax"
                  placeholder="4500"
                  containerStyle={styles.flex}
                  error={formState.errors.budgetMax?.message}
                />
          </View>

          <Controller
            control={control}
            name="preferredCity"
            render={({ field }) => (
              <PlainSelectField
                label="Preferred city"
                value={field.value ?? ''}
                options={cities().map((city) => ({ value: city, label: city }))}
                onChange={field.onChange}
                searchable
                placeholder="No preference"
                error={formState.errors.preferredCity?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="preferredBarangay"
            render={({ field }) => (
              <PlainTextField
                label="Preferred barangay"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="words"
                placeholder="Anywhere in Quezon City"
                error={formState.errors.preferredBarangay?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="moveInDate"
            render={({ field }) => (
              <DatePickerField
                name="moveInDate"
                control={control as unknown as import('react-hook-form').Control<FieldValues>}
                label="Target move-in date"
                value={moveInDate ?? ''}
                onChange={field.onChange}
                error={formState.errors.moveInDate?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="occupation"
            render={({ field }) => (
              <PlainTextField
                label="Course or job"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                maxLength={120}
                placeholder="BS Computer Science, 3rd year"
                error={formState.errors.occupation?.message}
              />
            )}
          />

          <Divider />

          <AppText variant="heading" accessibilityRole="header">
            Living style
          </AppText>

          <ScaleField
            control={control}
            name="cleanliness"
            label="How tidy are you?"
            options={[1, 2, 3, 4, 5].map((value) => ({
              value,
              label: cleanlinessLabel(value),
            }))}
            error={formState.errors.cleanliness?.message}
          />

          <SelectField
            control={control}
            name="smokingPreference"
            label="Smoking"
            options={SMOKING_OPTIONS}
            error={formState.errors.smokingPreference?.message}
          />

          <SelectField
            control={control}
            name="drinkingPreference"
            label="Alcohol"
            options={DRINKING_OPTIONS}
            error={formState.errors.drinkingPreference?.message}
          />

          <SelectField
            control={control}
            name="petsPreference"
            label="Pets"
            options={PET_OPTIONS}
            error={formState.errors.petsPreference?.message}
          />

          <SelectField
            control={control}
            name="guestsPreference"
            label="Guests"
            options={GUEST_OPTIONS}
            error={formState.errors.guestsPreference?.message}
          />

          <SelectField
            control={control}
            name="studyHabits"
            label="Studying"
            options={STUDY_HABIT_OPTIONS}
            error={formState.errors.studyHabits?.message}
          />

          <SelectField
            control={control}
            name="sleepSchedule"
            label="Sleep schedule"
            options={SLEEP_SCHEDULE_OPTIONS}
            error={formState.errors.sleepSchedule?.message}
          />

          <Divider />

          <AppText variant="heading" accessibilityRole="header">
            What other students can see
          </AppText>
          <AppText variant="caption">
            These switches are enforced by the database. A field switched off is never sent to
            another user, whatever the app does.
          </AppText>

          <SwitchField
            control={control}
            name="discoverable"
            label="Appear in roommate search"
            description="Turn this off to take your profile down without deleting it."
          />

          <SwitchField control={control} name="shareBudget" label="Share my budget" />
          <SwitchField control={control} name="shareLocation" label="Share my preferred area" />
          <SwitchField control={control} name="shareMoveInDate" label="Share my move-in date" />
          <SwitchField control={control} name="shareLifestyle" label="Share my living style" />
          <SwitchField
            control={control}
            name="shareOccupation"
            label="Share my course or job"
            description="Off by default. Your course or employer is identifying."
          />

          {Number(budgetMin) > 0 && !shareBudget ? (
            <InlineAlert
              tone="warning"
              message="You entered a budget but sharing it is switched off, so it will not appear in search."
            />
          ) : null}

          <Divider />

          <Card style={styles.card}>
            <AppText variant="bodyStrong" accessibilityRole="header">
              Remove this profile
            </AppText>
            <AppText variant="caption">
              Deletes the roommate profile and stops you appearing in search. Requests already sent
              or received stay on record.
            </AppText>
            {removeState.error ? (
              <InlineAlert tone="danger" message={removeState.error} />
            ) : null}
            <Button
              label="Delete roommate profile"
              variant="outline"
              icon="trash-outline"
              isLoading={removeState.isPending}
              onPress={() => void removeState.run()}
            />
          </Card>
        </ScrollView>

        <View style={styles.actions}>
          <Button
            label="Save profile"
            style={styles.flex}
            isLoading={saveState.isPending}
            onPress={() => void onSubmit()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

interface ExistingState {
  isLoading: boolean;
  error: string | null;
}

function toFormValues(row: RoommateProfileRow): RoommateProfileValues {
  return {
    headline: row.headline ?? '',
    about: row.about ?? '',
    occupation: row.occupation ?? '',
    budgetMin: row.budget_min ?? 0,
    budgetMax: row.budget_max ?? 0,
    preferredCity: row.preferred_city ?? '',
    preferredBarangay: row.preferred_barangay ?? '',
    moveInDate: row.move_in_date ?? '',
    cleanliness: row.cleanliness,
    smokingPreference: row.smoking_preference,
    drinkingPreference: row.drinking_preference,
    petsPreference: row.pets_preference,
    guestsPreference: row.guests_preference,
    studyHabits: row.study_habits,
    sleepSchedule: row.sleep_schedule,
    isActive: row.is_active,
    discoverable: row.discoverable,
    shareBudget: row.share_budget,
    shareLocation: row.share_location,
    shareMoveInDate: row.share_move_in_date,
    shareLifestyle: row.share_lifestyle,
    shareOccupation: row.share_occupation,
  };
}

function blankValues(): RoommateProfileValues {
  return {
    headline: '',
    about: '',
    occupation: '',
    budgetMin: 0,
    budgetMax: 0,
    preferredCity: '',
    preferredBarangay: '',
    moveInDate: '',
    cleanliness: 3,
    smokingPreference: 'no_preference',
    drinkingPreference: 'no_preference',
    petsPreference: 'no_preference',
    guestsPreference: 'no_preference',
    studyHabits: 'no_preference',
    sleepSchedule: 'flexible',
    isActive: true,
    discoverable: true,
    shareBudget: true,
    shareLocation: true,
    shareMoveInDate: true,
    shareLifestyle: true,
    shareOccupation: false,
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  row: { flexDirection: 'row', gap: spacing.md },
  card: { padding: spacing.lg, gap: spacing.sm },
  actions: { padding: spacing.lg },
});