import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/tab-screen-header';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { RoommateCard } from '@/components/roommate-card';
import { useAuth } from '@/hooks/use-auth';
import { useToggleSavedRoommate, useSavedRoommates } from '@/hooks/use-roommates';
import { colors, spacing } from '@/theme';

/**
 * Saved roommate profiles.
 *
 * Re-reads from the server on every toggle, so an entry disappears here the
 * moment the other person makes a field private, rather than lingering from a
 * cached copy.
 */
export default function SavedRoommatesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const saved = useSavedRoommates(user?.id, Boolean(user));
  const toggle = useToggleSavedRoommate(user?.id);

  const remove = async (roommateProfileId: string) => {
    await toggle.toggle(roommateProfileId);
    await saved.reload();
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={saved.isLoading && !saved.isInitialLoading}
            onRefresh={saved.reload}
            tintColor={colors.primary}
          />
        }
      >
        <ScreenHeader title="Saved roommates" onBack={() => router.back()} />

        {saved.error ? <ErrorState message={saved.error} onRetry={saved.reload} /> : null}

        {saved.isInitialLoading ? (
          <LoadingState label="Loading saved profiles" />
        ) : (saved.data ?? []).length === 0 ? (
          <EmptyState
            icon="bookmark-outline"
            title="Nothing saved yet"
            message="Tap the bookmark on a candidate to keep them here while you decide."
            actionLabel="Browse roommates"
            onAction={() => router.replace('/(student)/(tabs)/roommates')}
          />
        ) : (
          (saved.data ?? []).map((match) => (
            <RoommateCard
              key={match.roommate_profile_id}
              match={match}
              hasRequest={match.request_status !== null}
              isSaved
              isPending={toggle.pendingId === match.roommate_profile_id}
              onOpen={() => router.push(`/(student)/roommate/${match.user_id}`)}
              onToggleSave={() => void remove(match.roommate_profile_id)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.huge },
});