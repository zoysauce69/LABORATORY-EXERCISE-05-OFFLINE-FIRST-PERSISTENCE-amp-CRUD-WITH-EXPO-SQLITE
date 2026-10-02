import { View } from 'react-native';

import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { colors } from '@/theme';

/**
 * Landlord area.
 *
 * Mirrors the student guard: signed in, and actually a landlord. A student who
 * deep-links here is sent back to their own tabs rather than shown a broken
 * dashboard with no properties.
 */
export default function LandlordLayout() {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <LoadingState label="Loading" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (role !== 'landlord') {
    return <Redirect href="/(student)/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="property/[id]/index" />
      <Stack.Screen name="property/new" options={{ presentation: 'card' }} />
      <Stack.Screen name="property/[id]/edit" options={{ presentation: 'card' }} />
      <Stack.Screen name="booking/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="verification" options={{ presentation: 'card' }} />
      <Stack.Screen name="edit-profile" options={{ presentation: 'card' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
    </Stack>
  );
}