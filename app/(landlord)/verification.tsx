import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ScreenHeader } from '@/components/tab-screen-header';
import { PlainSelectField, PlainTextField, SwitchField, TextField } from '@/components/form-fields';
import {
  AppText,
  Button,
  Card,
  Divider,
  EmptyState,
  InlineAlert,
  LoadingState,
  Screen,
} from '@/components/ui';
import { VerificationStatusBadge } from '@/components/status-badge';
import { verificationSummary } from '@/constants/options';
import { useAuth } from '@/hooks/use-auth';
import { useAction, useAsyncData } from '@/hooks/use-async-data';
import { imageService, readAsBase64 } from '@/services/image-service';
import { verificationService } from '@/services/verification-service';
import { verificationSchema, type VerificationValues } from '@/utils/validation';
import { fail, ok, type Result } from '@/lib/errors';
import type { VerificationStatus } from '@/lib/database.types';
import { formatDateTime } from '@/utils/format';
import { colors, spacing } from '@/theme';

/**
 * Landlord identity verification.
 *
 * Verification is deliberately one-way: the app can submit and display, but only
 * the `admin_review_verification` RPC can decide, and that RPC refuses to review
 * an applicant who is also the reviewer. There is no cancel path either, because
 * a withdrawn request would leave a half-reviewed trail.
 */
