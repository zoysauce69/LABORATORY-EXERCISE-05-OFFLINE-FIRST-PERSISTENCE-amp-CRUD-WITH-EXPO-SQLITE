import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/screen-header';
import { AppText, Badge, Button, EmptyState, InlineAlert, Screen, ScreenScroll } from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { toMessage } from '@/lib/errors';
import {
  APPLICATION_STATUS_LABEL,
  applicationStatusTone,
  ROOMMATE_STATUS_LABEL,
  roommateStatusTone,
} from '@/services/application-service';
import { colors, radii, spacing } from '@/theme';
import { formatRelativeFuture, formatRelativePast } from '@/utils/format';
import type { Application } from '@/lib/types';

type Tab = 'room' | 'roommate';

/**
 * Applications and roommate requests in one list.
 *
 * One screen with two tabs rather than two screens because from a renter's side
 * these are the same object pointed at a different target — both get a
 * pending/approved/declined answer and both arrive as a notification. The counts
 * on the tab labels make it obvious the other kind is not missing.
 */
export default function ApplicationsScreen() {
  const router = useRouter();
  const { applications, roommateRequests, cancelApplication, decideApplication } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Open on whichever kind actually has something in it. Done as lazy
  // initialisation rather than in an effect so the first render is already
  // correct and there is no flash of the empty tab.
  const [tab, setTab] = useState<Tab>(() =>
    applications.length === 0 && roommateRequests.length > 0 ? 'roommate' : 'room',
  );

  const counts = useMemo(
    () => ({ room: applications.length, roommate: roommateRequests.length }),
    [applications.length, roommateRequests.length],
  );

  const visible = tab === 'room' ? applications : roommateRequests;

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setActionError(null);
    await action();
    setBusyId(null);
  }

  async function handleCancel(application: Application) {
    const result = await cancelApplication(application.id);
    if (!result.ok) setActionError(toMessage(result.error, 'We could not cancel that request.'));
  }

  return (
    <Screen testID="applications-screen">
      <ScreenHeader title="Your requests" subtitle="Everything you have sent, and where it got to." />

      <ScreenScroll>
        <View style={styles.tabs}>
          <TabButton
            label="Room applications"
            count={counts.room}
            isSelected={tab === 'room'}
            onPress={() => setTab('room')}
          />
          <TabButton
            label="Roommate requests"
            count={counts.roommate}
            isSelected={tab === 'roommate'}
            onPress={() => setTab('roommate')}
          />
        </View>

        {actionError ? <InlineAlert tone="danger" message={actionError} /> : null}

        {visible.length === 0 ? (
          <EmptyApplications tab={tab} />
        ) : (
          visible.map((application) => (
            <ApplicationRow
              key={application.id}
              application={application}
              isBusy={busyId === application.id}
              onOpen={
                application.kind === 'room' && application.roomId
                  ? () => router.push(`/(app)/room/${application.roomId}`)
                  : application.kind === 'roommate' && application.roommateId
                    ? () => router.push(`/(app)/roommate/${application.roommateId}`)
                    : undefined
              }
              onCancel={() => {
                void run(application.id, () => handleCancel(application));
              }}
              onDecide={
                application.kind === 'room' && application.status === 'pending'
                  ? (status) => {
                      void run(application.id, () => decideApplication(application.id, status));
                    }
                  : undefined
              }
            />
          ))
        )}
      </ScreenScroll>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function TabButton({
  label,
  count,
  isSelected,
  onPress,
}: {
  label: string;
  count: number;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      label={`${label} (${count})`}
      variant={isSelected ? 'primary' : 'secondary'}
      size="sm"
      onPress={onPress}
      style={styles.tabButton}
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={isSelected ? 'Currently shown' : `Shows ${count} ${label.toLowerCase()}`}
    />
  );
}

function ApplicationRow({
  application,
  isBusy,
  onOpen,
  onCancel,
  onDecide,
}: {
  application: Application;
  isBusy: boolean;
  onOpen?: () => void;
  onCancel: () => void;
  onDecide?: (status: 'approved' | 'rejected') => void;
}) {
  const isRoom = application.kind === 'room';
  const title = isRoom
    ? (application.roomTitle ?? 'Room')
    : `Live with ${application.roommateName ?? 'a roommate'}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {title}
          </AppText>
          <AppText variant="caption">Sent {formatRelativePast(application.createdAt)}</AppText>
        </View>
        <Badge
          label={
            isRoom
              ? APPLICATION_STATUS_LABEL[application.status]
              : ROOMMATE_STATUS_LABEL[application.status]
          }
          tone={
            isRoom
              ? applicationStatusTone(application.status)
              : roommateStatusTone(application.status)
          }
          icon={isRoom ? 'document-text-outline' : 'people-outline'}
        />
      </View>

      <View style={styles.facts}>
        <Fact icon="calendar-outline" text={`Moving in ${formatRelativeFuture(application.moveInDate)}`} />
        <Fact
          icon="people-outline"
          text={
            isRoom
              ? `${application.occupants} ${application.occupants === 1 ? 'person' : 'people'} moving in`
              : 'Sharing the rest of the place'
          }
        />
      </View>

      {application.note.length > 0 ? (
        <AppText variant="caption" numberOfLines={2} style={styles.note}>
          “{application.note}”
        </AppText>
      ) : null}

      {application.status === 'rejected' && application.rejectionReason ? (
        <InlineAlert tone="warning" title="Not this time" message={application.rejectionReason} />
      ) : null}

      {application.status === 'approved' && !isRoom ? (
        <InlineAlert
          tone="success"
          title="You are connected"
          message="Agree on the details over messages before you sign anything."
          actionLabel={onOpen ? 'View profile' : undefined}
          onAction={onOpen}
        />
      ) : null}

      {onDecide ? (
        <View style={styles.demoBox}>
          <AppText variant="caption" color={colors.textMuted}>
            Demo control — a real landlord would answer here.
          </AppText>
          <View style={styles.cardActions}>
            <Button
              label="Simulate approval"
              variant="secondary"
              size="sm"
              icon="checkmark"
              isLoading={isBusy}
              onPress={() => onDecide('approved')}
              style={styles.decideButton}
            />
            <Button
              label="Simulate rejection"
              variant="ghost"
              size="sm"
              icon="close"
              disabled={isBusy}
              onPress={() => onDecide('rejected')}
              style={styles.decideButton}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        {onOpen && application.status !== 'approved' ? (
          <Button
            label={isRoom ? 'View listing' : 'View profile'}
            variant="secondary"
            size="sm"
            onPress={onOpen}
            style={styles.actionButton}
          />
        ) : null}
        {application.status === 'pending' || application.status === 'approved' ? (
          <Button
            label="Cancel"
            variant="ghost"
            size="sm"
            icon="trash-outline"
            isLoading={isBusy}
            onPress={onCancel}
            style={styles.actionButton}
          />
        ) : null}
      </View>
    </View>
  );
}

function Fact({ icon, text }: { icon: import('@/lib/types').IconName; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <AppText variant="caption">{text}</AppText>
    </View>
  );
}

function EmptyApplications({ tab }: { tab: Tab }) {
  const router = useRouter();
  const isRoom = tab === 'room';

  return (
    <EmptyState
      icon={isRoom ? 'bed-outline' : 'people-outline'}
      title={isRoom ? 'No room applications yet' : 'No roommate requests yet'}
      message={
        isRoom
          ? 'Apply to a listing and it appears here with its status, along with a demo control so you can see what an answer looks like.'
          : 'Send a request to someone who scores well and it appears here. You can keep browsing in the meantime — nothing is committed until you do.'
      }
      actionLabel={isRoom ? 'Browse rooms' : 'Find roommates'}
      onAction={() => router.push(`/(app)/(tabs)/${isRoom ? 'rooms' : 'roommates'}`)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tabButton: { flex: 1 },

  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardTitleBlock: { flex: 1, gap: 2 },
  facts: { gap: spacing.xxs },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  note: { fontStyle: 'italic' },

  demoBox: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },

  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  actionButton: { flexGrow: 1, flexBasis: 120 },
  decideButton: { flexGrow: 1, flexBasis: 140 },
});