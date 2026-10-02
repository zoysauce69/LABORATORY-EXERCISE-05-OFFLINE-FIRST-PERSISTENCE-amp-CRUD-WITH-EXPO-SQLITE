import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui';
import { colors, radii, shadows, spacing } from '@/theme';

export interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Renders a back affordance in the header. */
  onBack?: () => void;
  backLabel?: string;
  scroll?: boolean;
}

/**
 * Shared chrome for every signed-out screen.
 *
 * Keeps the logo, headline and spacing identical across sign-in, sign-up and
 * password recovery so the flow feels like one surface.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  onBack,
  backLabel = 'Back',
  scroll = true,
}: AuthShellProps) {
  const body = (
    <View style={styles.content}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.back}
        >
          <AppText variant="bodyStrong" color={colors.primary}>
            {`← ${backLabel}`}
          </AppText>
        </Pressable>
      ) : null}

      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="home" size={26} color={colors.textInverse} />
        </View>
        <AppText variant="title">RoomLink</AppText>
      </View>

      <View style={styles.intro}>
        <AppText variant="display" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {children}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.giant },
  content: { flex: 1, gap: spacing.xl },
  back: { marginBottom: spacing.sm },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },
  intro: { gap: spacing.xs },
  footer: { marginTop: 'auto', paddingTop: spacing.xl, gap: spacing.md },
});