import { View } from 'react-native';

import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { colors } from '@/theme';

/**
 * Signed-out area.
 *
 * Redirects an already-signed-in user to the tabs so the back stack can never
 * strand them on a sign-in screen, and blocks the group entirely until the
 * stored session has been read — otherwise a returning user would see a flash of
 * the sign-in form on cold start.
 */
export default function AuthLayout() {
  const { isLoading, isSignedIn } = useApp();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <LoadingState label="Checking your session" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" options={{ gestureEnabled: false }} />
    </Stack>
  );
}