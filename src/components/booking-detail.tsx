import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/tab-screen-header';
import { RejectRequestSheet } from '@/components/reject-request-sheet';
import {
  AppText,
  Button,
  Card,
  Divider,
  InlineAlert,
  LoadingState,
  Screen,
} from '@/components/ui';
import { BookingStatusBadge } from '@/components/status-badge';
import { useAuth } from '@/hooks/use-auth';
import { useAction, useAsyncData } from '@/hooks/use-async-data';
import { bookingService } from '@/services/booking-service';
import type { BookingRow } from '@/lib/database.types';
import { fail, ok, type Result } from '@/lib/errors';
import {
  formatAppointment,
  formatDate,
  formatDateTime,
  formatMonthlyRent,
  formatTimeAgo,
} from '@/utils/format';
import type { BookingWithProperty } from '@/services/booking-service';
import { colors, spacing } from '@/theme';

export interface BookingDetailProps {
  /** Where "back" and the post-decision redirect should go. */
  backRoute: string;
  onOpenProperty?: (propertyId: string) => void;
}

/**
 * Read-only view of a single request plus the actions its status allows.
 *
 * Both roles mount this; `bookingService.getById` is the only read path, and it
 * is scoped to the two participants in the database, so a shared screen cannot
 * leak a booking between them.
 */
export function BookingDetail({ backRoute, onOpenProperty }: BookingDetailProps) {
  const router = useRouter();
  const { user, role } = useAuth();

  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = typeof id === 'string' ? id : '';

  const [reloadKey, setReloadKey] = useState(0);
  const [rejecting, setRejecting] = useState(false);

  const isLandlord = role === 'landlord';

  const detail = useAsyncData(
    async () =>
      user && bookingId.length > 0
        ? bookingService.getById(bookingId, user.id)
        : ok(null),
    [user?.id, bookingId, reloadKey],
    { enabled: Boolean(user) },
  );

  const actState = useAction(
    async (
      mode: 'approve' | 'cancel' | 'confirmReschedule' | 'reject',
      reason?: string,
    ): Promise<Result<BookingRow>> => {
      if (bookingId.length === 0) {
        return fail('That request link is missing its id.', 'missing_id');
      }

      switch (mode) {
        case 'cancel':
          return bookingService.cancel(bookingId);
        case 'confirmReschedule':
          return bookingService.confirmReschedule(bookingId);
        case 'approve':
          return bookingService.setStatus(bookingId, 'approved');
        case 'reject':
          return bookingService.setStatus(bookingId, 'rejected', reason);
      }
    },
  );

  const act = actState.run;

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  /** Runs a transition and re-reads only when the write actually landed. */
  const decide = useCallback(
    async (mode: 'approve' | 'cancel' | 'confirmReschedule') => {
      const result = await act(mode);
      if (result.ok) refresh();
      return result.ok;
    },
    [act, refresh],
  );

  const submitRejection = useCallback(
    async (reason: string) => {
      const result = await act('reject', reason);
      if (!result.ok) return false;
      setRejecting(false);
      refresh();
      return true;
    },
    [act, refresh],
  );

  if (detail.isInitialLoading) {
    return (
      <Screen>
        <LoadingState label="Loading request" />
      </Screen>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <Screen>
        <ScreenHeader title="Request" onBack={() => router.replace(backRoute)} />
        <InlineAlert
          tone="danger"
          title="Request unavailable"
          message={detail.error ?? 'This request does not exist, or it is not yours to view.'}
        />
      </Screen>
    );
  }

  const { booking, property, landlord, requester } = detail.data;
  const counterparty = isLandlord ? requester : landlord;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={booking.kind === 'visit' ? 'Viewing request' : 'Rental application'}
          onBack={() => router.replace(backRoute)}
        />

        <View style={styles.headline}>
          <BookingStatusBadge status={booking.status} />
          <AppText variant="caption" color={colors.textMuted}>
            Sent {formatTimeAgo(booking.created_at)}
          </AppText>
        </View>

        {actState.error ? <InlineAlert tone="danger" message={actState.error} /> : null}

        {booking.reschedule_date && booking.reschedule_time ? (
          <InlineAlert
            tone="warning"
            title="New time proposed"
            message={`${isLandlord ? 'The renter has' : 'The landlord has'} proposed ${formatAppointment(booking.reschedule_date, booking.reschedule_time)}. Original request: ${formatAppointment(booking.scheduled_date, booking.scheduled_time)}.`}
          />
        ) : null}

        {booking.status === 'rejected' && booking.rejection_reason ? (
          <Card style={styles.card}>
            <AppText variant="bodyStrong">Reason given</AppText>
            <AppText variant="body">{booking.rejection_reason}</AppText>
          </Card>
        ) : null}

        {property ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Listing
            </AppText>
            <AppText variant="bodyStrong">{property.title}</AppText>
            <AppText variant="caption">
              {property.barangay}, {property.city} · {formatMonthlyRent(property.monthly_rent)}
            </AppText>
            <Button
              label="Open listing"
              variant="outline"
              size="sm"
              icon="open-outline"
              onPress={() =>
                onOpenProperty ? onOpenProperty(property.id) : router.push(`/property/${property.id}`)
              }
            />
          </Card>
        ) : null}

        {booking.kind === 'visit' ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Appointment
            </AppText>
            <DetailRow label="Requested" value={formatAppointment(booking.scheduled_date, booking.scheduled_time)} />
            {booking.reschedule_date && booking.reschedule_time ? (
              <DetailRow
                label="Proposed"
                value={formatAppointment(booking.reschedule_date, booking.reschedule_time)}
                emphasise
              />
            ) : null}
          </Card>
        ) : (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Application
            </AppText>
            <DetailRow label="Move-in date" value={formatDate(booking.move_in_date)} />
            <DetailRow
              label="Occupants"
              value={booking.occupants === null ? 'Not stated' : String(booking.occupants)}
            />
          </Card>
        )}

        {counterparty ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              {isLandlord ? 'Applicant' : 'Landlord'}
            </AppText>
            <AppText variant="bodyStrong">{counterparty.full_name}</AppText>

            {booking.contact_name ? (
              <>
                <Divider />
                <AppText variant="caption" color={colors.textMuted}>
                  Contact details supplied with this request
                </AppText>
                <DetailRow label="Name" value={booking.contact_name} />
                <DetailRow label="Mobile" value={booking.contact_phone} />
                {booking.contact_email ? (
                  <DetailRow label="Email" value={booking.contact_email} />
                ) : null}
              </>
            ) : null}
          </Card>
        ) : null}

        {booking.note ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Note from the renter
            </AppText>
            <AppText variant="body">{booking.note}</AppText>
          </Card>
        ) : null}

        {booking.decided_at ? (
          <AppText variant="caption" color={colors.textMuted}>
            Decided {formatDateTime(booking.decided_at)}
          </AppText>
        ) : null}
      </ScrollView>

      <BookingActions
        item={{ booking, property, landlord, requester }}
        isLandlord={isLandlord}
        busy={actState.isPending}
        onApprove={() => void decide('approve')}
        onReject={() => setRejecting(true)}
        onCancel={() => void decide('cancel')}
        onConfirmReschedule={() => void decide('confirmReschedule')}
      />

      <RejectRequestSheet
        visible={rejecting}
        isSubmitting={actState.isPending}
        subject={property ? property.title : undefined}
        onClose={() => setRejecting(false)}
        onSubmit={submitRejection}
      />
    </Screen>
  );
}

