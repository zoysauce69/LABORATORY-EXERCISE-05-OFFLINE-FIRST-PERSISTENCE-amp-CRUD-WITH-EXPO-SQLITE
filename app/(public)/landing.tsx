import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { colors, layout, radii, spacing } from '@/theme';

/**
 * Landing/Splash screen.
 *
 * Minimal, dark-first screen that matches the provided mockup: centered
 * RoomLink branding, a short value proposition, a primary Get Started
 * action, and a secondary Log In link. The flow stays Landing → Login → Home.
 */
export default function LandingScreen() {
  const router = useRouter();

  function goToSignIn() {
    router.push('/(auth)/sign-in');
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={styles.centerBlock}>
          <View style={styles.iconWrap}>
            <Ionicons name="home" size={28} color={colors.white} />
          </View>
          <AppText variant="display" color={colors.white} style={styles.appName}>
            RoomLink
          </AppText>
          <AppText variant="body" color={colors.textOnDarkMuted} style={styles.tagline}>
            Find Your Next Home
          </AppText>
        </View>

        <View style={styles.bottomBlock}>
          <AppText variant="body" color={colors.textOnDarkMuted} style={styles.proposition}>
            Rooms. Apartments. Roommates.
          </AppText>
          <AppText variant="body" color={colors.textOnDarkMuted} style={styles.proposition}>
            All in one place.
          </AppText>

          <Button
            label="Get Started"
            onPress={goToSignIn}
            style={styles.getStarted}
            size="lg"
            accessibilityRole="button"
            accessibilityLabel="Get started"
          />

          <Pressable
            onPress={goToSignIn}
            hitSlop={10}
            accessibilityRole="link"
            accessibilityLabel="Log in"
            style={({ pressed }) => [styles.logInWrap, pressed && styles.pressed]}
          >
            <AppText variant="body" color={colors.textOnDarkMuted} style={styles.logIn}>
              Log In
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  safe: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    justifyContent: 'space-between',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  appName: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tagline: {
    opacity: 0.85,
    marginTop: 2,
  },
  bottomBlock: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  proposition: {
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 22,
  },
  getStarted: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
  },
  logInWrap: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  logIn: {
    opacity: 0.9,
  },
  pressed: {
    opacity: 0.7,
  },
});
