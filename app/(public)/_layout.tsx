import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Public area.
 *
 * Signed-out surfaces only. `app/index.tsx` sends unauthenticated visitors
 * here, and `app/(app)/_layout.tsx` bounces them away if they reach an
 * authenticated route by typing it.
 */
export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="landing" />
    </Stack>
  );
}