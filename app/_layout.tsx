import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '@/providers/app-provider';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unavailable on this platform. Not worth surfacing.
});

/**
 * Root layout.
 *
 * Owns only global providers and the shared Stack. Route protection lives in
 * `app/(app)/_layout.tsx`, and `app/index.tsx` is the single place that decides
 * between the public, auth and app areas once the session has been restored.
 */
export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {
      // No splash screen on web; ignore.
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppProvider>
          <View style={styles.root}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'none' }} />
            </Stack>
          </View>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});