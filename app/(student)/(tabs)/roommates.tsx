import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppText, EmptyState, ErrorState, InlineAlert, Screen, SkeletonList } from '@/components/ui';
import { RoommateCard } from '@/components/roommate-card';
import { RoommateSearchBar } from '@/components/roommate-search-bar';
import { TabScreenHeader } from '@/components/tab-screen-header';
import { cities } from '@/constants/locations';
import { useAuth } from '@/hooks/use-auth';
import {
  useRoommateProfile,
  useRoommateRequests,
  useRoommateSearch,
  useToggleSavedRoommate,
} from '@/hooks/use-roommates';
import { roommateService } from '@/services/roommate-service';
import type { RoommateMatchResult } from '@/lib/database.types';
import { colors, radii, spacing } from '@/theme';

export default function StudentRoommatesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [city, setCity] = useState<string | undefined>(undefined);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const profile = useRoommateProfile(user?.id);
  const requests = useRoommateRequests(user?.id);
  const savedToggle = useToggleSavedRoommate(user?.id);

  const filters = useMemo(() => ({ query, city }), [query, city]);
  const search = useRoommateSearch(filters, Boolean(profile.data));

  const incomingCount = (requests.data ?? []).filter(
    (request) => request.receiver_id === user?.id && request.status === 'pending',
  ).length;

  const sendRequest = async (match: RoommateMatchResult) => {
    if (!user) return;
    setSendingId(match.roommate_profile_id);
    setActionError(null);

    const result = await roommateService.sendRequest(user.id, match.user_id);
    setSendingId(null);

    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }

    void search.reload();
    void requests.reload();
  };

  const clearFilters = () => {
    setCity(undefined);
    setQuery('');
  };

  const needsProfile =
    Boolean(user) && profile.data === null && !profile.isInitialLoading && !profile.error;

  if (needsProfile) {
    return (
      <Screen>
        <View style={styles.setup}>
          <TabScreenHeader
            title="Roommates"
            subtitle="Tell us how you live and we will suggest people you would get along with."
          />
          <EmptyState
            icon="people-outline"
            title="Create your roommate profile"
            message="You need a profile before others can find you, and before you can browse matches."
            actionLabel="Set up my profile"
            onAction={() => router.push('/(student)/edit-roommate-profile')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <TabScreenHeader
          title="Roommates"
          subtitle="Compatible people looking for a place to stay, near you."
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`My roommate requests, ${incomingCount} awaiting reply`}
              onPress={() => router.push('/(student)/roommate-requests')}
              style={styles.headerButton}
            >
              <Ionicons name="mail-unread-outline" size={18} color={colors.text} />
              {incomingCount > 0 ? (
                <View style={styles.dot}>
                  <AppText variant="overline" color={colors.textInverse}>
                    {incomingCount > 9 ? '9+' : String(incomingCount)}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          }
        />

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit my roommate profile"
            onPress={() => router.push('/(student)/edit-roommate-profile')}
            style={styles.secondaryButton}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <AppText variant="captionStrong" color={colors.primary}>
              {profile.data ? 'Edit my profile' : 'Set up profile'}
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View saved roommates"
            onPress={() => router.push('/(student)/saved-roommates')}
            style={styles.secondaryButton}
          >
            <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
            <AppText variant="captionStrong" color={colors.primary}>
              Saved
            </AppText>
          </Pressable>
        </View>

        <RoommateSearchBar
          value={query}
          onChange={setQuery}
          city={city}
          onChangeCity={setCity}
          cities={cities().slice(0, 8)}
        />
      </View>

      {actionError ? (
        <View style={styles.alertWrap}>
          <InlineAlert tone="danger" message={actionError} />
        </View>
      ) : null}

      {search.error ? (
        <ErrorState message={search.error} onRetry={search.reload} />
      ) : search.isInitialLoading ? (
        <SkeletonList count={2} renderItem={() => <View style={{ height: 180 }} />} />
      ) : (
        <View style={styles.list}>
          {(search.data ?? []).length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No matches yet"
              message={
                query || city
                  ? 'Try a different name or widen the city filter.'
                  : 'Nobody matches right now. Make sure your profile is active and discoverable.'
              }
              actionLabel={city || query ? 'Clear filters' : 'Review my profile'}
              onAction={() => {
                if (city || query) {
                  clearFilters();
                } else {
                  router.push('/(student)/edit-roommate-profile');
                }
              }}
            />
          ) : (
            (search.data ?? []).map((match) => (
              <RoommateCard
                key={match.roommate_profile_id}
                match={match}
                isSaved={match.is_saved}
                isPending={
                  sendingId === match.roommate_profile_id ||
                  savedToggle.pendingId === match.roommate_profile_id
                }
                onOpen={() => router.push(`/(student)/roommate/${match.user_id}`)}
                onRequest={() => {
                  void sendRequest(match);
                }}
                onToggleSave={() => {
                  void savedToggle.toggle(match.roommate_profile_id);
                  void search.reload();
                }}
              />
            ))
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  setup: { flex: 1 },
  header: { padding: spacing.lg, gap: spacing.md },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    minHeight: 34,
  },
  alertWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
});