import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { SwitchField } from '@/components/form-fields';
import { ScreenHeader } from '@/components/screen-header';
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  InlineAlert,
  Screen,
  ScreenScroll,
} from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { toMessage } from '@/lib/errors';
import { DEMO_CREDENTIALS, DEMO_PROFILE } from '@/lib/mock-data';
import { formatDateTime } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';
import type { IconName } from '@/lib/types';

/**
 * Account settings.
 *
 * Also the place the demo's own seams are made visible: what is stored, where,
 * and how to wipe it. For an app with no server, "delete my data" has to be a
 * real button rather than a support article, and someone evaluating the product
 * needs to see that nothing leaves the device.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { profile, updateProfile, resetDemoData, signOut, savedRoomIds, savedRoommateIds, customRooms } =
    useApp();

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  async function togglePref(key: keyof typeof profile.notificationPrefs, value: boolean) {
    setError(null);
    const result = await updateProfile({
      notificationPrefs: { ...profile.notificationPrefs, [key]: value },
    });
    if (!result.ok) setError(toMessage(result.error, 'We could not save that preference.'));
  }

  async function handleReset() {
    setIsResetting(true);
    setError(null);
    setNotice(null);

    const result = await resetDemoData();
    setIsResetting(false);

    if (!result.ok) {
      setError(toMessage(result.error, 'We could not reset the demo data.'));
      return;
    }
    setNotice('Everything is back to how it started: saved items, requests and messages.');
  }

  async function handleSignOut() {
    const result = await signOut();
    if (result.ok) router.replace('/(public)/landing');
  }

  return (
    <Screen testID="settings-screen">
      <ScreenHeader title="Settings" subtitle="Notifications, your data, and the demo account." />

      <ScreenScroll>
        {error ? <InlineAlert tone="danger" message={error} /> : null}
        {notice ? <InlineAlert tone="success" message={notice} /> : null}

        {/* ── Notifications ────────────────────────────────────── */}
        <Section title="Notifications">
          <Card style={styles.card}>
            <SwitchField
              label="Applications"
              description="Approvals, declines and the reason attached to them."
              value={profile.notificationPrefs.applications}
              onChange={(value) => void togglePref('applications', value)}
            />
            <Divider />
            <SwitchField
              label="Roommate requests"
              description="When someone accepts or declines a request to live together."
              value={profile.notificationPrefs.roommateRequests}
              onChange={(value) => void togglePref('roommateRequests', value)}
            />
            <Divider />
            <SwitchField
              label="Messages"
              description="New replies in a conversation you have already opened."
              value={profile.notificationPrefs.messages}
              onChange={(value) => void togglePref('messages', value)}
            />
          </Card>
          <AppText variant="caption">
            RoomLink has no push notifications and no server, so these control what appears in the
            in-app bell — nothing is sent anywhere.
          </AppText>
        </Section>

        {/* ── What is stored ───────────────────────────────────── */}
        {/* Room management: add and maintain the user's own listings. */}
        <Section title="Room Management">
          <Card style={styles.links}>
            <Row
              icon="add-circle-outline"
              label="Add Room"
              hint="Publish a new listing straight to the rooms tab"
              onPress={() => router.push('/(app)/add-room')}
            />
            <Divider />
            <Row
              icon="home-outline"
              label="Manage Rooms"
              hint={
                customRooms.length === 0
                  ? 'No rooms added yet'
                  : `${customRooms.length} room${customRooms.length === 1 ? '' : 's'} added`
              }
              onPress={() => router.push('/(app)/manage-rooms')}
            />
          </Card>
          <AppText variant="caption">
            Rooms you add are stored on this device and appear in listings right away. Deleting one
            removes it from listings and saved rooms too.
          </AppText>
        </Section>

        <Section title="Your data">
          <Card style={styles.card}>
            <StoredRow icon="heart-outline" label="Saved rooms" value={`${savedRoomIds.length}`} />
            <StoredRow icon="people-outline" label="Saved roommates" value={`${savedRoommateIds.length}`} />
            <StoredRow icon="person-outline" label="Profile" value={profile.email} />
            <StoredRow icon="key-outline" label="Last signed in" value={formatDateTime(new Date())} />
          </Card>

          <View style={styles.notice}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.textMuted} />
            <AppText variant="caption" style={styles.noticeText}>
              Everything above lives in this app’s local storage on this device. There is no server,
              no database and no analytics, so clearing the app removes all of it permanently.
            </AppText>
          </View>

          <Button
            label="Reset demo data"
            variant="secondary"
            icon="refresh-outline"
            isLoading={isResetting}
            onPress={() => void handleReset()}
          />
          <AppText variant="caption" color={colors.textMuted}>
            Puts saved items, requests, conversations and your profile edits back to their starting
            state. You stay signed in.
          </AppText>
        </Section>

        {/* ── Demo account ─────────────────────────────────────── */}
        <Section title="Demo account">
          <Card style={styles.demoCard}>
            <View style={styles.demoHeader}>
              <Badge label="No server" tone="info" icon="cloud-offline-outline" />
              <Badge label="Mock data" tone="neutral" icon="flask-outline" />
            </View>
            <AppText variant="caption">
              Sign-in is simulated against a local account list. The demo account exists from first
              launch, so the sign-in screen’s one-tap button always works.
            </AppText>

            <View style={styles.credentials}>
              <Credential label="Email" value={DEMO_CREDENTIALS.email} />
              <Credential label="Password" value={DEMO_CREDENTIALS.password} />
              <Credential label="Signed in as" value={DEMO_PROFILE.fullName} />
            </View>
          </Card>
        </Section>

        {/* ── About ────────────────────────────────────────────── */}
        <Section title="About">
          <Card style={styles.links}>
            <Row
              icon="help-circle-outline"
              label="Help and FAQs"
              hint="How matching works, and what happens to your data"
              onPress={() => router.push('/(app)/help')}
            />
            <Divider />
            <Row
              icon="create-outline"
              label="Edit profile"
              hint="Your lifestyle answers and search preferences"
              onPress={() => router.push('/(app)/edit-profile')}
            />
          </Card>

          <AppText variant="caption" align="center">
            RoomLink · student housing and roommate matching · Philippines
          </AppText>
        </Section>

        <Button
          label="Sign out"
          variant="ghost"
          icon="log-out-outline"
          onPress={() => void handleSignOut()}
        />
      </ScreenScroll>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function StoredRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.storedRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <AppText variant="caption" style={styles.storedLabel}>
        {label}
      </AppText>
      <AppText variant="caption" numberOfLines={1} style={styles.storedValue}>
        {value}
      </AppText>
    </View>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.credential}>
      <AppText variant="overline" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

function Row({
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
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="caption">{hint}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionBody: { gap: spacing.md },
  card: { padding: spacing.lg },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noticeText: { flex: 1 },

  demoCard: { gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surfaceMuted },
  demoHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  credentials: { gap: spacing.sm },
  credential: {
    gap: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },

  storedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxs },
  storedLabel: { width: 130 },
  storedValue: { flex: 1 },

  links: { padding: spacing.lg, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  rowText: { flex: 1, gap: 1 },
  pressed: { opacity: 0.65 },
});
