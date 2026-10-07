import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/screen-header';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Divider,
  Screen,
  ScreenScroll,
  StatTile,
} from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { useApplications } from '@/hooks/use-applications';
import { useFavorites } from '@/hooks/use-search';
import { cleanlinessLabel, lifestyleSummary } from '@/constants/options';
import { topMatches } from '@/services/roommate-service';
import { formatPesoRange, formatRelativeFuture } from '@/utils/format';
import { colors, layout, radii, spacing } from '@/theme';
import type { IconName } from '@/lib/types';

/**
 * The renter's own profile and account.
 *
 * Puts the lifestyle answers next to the score they produce, because those
 * answers are the input to every compatibility number in the app and the single
 * thing most likely to be wrong. Editing them is one tap from here.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut } = useApp();
  const { counts } = useApplications();
  const { rooms: savedRooms, roommates: savedRoommates } = useFavorites();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const bestMatch = topMatches(profile, 1)[0];

  async function handleSignOut() {
    setIsSigningOut(true);
    const result = await signOut();
    if (result.ok) {
      // Leaves the account entirely rather than dropping into the tabs, which
      // the guard would immediately bounce back.
      router.replace('/(public)/landing');
      return;
    }
    setIsSigningOut(false);
  }

  return (
    <Screen testID="profile-screen">
      <ScreenHeader
        title="You"
        onBack={false}
        right={
          <Pressable
            onPress={() => router.push('/(app)/settings')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="settings-outline" size={21} color={colors.text} />
          </Pressable>
        }
      />

      <ScreenScroll>
        {/* ── Identity ─────────────────────────────────────────── */}
        <Card style={styles.identityCard}>
          <Avatar uri={profile.avatarUrl} name={profile.fullName} size={layout.avatarLg} />
          <View style={styles.identityText}>
            <AppText variant="title">{profile.fullName}</AppText>
            <AppText variant="caption">{profile.occupation}</AppText>
            {profile.headline.length > 0 ? (
              <AppText variant="body" style={styles.headline}>
                {profile.headline}
              </AppText>
            ) : null}
          </View>
          <Button
            label="Edit"
            variant="secondary"
            size="sm"
            icon="create-outline"
            onPress={() => router.push('/(app)/edit-profile')}
          />
        </Card>

        {/* ── Search criteria ──────────────────────────────────── */}
        <View style={styles.facts}>
          <Fact icon="mail-outline" text={profile.email} />
          <Fact icon="call-outline" text={profile.phone || 'No number yet'} />
          <Fact icon="location-outline" text={`Looking in ${profile.preferredCity}`} />
          <Fact icon="wallet-outline" text={`${formatPesoRange(profile.budgetMin, profile.budgetMax)}/mo`} />
          <Fact icon="calendar-outline" text={`Free ${formatRelativeFuture(profile.moveInDate)}`} />
        </View>

        {/* ── Lifestyle ────────────────────────────────────────── */}
        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            How you live
          </AppText>
          <AppText variant="caption">
            These six answers are the input to every compatibility score you see. Change one and
            every match is recalculated.
          </AppText>

          <Card style={styles.lifestyleCard}>
            <LifestyleRow label="Sleep schedule" value={profile.lifestyle.sleepSchedule} />
            <LifestyleRow label="Study habits" value={profile.lifestyle.studyHabits} />
            <LifestyleRow label="Guests" value={profile.lifestyle.guests} />
            <LifestyleRow label="Pets" value={profile.lifestyle.pets} />
            <LifestyleRow label="Smoking" value={profile.lifestyle.smoking} />
            <LifestyleRow label="Drinking" value={profile.lifestyle.drinking} />
            <Divider style={styles.lifestyleDivider} />
            <View style={styles.lifestyleRow}>
              <AppText variant="caption" style={styles.lifestyleLabel}>
                Cleanliness
              </AppText>
              <AppText variant="caption" style={styles.lifestyleValue}>
                {cleanlinessLabel(profile.lifestyle.cleanliness)}
              </AppText>
            </View>
            <Divider style={styles.lifestyleDivider} />
            <View style={styles.lifestyleRow}>
              <AppText variant="caption" style={styles.lifestyleLabel}>
                Summary
              </AppText>
              <AppText variant="caption" style={styles.lifestyleValue}>
                {lifestyleSummary(profile.lifestyle)}
              </AppText>
            </View>
          </Card>

          <Button
            label="Edit lifestyle and preferences"
            variant="secondary"
            icon="options-outline"
            onPress={() => router.push('/(app)/edit-profile')}
          />
        </View>

        {/* ── Best match ───────────────────────────────────────── */}
        {bestMatch ? (
          <View style={styles.section}>
            <AppText variant="heading" accessibilityRole="header">
              Your strongest match
            </AppText>
            <Card
              onPress={() => router.push(`/(app)/roommate/${bestMatch.id}`)}
              accessibilityLabel={`${bestMatch.fullName}, ${bestMatch.compatibilityScore}% compatible`}
              accessibilityHint="Opens their profile"
              style={styles.matchCard}
            >
              <View style={styles.matchRow}>
                <Avatar
                  uri={bestMatch.avatarUrl}
                  name={bestMatch.fullName}
                  size={layout.avatarMd}
                  verified={bestMatch.verified}
                />
                <View style={styles.matchText}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {bestMatch.fullName}
                  </AppText>
                  <AppText variant="caption" numberOfLines={1}>
                    {bestMatch.schoolOrWork}
                  </AppText>
                </View>
                <View style={styles.matchScore}>
                  <AppText variant="scoreValue">{bestMatch.compatibilityScore}%</AppText>
                </View>
              </View>
              <AppText variant="caption">
                {bestMatch.matchReasons.find((r) => r.kind === 'match')?.detail ??
                  'The closest match on your current preferences.'}
              </AppText>
            </Card>
          </View>
        ) : null}

        {/* ── Interests ────────────────────────────────────────── */}
        {profile.interests.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="heading" accessibilityRole="header">
              Your interests
            </AppText>
            <View style={styles.interests}>
              {profile.interests.map((interest) => (
                <View key={interest} style={styles.interestChip}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {interest}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Activity ─────────────────────────────────────────── */}
        <View style={styles.tiles}>
          <StatTile label="Saved rooms" value={savedRooms.length} icon="heart-outline" tone="info" />
          <StatTile label="Saved people" value={savedRoommates.length} icon="people-outline" tone="success" />
          <StatTile label="Requests" value={counts.total} icon="document-text-outline" tone="warning" />
        </View>

        {/* ── Links ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            Account
          </AppText>
          <Card style={styles.links}>
            <LinkRow
              icon="document-text-outline"
              label="Your requests"
              hint={`${counts.pending} pending`}
              onPress={() => router.push('/(app)/applications')}
            />
            <Divider />
            <LinkRow
              icon="chatbubbles-outline"
              label="Messages"
              hint="Talk before you commit"
              onPress={() => router.push('/(app)/messages')}
            />
            <Divider />
            <LinkRow
              icon="notifications-outline"
              label="Notifications"
              hint="Application and message updates"
              onPress={() => router.push('/(app)/notifications')}
            />
            <Divider />
            <LinkRow
              icon="help-circle-outline"
              label="Help and FAQs"
              onPress={() => router.push('/(app)/help')}
            />
            <Divider />
            <LinkRow
              icon="settings-outline"
              label="Settings"
              onPress={() => router.push('/(app)/settings')}
            />
          </Card>
        </View>

        <Button
          label="Sign out"
          variant="ghost"
          icon="log-out-outline"
          isLoading={isSigningOut}
          onPress={() => void handleSignOut()}
          style={styles.signOut}
        />
      </ScreenScroll>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function Fact({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <AppText variant="caption">{text}</AppText>
    </View>
  );
}

const LIFESTYLE_LABELS: Record<string, string> = {
  early_bird: 'Early bird',
  night_owl: 'Night owl',
  flexible: 'Flexible',
  quiet_study: 'Prefers quiet study time',
  study_together: 'Happy to study together',
  no_preference: 'No preference',
  few_guests: 'Occasional guests ok',
  no_guests: 'No guests',
  love_pets: 'Pets welcome',
  no_pets: 'No pets',
  non_smoker: 'Non-smoker only',
  smoker: 'Smoker friendly',
  non_drinker: 'Non-drinker',
  social: 'Social drinker',
};

function LifestyleRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.lifestyleRow}>
      <AppText variant="caption" style={styles.lifestyleLabel}>
        {label}
      </AppText>
      <AppText variant="caption" style={styles.lifestyleValue}>
        {LIFESTYLE_LABELS[value] ?? value}
      </AppText>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
    >
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.linkText}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.65 },

  identityCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  identityText: { flex: 1, gap: 2 },
  headline: { marginTop: spacing.xs },

  facts: { gap: spacing.sm },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  section: { gap: spacing.md },
  lifestyleCard: { padding: spacing.lg },
  lifestyleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.xxs },
  lifestyleLabel: { width: 116 },
  lifestyleValue: { flex: 1 },
  lifestyleDivider: { marginVertical: spacing.xs },

  matchCard: { padding: spacing.lg, gap: spacing.sm },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  matchText: { flex: 1, gap: 1 },
  matchScore: { alignItems: 'flex-end' },

  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  interestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },

  tiles: { flexDirection: 'row', gap: spacing.md },
  links: { padding: spacing.lg, gap: spacing.xs },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  linkText: { flex: 1, gap: 1 },

  signOut: { marginTop: spacing.sm },
});