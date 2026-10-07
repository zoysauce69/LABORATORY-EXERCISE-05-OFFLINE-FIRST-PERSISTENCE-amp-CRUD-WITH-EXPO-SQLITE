import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/screen-header';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  InlineAlert,
  Screen,
  ScreenScroll,
} from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { toMessage } from '@/lib/errors';
import { roomTypeLabel } from '@/services/room-service';
import { formatMonthlyRent } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';

/**
 * Every room the user added, in one list.
 *
 * Editing reuses the add form prefilled through `?id=`; deleting always asks
 * first, because a removal here also drops the listing from the Rooms tab and
 * from anyone's saved rooms with no way to undo it.
 */
export default function ManageRoomsScreen() {
  const router = useRouter();
  const { customRooms, deleteCustomRoom } = useApp();

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  /**
   * The room waiting for confirmation.
   *
   * An in-app dialog rather than `Alert.alert`, which is a no-op on the web
   * preview — there the confirm would simply never appear and the button would
   * look broken.
   */
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  function confirmDelete(id: string, title: string) {
    setError(null);
    setNotice(null);
    setPendingDelete({ id, title });
  }

  async function handleDelete(id: string) {
    setPendingDelete(null);
    setBusyId(id);
    const result = await deleteCustomRoom(id);
    setBusyId(null);

    if (!result.ok) {
      setError(toMessage(result.error, 'We could not delete that room.'));
      return;
    }

    setNotice('Room deleted successfully.');
  }

  return (
    <Screen testID="manage-rooms-screen">
      <ScreenHeader
        title="Manage rooms"
        subtitle="Edit or remove the rooms you added."
      />

      <ScreenScroll>
        {error ? <InlineAlert tone="danger" message={error} /> : null}
        {notice ? <InlineAlert tone="success" message={notice} /> : null}

        {customRooms.length === 0 ? (
          <EmptyState
            icon="home-outline"
            title="No rooms yet"
            message="Rooms you add appear here, and in the listings, straight away."
            actionLabel="Add your first room"
            onAction={() => router.push('/(app)/add-room')}
          />
        ) : (
          customRooms.map((room) => (
            <Card key={room.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBlock}>
                  <AppText variant="subheading" numberOfLines={2}>
                    {room.title}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {roomTypeLabel(room.roomType)} · {room.barangay}, {room.city}
                  </AppText>
                </View>
                <Badge
                  label={formatMonthlyRent(room.monthlyRent)}
                  tone="info"
                  icon="cash-outline"
                />
              </View>

              <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
                {room.description}
              </AppText>

              <View style={styles.slotRow}>
                <Badge
                  label={`${room.availableSlots} slot${room.availableSlots === 1 ? '' : 's'} open`}
                  tone={room.availableSlots > 0 ? 'success' : 'neutral'}
                  icon="bed-outline"
                />
                <Badge label={`From ${room.availableFrom}`} tone="neutral" icon="calendar-outline" />
              </View>

              <View style={styles.actions}>
                <Button
                  label="Edit"
                  variant="outline"
                  size="sm"
                  icon="create-outline"
                  style={styles.actionButton}
                  onPress={() => router.push({ pathname: '/(app)/add-room', params: { id: room.id } })}
                  accessibilityLabel={`Edit ${room.title}`}
                />
                <Button
                  label="Delete"
                  variant="danger"
                  size="sm"
                  icon="trash-outline"
                  isLoading={busyId === room.id}
                  style={styles.actionButton}
                  onPress={() => confirmDelete(room.id, room.title)}
                  accessibilityLabel={`Delete ${room.title}`}
                />
              </View>
            </Card>
          ))
        )}

        <AppText variant="caption" color={colors.textMuted} align="center">
          Changes apply immediately across the app on this device.
        </AppText>
      </ScreenScroll>

      {/* Delete confirmation: an in-app dialog, so it appears on web as well.
          Mounted only while a room is pending — react-native-web keeps a
          `visible={false}` modal on screen until a CSS animation ends, which
          can stall, so the whole modal is unmounted instead. */}
      {pendingDelete ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPendingDelete(null)}>
        <View style={styles.dialogOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPendingDelete(null)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss delete confirmation"
          />
          <View style={styles.dialog}>
            <AppText variant="subheading" accessibilityRole="header">
              Delete room
            </AppText>
            <AppText variant="body" color={colors.textMuted}>
              Remove ‘{pendingDelete?.title}’ from your listings? It disappears from the rooms list
              and from saved rooms too.
            </AppText>
            <View style={styles.dialogActions}>
              <Button
                label="Cancel"
                variant="outline"
                size="sm"
                style={styles.dialogButton}
                onPress={() => setPendingDelete(null)}
                accessibilityLabel="Cancel delete"
              />
              <Button
                label="Delete"
                variant="danger"
                size="sm"
                style={styles.dialogButton}
                isLoading={busyId === pendingDelete?.id}
                onPress={() => {
                  if (pendingDelete) void handleDelete(pendingDelete.id);
                }}
                accessibilityLabel="Confirm delete"
              />
            </View>
          </View>
        </View>
      </Modal>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitleBlock: { flex: 1, gap: 2 },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionButton: { flex: 1 },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 47, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  dialogActions: { flexDirection: 'row', gap: spacing.sm },
  dialogButton: { flex: 1 },
});
