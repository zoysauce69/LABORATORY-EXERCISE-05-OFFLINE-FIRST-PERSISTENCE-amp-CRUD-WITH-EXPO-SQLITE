import { View } from 'react-native';

import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { colors } from '@/theme';

/**
 * Student area.
 *
 * Enforces two things the tabs cannot: the visitor must be signed in, and the
 * account must actually be a student. A landlord who deep-links into a student
 * route is sent to their own dashboard instead of seeing a broken screen.
 */
export default function StudentLayout() {
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

  if (role !== 'student') {
    return <Redirect href="/(landlord)/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="property/[id]" />
      <Stack.Screen name="booking/request/[propertyId]" />
      <Stack.Screen name="roommate/[id]" />
      <Stack.Screen name="saved-roommates" options={{ presentation: 'card' }} />
      <Stack.Screen name="roommate-requests" options={{ presentation: 'card' }} />
      <Stack.Screen name="edit-profile" options={{ presentation: 'card' }} />
      <Stack.Screen name="edit-roommate-profile" options={{ presentation: 'card' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
    </Stack>
  );
}