interface BookingActionsProps {
  item: BookingWithProperty;
  isLandlord: boolean;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  onConfirmReschedule: () => void;
}

/**
 * Only renders the transitions the database actually allows from this status,
 * so the UI can never offer a change the RPC would refuse.
 */
function BookingActions({
  item,
  isLandlord,
  busy,
  onApprove,
  onReject,
  onCancel,
  onConfirmReschedule,
}: BookingActionsProps) {
  const { booking } = item;
  const hasReschedule =
    booking.reschedule_date !== null && booking.reschedule_time !== null;

  if (booking.status === 'pending') {
    if (isLandlord) {
      return (
        <View style={styles.actions}>
          <Button
            label="Decline"
            variant="outline"
            style={styles.flex}
            disabled={busy}
            onPress={onReject}
          />
          <Button label="Approve" style={styles.flex} isLoading={busy} onPress={onApprove} />
        </View>
      );
    }

    return (
      <View style={styles.actions}>
        {hasReschedule ? (
          <Button label="Accept new time" style={styles.flex} isLoading={busy} onPress={onConfirmReschedule} />
        ) : (
          <Button
            label="Withdraw request"
            variant="outline"
            style={styles.flex}
            isLoading={busy}
            onPress={onCancel}
          />
        )}
      </View>
    );
  }

  if (booking.status === 'approved' && !isLandlord) {
    return (
      <View style={styles.actions}>
        <Button
          label="Cancel booking"
          variant="outline"
          style={styles.flex}
          isLoading={busy}
          onPress={onCancel}
        />
      </View>
    );
  }

  return null;
}

function DetailRow({
  label,
  value,
  emphasise = false,
}: {
  label: string;
  value: string;
  emphasise?: boolean;
}) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant={emphasise ? 'bodyStrong' : 'body'}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.huge + 72 },
  headline: { gap: spacing.xs },
  card: { padding: spacing.lg, gap: spacing.sm },
  row: { gap: 2, paddingVertical: spacing.xs },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});