import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ScreenHeader } from '@/components/tab-screen-header';
import {
  PlainSelectField,
  PlainTextField,
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
import { cities } from '@/constants/locations';
import { useAuth } from '@/hooks/use-auth';
import { useAction, useAsyncData } from '@/hooks/use-async-data';
import { imageService } from '@/services/image-service';
import { profileService } from '@/services/profile-service';
import { fail, ok, type Result } from '@/lib/errors';
import {
  landlordContactSchema,
  profileSchema,
  type LandlordContactValues,
  type ProfileValues,
} from '@/utils/validation';
import type { UserRole } from '@/lib/database.types';
import { spacing } from '@/theme';

/**
 * Profile editor shared by both roles.
 *
 * The form is split into two writes on purpose: `profiles` holds the
 * public-safe fields a landlord publishes, while `profile_private_details`
 * holds the phone, address and institution that are never readable by anyone
 * but their owner. Merging them would put private data behind the same policy
 * as public data.
 */
export function ProfileEditor({ role }: { role: UserRole }) {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const isLandlord = role === 'landlord';

  const me = useAsyncData(
    async () => (user ? profileService.getMyProfile(user.id) : ok(null)),
    [user?.id],
    { enabled: Boolean(user) },
  );

  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues: blankProfileValues(),
  });

  const landlordForm = useForm<LandlordContactValues>({
    resolver: zodResolver(landlordContactSchema),
    mode: 'onBlur',
    defaultValues: {
      businessName: '',
      publicPhone: '',
      publicEmail: '',
      bio: '',
      isPublic: false,
    },
  });

  const { control: profileControl, handleSubmit, reset, setValue, formState } = profileForm;
  const { control: landlordControl, reset: resetLandlord, getValues: getLandlordValues } = landlordForm;

  // Seed once the record arrives. `reset` replaces the whole default set so a
  // previous account's values can never linger in the form.
  useEffect(() => {
    if (!me.data) return;
    const { profile, privateDetails } = me.data;
    const city = privateDetails?.city ?? '';
    const institutionKind = privateDetails?.institution_kind ?? undefined;

    reset({
      fullName: profile.full_name,
      phone: privateDetails?.phone ?? '',
      bio: profile.bio ?? '',
      city,
      barangay: privateDetails?.barangay ?? '',
      addressLine: privateDetails?.address_line ?? '',
      institutionName: privateDetails?.institution_name ?? '',
      institutionKind: institutionKind ?? undefined,
      emergencyContactName: privateDetails?.emergency_contact_name ?? '',
      emergencyContactPhone: privateDetails?.emergency_contact_phone ?? '',
    });

    resetLandlord({
      businessName: profile.business_name ?? '',
      publicPhone: profile.public_phone ?? '',
      publicEmail: profile.public_email ?? '',
      bio: profile.bio ?? '',
      isPublic: profile.is_public,
    });
  }, [me.data, reset, resetLandlord]);

  const saveState = useAction(
    async (
      values: ProfileValues,
      landlordValues: LandlordContactValues,
    ): Promise<Result<true>> => {
      if (!user) {
        return fail('Sign in again before saving your profile.', 'not_signed_in');
      }

      const publicResult = await profileService.updatePublicProfile(user.id, {
        full_name: values.fullName.trim(),
        bio: values.bio?.trim() || null,
        ...(isLandlord
          ? {
              business_name: landlordValues.businessName.trim(),
              public_phone: landlordValues.publicPhone.trim(),
              public_email: landlordValues.publicEmail?.trim() || null,
              is_public: landlordValues.isPublic,
            }
          : {}),
      });

      if (!publicResult.ok) return publicResult;

      const privateResult = await profileService.updatePrivateDetails(user.id, {
        phone: values.phone.trim(),
        city: values.city?.trim() || null,
        barangay: values.barangay?.trim() || null,
        address_line: values.addressLine?.trim() || null,
        institution_name: values.institutionName?.trim() || null,
        institution_kind: values.institutionKind ?? null,
        emergency_contact_name: values.emergencyContactName?.trim() || null,
        emergency_contact_phone: values.emergencyContactPhone?.trim() || null,
      });

      if (!privateResult.ok) {
        // The public half saved. Say so instead of silently discarding it.
        return fail(
          `Your public details were saved, but your private details were not: ${privateResult.error.message}`,
          'partial_save',
        );
      }

      await refreshProfile();
      return ok(true);
    },
  );

  const onSubmit = handleSubmit(async (values) => {
    const landlordValues = getLandlordValues();
    const result = await saveState.run(values, landlordValues);
    if (result.ok) router.back();
  });

  const changeAvatar = async () => {
    setAvatarMessage(null);
    const picked = await imageService.pickFromLibrary(1);
    if (!picked.ok) {
      setAvatarMessage(picked.error.message);
      return;
    }
    const asset = picked.data[0];
    if (!asset) return;

    const uploaded = await imageService.uploadAvatar(user?.id ?? '', asset);
    if (!uploaded.ok) {
      setAvatarMessage(uploaded.error.message);
      return;
    }

    const saved = await profileService.updatePublicProfile(user?.id ?? '', {
      avatar_url: uploaded.data,
    });
    if (saved.ok) await refreshProfile();
    else setAvatarMessage(saved.error.message);
  };

  if (me.isInitialLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your profile" />
      </Screen>
    );
  }

  if (me.error || !me.data) {
    return (
      <Screen>
        <ScreenHeader title="Edit profile" onBack={() => router.back()} />
        <InlineAlert
          tone="danger"
          title="Profile unavailable"
          message={me.error ?? 'We could not load your profile. Try again in a moment.'}
        />
      </Screen>
    );
  }

  const { profile, privateDetails } = me.data;

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="Edit profile" onBack={() => router.back()} />

          <Card style={styles.card}>
            <View style={styles.avatarRow}>
              <AppText variant="bodyStrong">Profile photo</AppText>
              <Button label="Change" variant="outline" size="sm" icon="camera-outline" onPress={() => void changeAvatar()} />
            </View>
            {avatarMessage ? <InlineAlert tone="danger" message={avatarMessage} /> : null}
          </Card>

          {saveState.error ? <InlineAlert tone="danger" message={saveState.error} /> : null}

          <Controller
            control={profileControl}
            name="fullName"
            render={({ field }) => (
              <TextField
                label="Full name"
                control={profileControl}
                name="fullName"
                autoCapitalize="words"
                required
                error={formState.errors.fullName?.message}
              />
            )}
          />

          <Controller
            control={profileControl}
            name="phone"
            render={({ field }) => (
              <TextField
                label="Mobile number"
                control={profileControl}
                name="phone"
                keyboardType="phone-pad"
                placeholder="0917 000 0000"
                required
                hint="Never shown to other users. Used only for urgent account notices."
                error={formState.errors.phone?.message}
              />
            )}
          />

          <Controller
            control={profileControl}
            name="bio"
            render={({ field }) => (
              <PlainTextField
                label="Short bio"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                multiline
                numberOfLines={3}
                maxLength={500}
                placeholder={isLandlord ? 'How you house tenants, and what to expect.' : 'A line about you.'}
                error={formState.errors.bio?.message}
              />
            )}
          />

          <Divider />

          <AppText variant="heading" accessibilityRole="header">
            Where you are
          </AppText>
          <AppText variant="caption">
            Private. RoomLink uses this to sort listings by distance; nobody else sees it.
          </AppText>

          <Controller
            control={profileControl}
            name="city"
            render={({ field }) => (
              <PlainSelectField
                label="City"
                value={field.value ?? ''}
                options={cities().map((city) => ({ value: city, label: city }))}
                onChange={field.onChange}
                searchable
                placeholder="Select a city"
                error={formState.errors.city?.message}
              />
            )}
          />

          <Controller
            control={profileControl}
            name="barangay"
            render={({ field }) => (
              <PlainTextField
                label="Barangay"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="words"
                placeholder="Commonwealth"
                error={formState.errors.barangay?.message}
              />
            )}
          />

          <Controller
            control={profileControl}
            name="addressLine"
            render={({ field }) => (
              <PlainTextField
                label="Street address"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                maxLength={200}
                placeholder="18 Katipunan Avenue"
                error={formState.errors.addressLine?.message}
              />
            )}
          />

          {!isLandlord ? (
            <>
              <Divider />
              <AppText variant="heading" accessibilityRole="header">
                School or workplace
              </AppText>
              <AppText variant="caption">
                Distances in search are measured from here, so set it once and stop guessing.
              </AppText>

              <Controller
                control={profileControl}
                name="institutionName"
                render={({ field }) => (
                  <PlainTextField
                    label="Name"
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="UP Diliman"
                    error={formState.errors.institutionName?.message}
                  />
                )}
              />

              <Controller
                control={profileControl}
                name="institutionKind"
                render={({ field }) => (
                  <PlainSelectField
                    label="Type"
                    value={field.value ?? ''}
                    options={[
                      { value: 'school', label: 'School' },
                      { value: 'workplace', label: 'Workplace' },
                    ]}
                    onChange={(next) => field.onChange(next)}
                    placeholder="School or workplace"
                    error={formState.errors.institutionKind?.message}
                  />
                )}
              />
            </>
          ) : null}

          {isLandlord ? (
            <>
              <Divider />
              <AppText variant="heading" accessibilityRole="header">
                Listing contact
              </AppText>

              <Controller
                control={landlordControl}
                name="businessName"
                render={({ field }) => (
                  <PlainTextField
                    label="Business or owner name"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Sun Realty"
                    required
                    error={landlordForm.formState.errors.businessName?.message}
                  />
                )}
              />

              <Controller
                control={landlordControl}
                name="publicPhone"
                render={({ field }) => (
                  <PlainTextField
                    label="Public mobile number"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    keyboardType="phone-pad"
                    placeholder="0917 000 0000"
                    required
                    error={landlordForm.formState.errors.publicPhone?.message}
                  />
                )}
              />

              <Controller
                control={landlordControl}
                name="publicEmail"
                render={({ field }) => (
                  <PlainTextField
                    label="Public email"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="leasing@example.com"
                    error={landlordForm.formState.errors.publicEmail?.message}
                  />
                )}
              />

              <SwitchField
                control={landlordControl}
                name="isPublic"
                label="Show my contact details on listings"
                description="Renters see them only after they send you a request."
              />
            </>
          ) : null}

          <Divider />

          <AppText variant="heading" accessibilityRole="header">
            Emergency contact
          </AppText>
          <AppText variant="caption">
            Private. Used by RoomLink support if we need to reach you in an emergency.
          </AppText>

          <Controller
            control={profileControl}
            name="emergencyContactName"
            render={({ field }) => (
              <PlainTextField
                label="Contact name"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="Maria dela Cruz"
                error={formState.errors.emergencyContactName?.message}
              />
            )}
          />

          <Controller
            control={profileControl}
            name="emergencyContactPhone"
            render={({ field }) => (
              <PlainTextField
                label="Contact number"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="phone-pad"
                placeholder="0918 000 0000"
                error={formState.errors.emergencyContactPhone?.message}
              />
            )}
          />

          {privateDetails?.email ? (
            <AppText variant="caption">
              Signed in as {privateDetails.email}. Email changes go through the password reset
              flow so we can verify the new address.
            </AppText>
          ) : null}

          {profile.verification_status === 'verified' ? (
            <InlineAlert
              tone="success"
              message="Your identity is verified. This is managed by RoomLink support and cannot be edited here."
            />
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          <Button
            label="Save changes"
            style={styles.flex}
            isLoading={saveState.isPending}
            onPress={() => void onSubmit()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function blankProfileValues(): ProfileValues {
  return {
    fullName: '',
    phone: '',
    bio: '',
    city: '',
    barangay: '',
    addressLine: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  card: { padding: spacing.lg, gap: spacing.md },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actions: { padding: spacing.lg },
});