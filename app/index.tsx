import { StyleSheet, View } from 'react-native';

import { Redirect } from 'expo-router';

import { AppText, Button, ErrorState, LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { authService } from '@/services/auth-service';
import { usePushRegistration } from '@/hooks/use-notifications';
import { colors, spacing } from '@/theme';

/**
 * Entry point.
 *
 * Decides where to send the user once the persisted session has been restored,
 * and registers for push once we know who they are. Nothing renders until
 * `isLoading` is false so the app never flashes the wrong role's screens.
 */
export default function Index() {
  const { user, profile, role, isLoading, configured, profileError, refreshProfile } = useAuth();

  // Registering for push here means the permission prompt appears once, on the
  // first authenticated render, rather than on whichever tab happens to mount.
  usePushRegistration(user?.id, Boolean(user));

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingState label="Getting things ready…" />
      </View>
    );
  }

  if (!configured) {
    return <ConfigurationNotice />;
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // A session without a profile means signup is still propagating, or RLS denied
  // the read. Say so instead of bouncing the user between tabs forever.
  if (profileError || !profile || !role) {
    return (
      <View style={styles.container}>
        <ErrorState
          title="We could not load your profile"
          message={profileError ?? 'Your profile is still being created. Please try again in a moment.'}
          onRetry={() => {
            void refreshProfile();
          }}
        />
        <Button
          label="Sign out"
          variant="ghost"
          size="sm"
          onPress={() => {
            void authService.signOut();
          }}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    );
  }

  return <Redirect href={role === 'landlord' ? '/(landlord)/(tabs)' : '/(student)/(tabs)'} />;
}

function ConfigurationNotice() {
  return (
    <View style={[styles.container, styles.notice]}>
      <AppText variant="title" align="center">
        Connect a database to continue
      </AppText>
      <AppText variant="body" align="center" color={colors.textSecondary}>
        RoomLink needs a Supabase project before it can load listings.
      </AppText>
      <AppText variant="caption" align="center">
        Copy <AppText variant="captionStrong">.env.example</AppText> to{' '}
        <AppText variant="captionStrong">.env.local</AppText>, fill in{' '}
        <AppText variant="captionStrong">EXPO_PUBLIC_SUPABASE_URL</AppText> and{' '}
        <AppText variant="captionStrong">EXPO_PUBLIC_SUPABASE_ANON_KEY</AppText>, apply the migrations in{' '}
        <AppText variant="captionStrong">supabase/migrations</AppText>, then restart the dev server.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  notice: { padding: spacing.xl, gap: spacing.md },
});