import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';

import { AuthShell } from '@/components/auth-shell';
import { PlainTextField } from '@/components/form-fields';
import { AppText, Button, InlineAlert } from '@/components/ui';
import { useAction } from '@/hooks/use-async-data';
import { authService } from '@/services/auth-service';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/utils/validation';
import { colors, spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const { run, isPending, error } = useAction(async (email: string) =>
    authService.requestPasswordReset(
      email,
      Linking.createURL('/reset-password'),
    ),
  );

  const onSubmit = handleSubmit(async ({ email }) => {
    const result = await run(email.trim().toLowerCase());
    if (result.ok) setSent(true);
  });

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="If that address has a RoomLink account, a password reset link is on its way."
        onBack={() => router.replace('/(auth)/sign-in')}
        backLabel="Back to sign in"
      >
        <InlineAlert
          tone="info"
          title="Link expires in one hour"
          message="Open the link on this device to choose a new password. If nothing arrives, check your spam folder."
        />
        <Button label="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} fullWidth />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email address you signed up with and we will send you a reset link."
      onBack={() => router.back()}
      backLabel="Back to sign in"
    >
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <PlainTextField
              label="Email address"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="you@example.com"
              icon="mail-outline"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              required
              error={formState.errors.email?.message}
            />
          )}
        />

        {error ? <InlineAlert tone="danger" message={error} /> : null}

        <Button label="Send reset link" onPress={onSubmit} isLoading={isPending} fullWidth />

        <AppText variant="caption" align="center" color={colors.textMuted}>
          For your security we show the same confirmation whether or not the address is registered.
        </AppText>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
});