import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@/providers/auth-provider';
import { colors } from '@/theme';
import { seedDemoDataIfNeeded } from '@/lib/seed-demo-data';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unavailable on this platform. Not worth surfacing.
});

/**
 * Root layout.
 *
 * Owns only global providers and the shared Stack. All navigation is handled by
 * `app/index.tsx`, which decides between the signed-out, student and landlord
 * areas once the session has been restored.
 */
export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {
      // Splash screen is not present on web; ignore.
    });
    void seedDemoDataIfNeeded();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
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
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});