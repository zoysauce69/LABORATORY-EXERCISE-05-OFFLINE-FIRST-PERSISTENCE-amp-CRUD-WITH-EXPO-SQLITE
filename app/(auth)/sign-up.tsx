import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';

import { AuthShell } from '@/components/auth-shell';
import { PasswordField, PlainTextField } from '@/components/form-fields';
import { AppText, Button, InlineAlert } from '@/components/ui';
import { useAction } from '@/hooks/use-async-data';
import { authService } from '@/services/auth-service';
import { signUpSchema, type SignUpValues } from '@/utils/validation';
import { colors, radii, spacing } from '@/theme';

type RoleCardProps = {
  value: SignUpValues['role'];
  selected: boolean;
  onSelect: (value: SignUpValues['role']) => void;
  icon: 'search' | 'business';
  title: string;
  description: string;
};

function RoleCard({ value, selected, onSelect, icon, title, description }: RoleCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={() => onSelect(value)}
      style={({ pressed }) => [styles.roleCard, selected && styles.roleCardSelected, pressed && styles.pressed]}
    >
      <View style={[styles.roleIcon, selected && styles.roleIconSelected]}>
        <Ionicons name={icon} size={20} color={selected ? colors.textInverse : colors.textSecondary} />
      </View>
      <View style={styles.roleText}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption">{description}</AppText>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? colors.primary : colors.textMuted}
      />
    </Pressable>
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState,
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'student',
      businessName: undefined,
      acceptTerms: false,
    },
    mode: 'onSubmit',
  });

  const role = watch('role');
  const { run, isPending, error } = useAction(authService.signUp);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitted(true);

    const result = await run({
      email: values.email.trim().toLowerCase(),
      password: values.password,
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      role: values.role,
      businessName: values.role === 'landlord' ? values.businessName?.trim() || undefined : undefined,
    });

    if (!result.ok) {
      setSubmitted(false);
      return;
    }

    // Email confirmation is on, so the user cannot sign in until they click the
    // link. Say exactly that instead of bouncing them to an empty sign-in form.
    if (result.data.email_confirmed_at === null) {
      setNeedsEmailConfirmation(true);
      return;
    }

    router.replace('/');
  });

  if (needsEmailConfirmation) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="We sent a confirmation link to your email address. Open it to activate your account, then sign in."
        onBack={() => router.back()}
        backLabel="Back to sign in"
      >
        <InlineAlert
          tone="info"
          title="Nothing else to do yet"
          message="Your account has been created. It becomes active as soon as you confirm your email."
        />
        <Button
          label="Go to sign in"
          onPress={() => router.replace('/(auth)/sign-in')}
          fullWidth
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="RoomLink is free. Choose how you will use it."
      onBack={() => router.back()}
      backLabel="Sign in instead"
      footer={
        <AppText variant="caption" align="center" color={colors.textSecondary}>
          Already have an account?{' '}
          <Link href="/(auth)/sign-in" style={styles.link}>
            Sign in
          </Link>
        </AppText>
      }
    >
      <View style={styles.form}>
        <View style={styles.roleGroup}>
          <AppText variant="captionStrong">I am looking to…</AppText>

          <RoleCard
            value="student"
            selected={role === 'student'}
            onSelect={(value) => setValue('role', value, { shouldValidate: true })}
            icon="search"
            title="Find a room"
            description="Browse boarding houses, apply, and find a roommate."
          />
          <RoleCard
            value="landlord"
            selected={role === 'landlord'}
            onSelect={(value) => setValue('role', value, { shouldValidate: true })}
            icon="business"
            title="List a property"
            description="Publish listings and manage viewing and rental requests."
          />

          {submitted && formState.errors.role?.message ? (
            <AppText variant="caption" color={colors.danger}>
              {formState.errors.role.message}
            </AppText>
          ) : null}

          <AppText variant="caption" color={colors.textMuted}>
            Your account type is fixed at sign-up. This is what protects landlords from
            impersonation, so it cannot be changed later.
          </AppText>
        </View>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <PlainTextField
              label="Full name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Juan Dela Cruz"
              icon="person-outline"
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              required
              error={submitted ? formState.errors.fullName?.message : undefined}
            />
          )}
        />

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
              returnKeyType="next"
              required
              error={submitted ? formState.errors.email?.message : undefined}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <PlainTextField
              label="Mobile number"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="0917 123 4567"
              icon="call-outline"
              autoComplete="tel"
              keyboardType="phone-pad"
              returnKeyType="next"
              hint="Used by landlords to reach you about a request."
              required
              error={submitted ? formState.errors.phone?.message : undefined}
            />
          )}
        />

        {role === 'landlord' ? (
          <Controller
            control={control}
            name="businessName"
            render={({ field: { onChange, onBlur, value } }) => (
              <PlainTextField
                label="Business or owner name"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Dela Cruz Boarding House"
                icon="business-outline"
                autoCapitalize="words"
                returnKeyType="next"
                hint="Optional. You can add or change this later in your profile."
                error={submitted ? formState.errors.businessName?.message : undefined}
              />
            )}
          />
        ) : null}

        <PasswordField
          label="Password"
          name="password"
          control={control}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          returnKeyType="next"
          required
          hint="Must include at least one letter and one number."
          error={submitted ? formState.errors.password?.message : undefined}
        />

        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          control={control}
          placeholder="Type it again"
          autoComplete="new-password"
          returnKeyType="go"
          required
          onSubmitEditing={onSubmit}
          error={submitted ? formState.errors.confirmPassword?.message : undefined}
        />

        <Controller
          control={control}
          name="acceptTerms"
          render={({ field: { onChange, value } }) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: Boolean(value) }}
              accessibilityLabel="I accept the terms and privacy policy"
              onPress={() => onChange(!value)}
              style={styles.termsRow}
              hitSlop={8}
            >
              <Ionicons
                name={value ? 'checkbox' : 'square-outline'}
                size={20}
                color={value ? colors.primary : colors.textMuted}
              />
              <AppText variant="caption" style={{ flex: 1 }}>
                I accept RoomLink's terms of use and privacy policy, and I understand that
                landlords may contact me about a listing I apply to.
              </AppText>
            </Pressable>
          )}
        />
        {submitted && formState.errors.acceptTerms?.message ? (
          <AppText variant="caption" color={colors.danger}>
            {formState.errors.acceptTerms.message}
          </AppText>
        ) : null}

        {error ? <InlineAlert tone="danger" message={error} /> : null}

        <Button label="Create account" onPress={onSubmit} isLoading={isPending} fullWidth />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  roleGroup: { gap: spacing.sm },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 68,
  },
  roleCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconSelected: { backgroundColor: colors.primary },
  roleText: { flex: 1, gap: 1 },
  pressed: { opacity: 0.9 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  link: { color: colors.primary, fontWeight: '700' },
});