import { View } from 'react-native';

import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { LoadingState } from '@/components/ui';
import { colors } from '@/theme';

/**
 * Signed-out area.
 *
 * Redirects an already-authenticated user back to their role's tabs so the back
 * stack can never leave them on a sign-in screen after signing in.
 */
export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <LoadingState label="Signing you in…" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" options={{ gestureEnabled: false }} />
    </Stack>
  );
}