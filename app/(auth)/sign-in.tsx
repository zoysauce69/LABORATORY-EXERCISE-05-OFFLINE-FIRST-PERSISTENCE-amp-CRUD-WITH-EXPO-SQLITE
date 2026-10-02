import { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppText, Button } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { spacing, radii, palette } from '@/theme';

const BG = '#0F2554';
const TEXT_DIM = 'rgba(255,255,255,0.65)';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setDemoRole } = useAuth();
  const [picking, setPicking] = useState(false);

  function go(role: 'student' | 'landlord') {
    setDemoRole?.(role);
    router.replace('/');
  }

  return (
    <View style={styles.root}>
      {/* Logo block */}
      <View style={styles.logoWrap}>
        <View style={styles.logoBox}>
          <Ionicons name="home" size={40} color="#fff" />
        </View>
        <AppText style={styles.brand}>RoomLink</AppText>
        <AppText style={styles.tagline}>Find Your Next Home</AppText>
      </View>

      {/* Centre copy */}
      <AppText style={styles.sub} align="center">
        Rooms. Apartments. Roommates.{'\n'}All in one place.
      </AppText>

      {/* CTA */}
      <View style={styles.actions}>
        {!picking ? (
          <>
            <Button label="Get Started" onPress={() => go('student')} fullWidth style={styles.cta} />
            <Pressable onPress={() => setPicking(true)} style={styles.ghost} accessibilityRole="button">
              <AppText style={styles.ghostText}>Log In</AppText>
            </Pressable>
          </>
        ) : (
          <>
            <AppText style={[styles.tagline, { marginBottom: spacing.xs }]} align="center">
              Continue as…
            </AppText>
            <Button label="Student" onPress={() => go('student')} fullWidth style={styles.cta} />
            <Button label="Landlord" onPress={() => go('landlord')} variant="secondary" fullWidth style={styles.secondary} />
            <Pressable onPress={() => setPicking(false)} style={styles.ghost} accessibilityRole="button">
              <AppText style={styles.ghostText}>← Back</AppText>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: spacing.xl,
  },
  logoWrap: { alignItems: 'center', gap: spacing.md },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: radii.xl,
    backgroundColor: palette.blue600,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  brand: { fontSize: 32, fontWeight: '700', color: '#fff' },
  tagline: { fontSize: 15, color: TEXT_DIM },
  sub: { fontSize: 15, color: TEXT_DIM, lineHeight: 24 },
  actions: { width: '100%', gap: spacing.md },
  cta: { backgroundColor: palette.blue500 },
  secondary: { borderColor: 'rgba(255,255,255,0.35)' },
  ghost: { alignItems: 'center', paddingVertical: spacing.sm },
  ghostText: { color: TEXT_DIM, fontSize: 15, fontWeight: '600' },
});
