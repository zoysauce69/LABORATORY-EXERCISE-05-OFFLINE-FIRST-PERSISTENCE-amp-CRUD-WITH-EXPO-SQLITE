import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { RoomCard } from '@/components/room-card';
import { RoommateCard } from '@/components/roommate-card';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Screen,
  ScreenSection,
  StatTile,
} from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { useApplications } from '@/hooks/use-applications';
import { useFavorites } from '@/hooks/use-search';
import { lifestyleSummary } from '@/constants/options';
import { getFeaturedRooms } from '@/services/room-service';
import { topMatches } from '@/services/roommate-service';
import { formatPesoRange, formatRelativeFuture } from '@/utils/format';
import { colors, layout, radii, spacing } from '@/theme';
import type { IconName } from '@/lib/types';

/**
 * Home.
 *
 * Answers, in order: is anything of mine waiting on an answer, what should I look
 * at next, and is my own profile complete enough to match well. The profile
 * prompt is deliberate — every match score in the app is computed from those
 * fields, so an incomplete profile quietly makes every other number on the
 * screen wrong.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { profile, savedRoomIds, toggleSavedRoom, toggleSavedRoommate, customRooms } = useApp();
  const { counts } = useApplications();
  const { rooms: savedRooms, roommates: savedRoommates } = useFavorites();

  // Depends on `customRooms` so a room added in Settings refreshes the rail;
  // `getFeaturedRooms` reads the room-service cache the linter cannot see.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const featured = useMemo(() => getFeaturedRooms(6), [customRooms]);
  const matches = useMemo(() => topMatches(profile, 6), [profile]);

  const suggestions = featured.slice(0, 3);
  const topRoommates = matches.slice(0, 3);

  // Only surfaced while they are actually missing. A checklist that stays on
  // screen after it is done becomes noise, not guidance.
  const startedSteps = useMemo(() => {
    const steps: {
      icon: IconName;
      title: string;
      body: string;
      action: string;
      onPress: () => void;
    }[] = [];

    if (!profile.avatarUrl) {
      steps.push({
        icon: 'camera-outline',
        title: 'Add a photo',
        body: 'Listings with a face get replies. It is the single biggest change you can make.',
        action: 'Add',
        onPress: () => router.push('/(app)/edit-profile'),
      });
    }
    if (profile.interests.length < 3) {
      steps.push({
        icon: 'heart-outline',
        title: 'Add a few interests',
        body: 'Interests are how you find people you would actually enjoy living with.',
        action: 'Add',
        onPress: () => router.push('/(app)/edit-profile'),
      });
    }
    if (!profile.phone) {
      steps.push({
        icon: 'call-outline',
        title: 'Add a contact number',
        body: 'Landlords and roommates both need a way to reach you.',
        action: 'Add',
        onPress: () => router.push('/(app)/edit-profile'),
      });
    }

    return steps;
  }, [profile, router]);

  return (
    <Screen testID="home-screen">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="overline">Welcome back</AppText>
          <AppText variant="title" numberOfLines={1}>
            {firstName(profile.fullName)}
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
        >
          <Ionicons name="notifications-outline" size={21} color={colors.text} />
          {counts.total > 0 ? <View style={styles.bellBadge} /> : null}
        </Pressable>
        <Pressable
          onPress={() => router.push('/(app)/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Your profile"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Avatar uri={profile.avatarUrl} name={profile.fullName} size={layout.avatarMd} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Pending decisions ────────────────────────────────── */}
        {counts.pending > 0 ? (
          <Card
            style={styles.pendingCard}
            onPress={() => router.push('/(app)/applications')}
            accessibilityLabel={`${counts.pending} request${counts.pending === 1 ? '' : 's'} waiting for an answer`}
            accessibilityHint="Opens your requests"
          >
            <View style={styles.pendingIcon}>
              <Ionicons name="hourglass-outline" size={20} color={colors.warning} />
            </View>
            <View style={styles.pendingText}>
              <AppText variant="bodyStrong">
                {counts.pending} {counts.pending === 1 ? 'request is' : 'requests are'} waiting
              </AppText>
              <AppText variant="caption">We will tell you the moment anything moves</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        ) : null}

        {/* ── Your search criteria ──────────────────────────────── */}
        <Card style={styles.criteriaCard}>
          <View style={styles.criteriaHeader}>
            <Ionicons name="options-outline" size={18} color={colors.primary} />
            <AppText variant="bodyStrong" style={styles.criteriaTitle}>
              Your search
            </AppText>
            <Pressable
              onPress={() => router.push('/(app)/edit-profile')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit your search preferences"
            >
              <AppText variant="captionStrong" color={colors.primary}>
                Edit
              </AppText>
            </Pressable>
          </View>

          <View style={styles.criteriaFacts}>
            <Fact icon="location-outline" text={`${profile.preferredCity}`} />
            <Fact
              icon="wallet-outline"
              text={`${formatPesoRange(profile.budgetMin, profile.budgetMax)}/mo`}
            />
            <Fact icon="calendar-outline" text={`Free ${formatRelativeFuture(profile.moveInDate)}`} />
          </View>

          <AppText variant="caption">{lifestyleSummary(profile.lifestyle)}</AppText>

          {!profile.isDiscoverable ? (
            <View style={styles.hiddenNotice}>
              <Ionicons name="eye-off-outline" size={15} color={colors.textMuted} />
              <AppText variant="caption" style={styles.hiddenText}>
                You are hidden from roommate search. You can still apply to rooms.
              </AppText>
            </View>
          ) : null}
        </Card>

        {/* ── Shortcuts ────────────────────────────────────────── */}
        <View style={styles.tiles}>
          <StatTile
            label="Saved rooms"
            value={savedRoomIds.length}
            icon="heart-outline"
            tone="info"
            onPress={() => router.push('/(app)/(tabs)/saved')}
          />
          <StatTile
            label="Saved roommates"
            value={savedRoommates.length}
            icon="people-outline"
            tone="success"
            onPress={() => router.push('/(app)/(tabs)/saved')}
          />
          <StatTile
            label="Requests"
            value={counts.total}
            icon="document-text-outline"
            tone="warning"
            onPress={() => router.push('/(app)/applications')}
          />
        </View>

        {/* ── Suggested rooms ──────────────────────────────────── */}
        <ScreenSection
          title="Rooms you might like"
          action={
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/rooms')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="See all rooms"
            >
              <AppText variant="captionStrong" color={colors.primary}>
                See all
              </AppText>
            </Pressable>
          }
        >
          <View style={styles.list}>
            {suggestions.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onPress={() => router.push(`/(app)/room/${room.id}`)}
                onToggleSave={() => void toggleSavedRoom(room.id)}
                isSaved={savedRoomIds.includes(room.id)}
              />
            ))}
          </View>
        </ScreenSection>

        {/* ── Best matches ─────────────────────────────────────── */}
        <ScreenSection
          title="Roommates who fit you"
          action={
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/roommates')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="See all roommates"
            >
              <AppText variant="captionStrong" color={colors.primary}>
                See all
              </AppText>
            </Pressable>
          }
        >
          <View style={styles.list}>
            {topRoommates.map((roommate) => (
              <RoommateCard
                key={roommate.id}
                roommate={roommate}
                onPress={() => router.push(`/(app)/roommate/${roommate.id}`)}
                onToggleSave={() => void toggleSavedRoommate(roommate.id)}
                isSaved={roommate.isSaved}
              />
            ))}
          </View>
        </ScreenSection>

        {/* ── Getting started ──────────────────────────────────── */}
        {startedSteps.length > 0 ? (
          <View style={styles.gettingStarted}>
            <AppText variant="heading" accessibilityRole="header">
              Finish setting up
            </AppText>
            <AppText variant="caption">
              These three things make every match in the app sharper.
            </AppText>
            {startedSteps.map((step) => (
              <View key={step.title} style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  <Ionicons name={step.icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.stepText}>
                  <AppText variant="bodyStrong">{step.title}</AppText>
                  <AppText variant="caption">{step.body}</AppText>
                </View>
                <Button
                  label={step.action}
                  variant="secondary"
                  size="sm"
                  onPress={step.onPress}
                />
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Quick links ──────────────────────────────────────── */}
        <View style={styles.links}>
          <LinkRow
            icon="chatbubbles-outline"
            label="Messages"
            hint="Talk to people before you commit"
            onPress={() => router.push('/(app)/messages')}
          />
          <LinkRow
            icon="document-text-outline"
            label="Your requests"
            hint={`${counts.total} sent`}
            onPress={() => router.push('/(app)/applications')}
          />
          <LinkRow
            icon="help-circle-outline"
            label="Help and FAQs"
            hint="How matching works, and what we store"
            onPress={() => router.push('/(app)/help')}
          />
        </View>

        {savedRooms.length > 0 ? (
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/saved')}
            accessibilityRole="button"
            accessibilityLabel="Open your saved list"
            style={({ pressed }) => [styles.savedBanner, pressed && styles.pressed]}
          >
            <Ionicons name="heart" size={18} color={colors.primary} />
            <AppText variant="bodyStrong" style={styles.savedBannerText}>
              You have {savedRooms.length} saved {savedRooms.length === 1 ? 'room' : 'rooms'} waiting
            </AppText>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function Fact({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <AppText variant="caption" style={styles.factText}>
        {text}
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
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
    >
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.linkText}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="caption">{hint}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1, gap: 1 },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  pressed: { opacity: 0.65 },

  scroll: { flex: 1 },
  content: { padding: layout.screenPadding, gap: spacing.xxl, paddingBottom: spacing.huge },

  pendingCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  pendingIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warningSoft,
  },
  pendingText: { flex: 1, gap: 1 },

  criteriaCard: { padding: spacing.lg, gap: spacing.sm },
  criteriaHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  criteriaTitle: { flex: 1 },
  criteriaFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  factText: { flexShrink: 1 },
  hiddenNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hiddenText: { flex: 1 },

  tiles: { flexDirection: 'row', gap: spacing.md },
  list: { gap: spacing.md },

  gettingStarted: { gap: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  stepText: { flex: 1, gap: 1 },

  links: { gap: spacing.xs },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  linkText: { flex: 1, gap: 1 },

  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    backgroundColor: colors.primarySoft,
  },
  savedBannerText: { flex: 1 },
});