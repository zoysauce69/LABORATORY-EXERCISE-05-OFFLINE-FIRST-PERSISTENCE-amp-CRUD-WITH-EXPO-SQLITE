import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { AuthShell } from '@/components/auth-shell';
import { TextField } from '@/components/form-fields';
import { AppText, Button, InlineAlert } from '@/components/ui';
import { toMessage } from '@/lib/errors';
import { requestPasswordReset } from '@/services/auth-service';
import { colors, radii, spacing } from '@/theme';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/utils/validation';

interface IssuedCode {
  email: string;
  code: string;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedCode | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);

    const result = await requestPasswordReset(values.email);
    if (!result.ok) {
      setFormError(toMessage(result.error, 'We could not send a reset code.'));
      return;
    }

    setIssued({ email: result.data.email, code: result.data.code });
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you signed up with and we will show you the code."
      onBack={() => router.back()}
      backLabel="Back to sign in"
    >
      {formError ? <InlineAlert tone="danger" message={formError} /> : null}

      {issued ? (
        <View style={styles.codeBox}>
          <View style={styles.codeHeader}>
            <Ionicons name="key" size={16} color={colors.success} />
            <AppText variant="captionStrong" color={colors.success}>
              Your reset code
            </AppText>
          </View>
          <AppText variant="caption">
            A real app would email this. This one has no server, so here it is:
          </AppText>
          <AppText variant="display" align="center" style={styles.code}>
            {issued.code}
          </AppText>
          <Button
            label="Enter this code"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/(auth)/reset-password',
                params: { email: issued.email, code: issued.code },
              })
            }
          />
        </View>
      ) : (
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Email"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.email?.message}
              placeholder="you@example.com"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              required
              returnKeyType="go"
              onSubmitEditing={() => void handleSubmit(onSubmit)()}
            />
          )}
        />
      )}

      {!issued ? (
        <Button
          label="Send reset code"
          onPress={() => void handleSubmit(onSubmit)()}
          isLoading={isSubmitting}
          fullWidth
          size="lg"
        />
      ) : null}

      <Button
        label="Resend code"
        variant="ghost"
        size="sm"
        onPress={() => {
          setIssued(null);
          setFormError(null);
          void handleSubmit(onSubmit)();
        }}
        disabled={!getValues('email')}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.successSoftBorder,
    backgroundColor: colors.successSoft,
  },
  codeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  code: { letterSpacing: 8, marginVertical: spacing.sm },
});