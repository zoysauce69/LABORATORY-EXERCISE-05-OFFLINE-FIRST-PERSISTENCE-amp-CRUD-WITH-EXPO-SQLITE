import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';

import {
  AccountRow,
  NotificationPreferences,
  SessionActions,
  confirmDeleteAccount,
  confirmSignOut,
  type NotificationPreferenceKey,
} from '@/components/account-sections';
import {
  AppText,
  Avatar,
  Badge,
  Card,
  Divider,
  ErrorState,
  InlineAlert,
  Screen,
} from '@/components/ui';
import { TabScreenHeader } from '@/components/tab-screen-header';
import { VerificationStatusBadge } from '@/components/status-badge';
import { useAuth } from '@/hooks/use-auth';
import { useAsyncData } from '@/hooks/use-async-data';
import { ok } from '@/lib/errors';
import { profileService } from '@/services/profile-service';
import { authService } from '@/services/auth-service';
import { verificationSummary } from '@/constants/options';
import type { UserRole } from '@/lib/database.types';
import { colors, spacing } from '@/theme';

interface ProfilePanelProps {
  role: UserRole;
}

/**
 * Profile tab body shared by both roles.
 *
 * Only the middle sections differ — students get roommate tools, landlords get
 * verification — so the identity header, notification preferences and session
 * actions are implemented once.
 */
export function ProfilePanel({ role }: ProfilePanelProps) {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const isLandlord = role === 'landlord';

  const togglePreference = useCallback(
    async (key: NotificationPreferenceKey, next: boolean) => {
      const targetId = profile?.id ?? user?.id;
      if (!targetId) return false;

      const result = await profileService.updateNotificationPreferences(targetId, {
        [key]: next,
      });
      if (result.ok) await refreshProfile();
      return result.ok;
    },
    [profile?.id, refreshProfile, user?.id],
  );

  // `city` lives in the private details table rather than on the public profile
  // row, so the location badge reads it from the signed-in user's own record.
  const details = useAsyncData(
    async () => (profile ? profileService.getMyProfile(profile.id) : ok(null)),
    [profile?.id],
    { enabled: Boolean(profile?.id) },
  );

  if (!profile) {
    return (
      <Screen>
        <ErrorState
          title="Profile unavailable"
          message="We could not load your profile. Try signing in again."
        />
      </Screen>
    );
  }

  const verification = isLandlord ? verificationSummary(profile.verification_status) : null;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TabScreenHeader title="Profile" subtitle="Manage your account and preferences." />

        <Card style={styles.identity}>
          <Avatar name={profile.full_name} uri={profile.avatar_url} size={64} />
          <View style={styles.identityText}>
            <AppName name={profile.full_name} />
            <AppText variant="caption" numberOfLines={1}>
              {user?.email ?? 'No email on file'}
            </AppText>
            <View style={styles.badgeRow}>
              <Badge
                label={isLandlord ? 'Landlord' : 'Student'}
                tone={isLandlord ? 'info' : 'neutral'}
                icon={isLandlord ? 'business-outline' : 'school-outline'}
              />
              {details.data?.privateDetails?.city ? (
                <Badge
                  label={details.data.privateDetails.city}
                  tone="neutral"
                  icon="location-outline"
                />
              ) : null}
            </View>
          </View>
        </Card>

        {verification ? (
          <Card style={styles.card}>
            <View style={styles.sectionHead}>
              <AppText variant="heading" style={styles.sectionHeadText}>
                Landlord verification
              </AppText>
              <VerificationStatusBadge status={profile.verification_status} compact />
            </View>
            <AppText variant="caption">{verification.message}</AppText>
            {profile.verification_status === 'pending' ? (
              <AppText variant="caption" color={colors.textMuted}>
                {verification.nextStep}
              </AppText>
            ) : null}
            <Divider />
            <AccountRow
              label={verification.actionLabel}
              icon="shield-checkmark-outline"
              onPress={() => router.push('/(landlord)/verification')}
            />
          </Card>
        ) : null}

        <Card style={styles.card}>
          <AppText variant="heading" accessibilityRole="header">
            Account
          </AppText>
          <Divider />
          <AccountRow
            label="Edit profile"
            icon="create-outline"
            value={profile.business_name ?? undefined}
            onPress={() =>
              router.push(isLandlord ? '/(landlord)/edit-profile' : '/(student)/edit-profile')
            }
          />
          <Divider />
          <AccountRow
            label="Notification centre"
            icon="notifications-outline"
            onPress={() =>
              router.push(isLandlord ? '/(landlord)/notifications' : '/(student)/notifications')
            }
          />
        </Card>

        {isLandlord ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Listings
            </AppText>
            <Divider />
            <AccountRow
              label="My properties"
              icon="business-outline"
              onPress={() => router.push('/(landlord)/(tabs)/listings')}
            />
            <Divider />
            <AccountRow
              label="Post a new property"
              icon="add-circle-outline"
              onPress={() => router.push('/(landlord)/property/new')}
            />
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <AppText variant="heading" accessibilityRole="header">
                My Roommate
              </AppText>
              <Divider />
              <View style={styles.roommateInfo}>
                <Avatar name="Alex Reyes" uri={null} size={48} />
                <View style={styles.roommateText}>
                  <AppText variant="bodyStrong">Alex Reyes</AppText>
                  <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                    Looking for a studious roommate near campus
                  </AppText>
                </View>
              </View>
              <View style={styles.roommateActions}>
                <AccountRow
                  label="View profile"
                  icon="person-outline"
                  onPress={() => router.push('/(student)/roommate/demo-user-alex')}
                />
                <Divider />
                <AccountRow
                  label="Send roommate request"
                  icon="paper-plane-outline"
                  onPress={() => router.push('/(student)/roommate/demo-user-alex')}
                />
              </View>
            </Card>

            <Card style={styles.card}>
              <AppText variant="heading" accessibilityRole="header">
                Roommates
              </AppText>
              <Divider />
              <AccountRow
                label="My roommate profile"
                icon="people-outline"
                onPress={() => router.push('/(student)/edit-roommate-profile')}
              />
              <Divider />
              <AccountRow
                label="My roommate requests"
                icon="swap-horizontal-outline"
                onPress={() => router.push('/(student)/roommate-requests')}
              />
              <Divider />
              <AccountRow
                label="Saved roommates"
                icon="bookmark-outline"
                onPress={() => router.push('/(student)/saved-roommates')}
              />
            </Card>
          </>
        )}

        <NotificationPreferences profile={profile} onToggle={togglePreference} />

        <InlineAlert
          tone="info"
          title="Your contact details stay private"
          message="Renters only see the details you choose to share. Your phone number and email are never shown publicly."
        />

        <SessionActions
          onSignOut={() => {
            confirmSignOut(() => {
              void authService.signOut();
            });
          }}
          onDeleteAccount={() => {
            confirmDeleteAccount(() => {
              void authService.deleteAccount();
            });
          }}
        />

        <View style={styles.version}>
          <Badge label="RoomLink 1.0.0" tone="neutral" />
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Named component so the name stays selectable and screen readers read it once. */
function AppName({ name }: { name: string }) {
  return (
    <AppText variant="title" accessibilityRole="header" numberOfLines={2}>
      {name}
    </AppText>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.huge },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: spacing.xs },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
  card: { padding: spacing.lg, gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionHeadText: { flex: 1 },
  roommateInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  roommateText: { flex: 1, gap: spacing.xs },
  roommateActions: { gap: spacing.sm },
  version: { alignItems: 'center', paddingTop: spacing.sm },
});