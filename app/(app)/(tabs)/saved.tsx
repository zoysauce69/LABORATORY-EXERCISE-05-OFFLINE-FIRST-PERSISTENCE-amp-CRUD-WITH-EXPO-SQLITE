import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';

import { RoommateCard } from '@/components/roommate-card';
import { RoomCard } from '@/components/room-card';
import { ScreenHeader } from '@/components/screen-header';
import { Button, EmptyState, Screen, ScreenScroll } from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { useFavorites } from '@/hooks/use-search';
import { spacing } from '@/theme';

type Tab = 'rooms' | 'roommates';

/**
 * Saved rooms and roommates.
 *
 * Both are shortlists someone built while browsing, so they share one screen
 * with a two-way switch. The alternative — two more tabs — would put the app at
 * six tabs for a feature that is inherently a filter over the other two.
 */
export default function SavedScreen() {
  const router = useRouter();
  const { savedRoomIds, toggleSavedRoom, toggleSavedRoommate } = useApp();
  const { rooms, roommates } = useFavorites();

  const [tab, setTab] = useState<Tab>(() => (rooms.length > 0 ? 'rooms' : 'roommates'));

  return (
    <Screen testID="saved-screen">
      <ScreenHeader title="Saved" subtitle="Things you want to come back to." onBack={false} />

      <ScreenScroll>
        <View style={styles.tabs}>
          <Button
            label={`Rooms (${rooms.length})`}
            variant={tab === 'rooms' ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => setTab('rooms')}
            style={styles.tab}
            accessibilityState={{ selected: tab === 'rooms' }}
          />
          <Button
            label={`Roommates (${roommates.length})`}
            variant={tab === 'roommates' ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => setTab('roommates')}
            style={styles.tab}
            accessibilityState={{ selected: tab === 'roommates' }}
          />
        </View>

        {tab === 'rooms' ? (
          rooms.length === 0 ? (
            <EmptyState
              icon="heart-outline"
              title="No saved rooms"
              message="Tap the heart on any listing and it stays here. Nothing is reserved, so browse freely."
              actionLabel="Browse rooms"
              onAction={() => router.push('/(app)/(tabs)/rooms')}
            />
          ) : (
            <View style={styles.list}>
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onPress={() => router.push(`/(app)/room/${room.id}`)}
                  onToggleSave={() => void toggleSavedRoom(room.id)}
                  isSaved={savedRoomIds.includes(room.id)}
                />
              ))}
            </View>
          )
        ) : roommates.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No saved roommates"
            message="Save anyone you want to think about. You can still compare their compatibility before deciding."
            actionLabel="Find roommates"
            onAction={() => router.push('/(app)/(tabs)/roommates')}
          />
        ) : (
          <View style={styles.list}>
            {roommates.map((roommate) => (
              <RoommateCard
                key={roommate.id}
                roommate={roommate}
                onPress={() => router.push(`/(app)/roommate/${roommate.id}`)}
                onToggleSave={() => void toggleSavedRoommate(roommate.id)}
                isSaved={roommate.isSaved}
              />
            ))}
          </View>
        )}
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1 },
  list: { gap: spacing.md },
});