import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthShell } from '@/components/auth-shell';
import { PasswordField } from '@/components/form-fields';
import { AppText, Button, InlineAlert } from '@/components/ui';
import { useAction } from '@/hooks/use-async-data';
import { authService } from '@/services/auth-service';
import { supabase } from '@/lib/supabase';
import { resetPasswordSchema, type ResetPasswordValues } from '@/utils/validation';
import { colors, spacing } from '@/theme';

/**
 * Password reset landing screen.
 *
 * The recovery link signs the user in through a `PASSWORD_RECOVERY` event, so by
 * the time this screen renders there should already be a session. If there is
 * not, the link was opened on a different device or has expired, and we say so
 * rather than silently failing on submit.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const {
    control,
    handleSubmit,
    formState,
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const { run, isPending, error } = useAction(authService.updatePassword);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });
  }, []);

  const onSubmit = handleSubmit(async ({ password }) => {
    const result = await run(password);
    if (result.ok) router.replace('/');
  });

  if (hasSession === false) {
    return (
      <AuthShell
        title="This link is no longer valid"
        subtitle="Reset links work once and expire after an hour."
        footer={
          <Button
            label="Request a new link"
            onPress={() => router.replace('/(auth)/forgot-password')}
            fullWidth
          />
        }
      >
        <InlineAlert
          tone="warning"
          title="Open the link on the same device"
          message="For security, password reset links only work in the browser or app where they were opened."
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Pick something you have not used before.">
      <View style={styles.form}>
        <PasswordField
          label="New password"
          name="password"
          control={control}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          returnKeyType="next"
          required
          hint="Must include at least one letter and one number."
          error={formState.errors.password?.message}
        />

        <PasswordField
          label="Confirm new password"
          name="confirmPassword"
          control={control}
          placeholder="Type it again"
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          required
          error={formState.errors.confirmPassword?.message}
        />

        {error ? <InlineAlert tone="danger" message={error} /> : null}

        <Button label="Update password" onPress={onSubmit} isLoading={isPending} fullWidth />

        <AppText variant="caption" align="center" color={colors.textMuted}>
          Updating your password signs you out on every other device.
        </AppText>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
});