export default function VerificationScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const history = useAsyncData(
    async () => (user ? verificationService.listForLandlord(user.id) : ok([])),
    [user?.id],
    { enabled: Boolean(user) },
  );

  const [documentPath, setDocumentPath] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  const form = useForm<VerificationValues>({
    resolver: zodResolver(verificationSchema),
    mode: 'onBlur',
    defaultValues: {
      fullLegalName: '',
      address: '',
      idType: 'philippine_id',
      idNumberLast4: '',
      submittedNotes: '',
      acceptedAccuracy: false,
    },
  });

  const { control, handleSubmit, reset, setValue, formState } = form;

  // Only prefill the name; the address and ID details are always re-entered so a
  // stale submission can never be resubmitted by accident.
  useEffect(() => {
    if (profile) setValue('fullLegalName', profile.full_name, { shouldValidate: false });
  }, [profile, setValue]);

  const attachDocument = async () => {
    if (!user) return;

    setDocumentError(null);

    const picked = await imageService.pickFromLibrary(1);
    if (!picked.ok) {
      setDocumentError(picked.error.message);
      return;
    }

    const asset = picked.data[0];
    if (!asset) return;

    setIsAttaching(true);
    try {
      const encoded = await readAsBase64(asset.uri);
      if (!encoded.ok) {
        setDocumentError(encoded.error.message);
        return;
      }

      const uploaded = await verificationService.uploadDocument(
        user.id,
        asset.fileName ?? 'id.jpg',
        encoded.data,
      );
      if (!uploaded.ok) {
        setDocumentError(uploaded.error.message);
        return;
      }

      setDocumentPath(uploaded.data);
      setDocumentName(asset.fileName ?? 'id.jpg');
    } finally {
      setIsAttaching(false);
    }
  };

  const submitState = useAction(async (values: VerificationValues): Promise<Result<true>> => {
    if (!user) {
      return fail('Sign in again before submitting for review.', 'not_signed_in');
    }

    const result = await verificationService.submit(user.id, {
      fullLegalName: values.fullLegalName.trim(),
      address: values.address.trim(),
      idType: values.idType,
      idNumberLast4: values.idNumberLast4.trim().toUpperCase(),
      submittedNotes: values.submittedNotes?.trim() || undefined,
      documentStoragePath: documentPath ?? undefined,
    });

    if (!result.ok) return result;

    reset({
      fullLegalName: values.fullLegalName,
      address: '',
      idType: 'philippine_id',
      idNumberLast4: '',
      submittedNotes: '',
      acceptedAccuracy: false,
    });
    setDocumentPath(null);
    setDocumentName(null);
    setDocumentError(null);

    await history.reload();
    return ok(true);
  });

  const onSubmit = handleSubmit(async (values) => {
    await submitState.run(values);
  });

  if (history.isInitialLoading) {
    return (
      <Screen>
        <LoadingState label="Loading verification status" />
      </Screen>
    );
  }

  const rows = history.data ?? [];
  const latest = rows[0] ?? null;
  const hasPending = rows.some((row) => row.status === 'pending');
  const status = (profile?.verification_status ?? 'pending') as VerificationStatus;
  const summary = verificationSummary(status);

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
          <ScreenHeader title="Verification" onBack={() => router.back()} />

          <Card style={styles.card}>
            <View style={styles.head}>
              <AppText variant="title" accessibilityRole="header">
                Identity status
              </AppText>
              <VerificationStatusBadge status={status} />
            </View>
            <AppText variant="body">{summary.message}</AppText>
            {summary.nextStep ? (
              <AppText variant="caption" color={colors.textMuted}>
                {summary.nextStep}
              </AppText>
            ) : null}
          </Card>

          {history.error ? (
            <InlineAlert tone="danger" message={history.error} />
          ) : null}

          {submitState.error ? <InlineAlert tone="danger" message={submitState.error} /> : null}

          {hasPending ? (
            <InlineAlert
              tone="info"
              title="Submission under review"
              message="You can only have one request in review at a time. We will notify you as soon as an admin decides."
            />
          ) : null}

          {latest && latest.status === 'rejected' && latest.review_notes ? (
            <InlineAlert
              tone="warning"
              title="Reviewer note"
              message={latest.review_notes}
              actionLabel="Fix and resubmit below"
              onAction={() => {}}
            />
          ) : null}

          {rows.length > 0 ? (
            <Card style={styles.card}>
              <AppText variant="heading" accessibilityRole="header">
                Submission history
              </AppText>
              {rows.map((row, index) => (
                <View key={row.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.historyRow}>
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong">{row.id_type.replace(/_/g, ' ')}</AppText>
                      <AppText variant="caption">Submitted {formatDateTime(row.created_at)}</AppText>
                    </View>
                    <VerificationStatusBadge status={row.status} compact />
                  </View>
                  {row.review_notes ? (
                    <AppText variant="caption">{row.review_notes}</AppText>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : (
            <EmptyState
              icon="shield-checkmark-outline"
              title="No submissions yet"
              message="Verified landlords get a tick on their listings, which renters filter for."
            />
          )}

          {hasPending ? null : (
            <>
              <Divider />

              <AppText variant="heading" accessibilityRole="header">
                {latest ? 'Resubmit' : 'Submit for review'}
              </AppText>
              <AppText variant="caption">
                A RoomLink admin reads this. We store only the last few characters of your ID and
                keep the document in a private bucket that is never publicly readable.
              </AppText>

              <Controller
                control={control}
                name="fullLegalName"
                render={({ field }) => (
                  <TextField
                    label="Full legal name"
                    control={control}
                    name="fullLegalName"
                    autoCapitalize="words"
                    required
                    error={formState.errors.fullLegalName?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="address"
                render={({ field }) => (
                  <PlainTextField
                    label="Complete residential address"
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    multiline
                    numberOfLines={3}
                    maxLength={300}
                    placeholder="18 Katipunan Avenue, Commonwealth, Quezon City"
                    required
                    error={formState.errors.address?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="idType"
                render={({ field }) => (
                  <PlainSelectField
                    label="Type of ID"
                    value={field.value}
                    options={[
                      { value: 'philippine_id', label: 'PhilSys ID' },
                      { value: 'passport', label: 'Passport' },
                      { value: 'drivers_license', label: "Driver's licence" },
                      { value: 'other', label: 'Other government ID' },
                    ]}
                    onChange={field.onChange}
                    required
                    error={formState.errors.idType?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="idNumberLast4"
                render={({ field }) => (
                  <PlainTextField
                    label="Last 2 to 4 characters of the ID number"
                    value={field.value ?? ''}
                    onChangeText={(text) => field.onChange(text.toUpperCase())}
                    onBlur={field.onBlur}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={4}
                    placeholder="1234"
                    required
                    hint="Never enter the whole number. We do not store it."
                    error={formState.errors.idNumberLast4?.message}
                  />
                )}
              />

              <Card style={styles.docCard}>
                <AppText variant="bodyStrong">ID document</AppText>
                <AppText variant="caption">
                  Optional, but a photo of the ID speeds up the review considerably.
                </AppText>
                {documentName ? (
                  <AppText variant="body" color={colors.success}>
                    Attached: {documentName}
                  </AppText>
                ) : null}
                {documentError ? (
                  <InlineAlert tone="danger" message={documentError} />
                ) : null}
                <Button
                  label={documentName ? 'Choose a different photo' : 'Attach a photo'}
                  variant="outline"
                  icon="camera-outline"
                  isLoading={isAttaching}
                  onPress={() => void attachDocument()}
                />
              </Card>

              <Controller
                control={control}
                name="submittedNotes"
                render={({ field }) => (
                  <PlainTextField
                    label="Anything the reviewer should know"
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    multiline
                    numberOfLines={3}
                    maxLength={1000}
                    placeholder="Optional. For example, the name on your ID differs from your profile name."
                    error={formState.errors.submittedNotes?.message}
                  />
                )}
              />

              <SwitchField
                control={control}
                name="acceptedAccuracy"
                label="The details above are accurate"
                description="Submitting false information gets an account suspended."
                error={formState.errors.acceptedAccuracy?.message}
              />
            </>
          )}
        </ScrollView>

        {hasPending ? null : (
          <View style={styles.actions}>
            <Button
              label="Submit for review"
              style={styles.flex}
              isLoading={submitState.isPending}
              onPress={() => void onSubmit()}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  card: { padding: spacing.lg, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  docCard: { padding: spacing.lg, gap: spacing.sm },
  actions: { padding: spacing.lg },
});