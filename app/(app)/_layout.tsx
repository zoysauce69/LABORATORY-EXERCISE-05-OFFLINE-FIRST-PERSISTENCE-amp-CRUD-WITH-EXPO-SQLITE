import { StyleSheet, View } from 'react-native';

import { Redirect, Stack } from 'expo-router';

import { ErrorState, LoadingState } from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { colors } from '@/theme';

/**
 * Signed-in area.
 *
 * The single guard for every authenticated route. An unsigned visitor who types
 * one of these paths lands on the landing page instead, and a signed-in user
 * never sees the public area's chrome.
 */
export default function AppLayout() {
  const { isLoading, isSignedIn, loadError, reload } = useApp();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingState label="Opening RoomLink" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <ErrorState
          title="We could not read your saved data"
          message={loadError}
          onRetry={() => {
            void reload();
          }}
        />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(public)/landing" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="room/[id]" />
      <Stack.Screen name="roommate/[id]" />
      <Stack.Screen name="applications" />
      <Stack.Screen name="messages/index" />
      <Stack.Screen name="messages/[id]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen
        name="add-room"
        options={{
          // Floating sheet: the screen behind stays visible under the overlay.
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      />
      <Stack.Screen name="manage-rooms" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="help" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});