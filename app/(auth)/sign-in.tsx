import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { AuthShell } from '@/components/auth-shell';
import { TextField } from '@/components/form-fields';
import { AppText, Button, InlineAlert } from '@/components/ui';
import { DEMO_CREDENTIALS_NOTE, DEMO_NOTICE_BODY } from '@/constants/demo';
import { useApp } from '@/hooks/use-app';
import { toMessage } from '@/lib/errors';
import { DEMO_CREDENTIALS } from '@/lib/mock-data';
import { colors, radii, spacing } from '@/theme';
import { signInSchema, type SignInValues } from '@/utils/validation';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useApp();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: SignInValues) {
    setFormError(null);

    const result = await signIn(values.email, values.password);
    if (!result.ok) {
      setFormError(toMessage(result.error, 'We could not sign you in.'));
      // Put the failure next to the field it is about rather than only at the
      // top of the form.
      if (result.error.code === 'invalid_credentials') {
        setError('password', { message: 'That password does not match this email.' });
      }
      return;
    }

    router.replace('/(app)/(tabs)');
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see the rooms and roommates that match you."
      footer={
        <AppText variant="body" align="center">
          New to RoomLink?{' '}
          <Pressable
            onPress={() => router.push('/(auth)/sign-up')}
            accessibilityRole="link"
            accessibilityLabel="Create an account"
          >
            <AppText variant="bodyStrong" color={colors.primary}>
              Create an account
            </AppText>
          </Pressable>
        </AppText>
      }
    >
      <InlineAlert tone="info" title="Demo app" message={DEMO_NOTICE_BODY} />

      <View style={styles.demoBox}>
        <View style={styles.demoHeader}>
          <Ionicons name="flash" size={16} color={colors.primary} />
          <AppText variant="captionStrong" color={colors.primary}>
            Try the demo account
          </AppText>
        </View>
        <AppText variant="caption">{DEMO_CREDENTIALS_NOTE}</AppText>
        <Button
          label="Use the demo account"
          variant="secondary"
          size="sm"
          icon="flash"
          onPress={() => {
            // Signing straight in is one tap and beats filling in a form that is
            // already printed on screen.
            void signIn(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password).then((result) => {
              if (result.ok) router.replace('/(app)/(tabs)');
              else setFormError(toMessage(result.error));
            });
          }}
          style={styles.demoButton}
        />
      </View>

      {formError ? <InlineAlert tone="danger" message={formError} /> : null}

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
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.password?.message}
            placeholder="Your password"
            icon="lock-closed-outline"
            secureTextEntry
            required
            returnKeyType="go"
            onSubmitEditing={() => void handleSubmit(onSubmit)()}
          />
        )}
      />

      <Pressable
        onPress={() => router.push('/(auth)/forgot-password')}
        accessibilityRole="link"
        accessibilityLabel="Forgot your password"
        style={styles.forgotLink}
      >
        <AppText variant="captionStrong" color={colors.primary}>
          Forgot your password?
        </AppText>
      </Pressable>

      <Button
        label="Sign in"
        onPress={() => void handleSubmit(onSubmit)()}
        isLoading={isSubmitting}
        fullWidth
        size="lg"
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  forgotLink: { alignSelf: 'flex-end', paddingVertical: spacing.xs },
  demoBox: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    backgroundColor: colors.primarySoft,
  },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  demoButton: { alignSelf: 'flex-start', marginTop: spacing.xs },
});