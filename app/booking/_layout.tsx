import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { colors } from '@/theme';

/**
 * Shared booking route.
 *
 * The student's booking request flow redirects here after a successful submit.
 * Signed-out visitors are sent to sign in; the screen itself decides what the
 * viewer is allowed to see.
 */
export default function BookingLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState label="Loading" />;
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}