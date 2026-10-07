import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { AuthShell } from '@/components/auth-shell';
import { TextField } from '@/components/form-fields';
import { Button, InlineAlert } from '@/components/ui';
import { toMessage } from '@/lib/errors';
import { requestPasswordReset, resetPassword } from '@/services/auth-service';
import { DEMO_CREDENTIALS } from '@/lib/mock-data';
import { resetPasswordSchema, type ResetPasswordValues } from '@/utils/validation';

export default function ResetPasswordScreen() {
  const router = useRouter();
  // Both are filled in by the forgot-password screen. `code` is prefilled with
  // the value that screen already displayed, so the common path is one tap.
  const params = useLocalSearchParams<{ email?: string; code?: string }>();

  const [email] = useState(params.email ?? DEMO_CREDENTIALS.email);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: params.code ?? '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);

    const result = await resetPassword(email, values.code, values.password);
    if (!result.ok) {
      setFormError(toMessage(result.error, 'We could not reset your password.'));
      return;
    }

    setDone(true);
    // Straight to sign-in: the account exists and the new password is now the
    // only way in, so staying here would just be a dead end.
    setTimeout(() => {
      router.replace('/(auth)/sign-in');
    }, 1200);
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={
        done
          ? 'Password updated. Taking you back to sign in…'
          : `Use the code we sent to ${email}.`
      }
    >
      {done ? (
        <InlineAlert
          tone="success"
          title="Password updated"
          message="Sign in with your new password."
        />
      ) : (
        <>
          {formError ? <InlineAlert tone="danger" message={formError} /> : null}

          <Controller
            control={control}
            name="code"
            render={({ field }) => (
              <TextField
                label="Reset code"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.code?.message}
                placeholder="123456"
                icon="key-outline"
                keyboardType="number-pad"
                maxLength={6}
                required
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                label="New password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
                placeholder="At least 8 characters"
                icon="lock-closed-outline"
                secureTextEntry
                required
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <TextField
                label="Confirm new password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.confirmPassword?.message}
                placeholder="Type it again"
                icon="lock-closed-outline"
                secureTextEntry
                required
                returnKeyType="go"
                onSubmitEditing={() => void handleSubmit(onSubmit)()}
              />
            )}
          />

          <Button
            label="Update password"
            onPress={() => void handleSubmit(onSubmit)()}
            isLoading={isSubmitting}
            fullWidth
            size="lg"
          />

          <Button
            label="I did not get a code"
            variant="ghost"
            size="sm"
            icon="refresh-outline"
            onPress={() => {
              // No inbox to go back to, so resend straight from here.
              void requestPasswordReset(email).then((result) => {
                if (result.ok) setValue('code', result.data.code);
              });
            }}
          />
        </>
      )}
    </AuthShell>
  );
}