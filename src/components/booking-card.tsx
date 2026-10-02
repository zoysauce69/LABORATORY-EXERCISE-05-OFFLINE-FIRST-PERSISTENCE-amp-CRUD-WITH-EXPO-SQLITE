import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { AppText, Badge, Button, Card } from '@/components/ui';
import { BookingStatusBadge } from '@/components/status-badge';
import type { BookingWithProperty } from '@/services/booking-service';
import { imageService } from '@/services/image-service';
import { timeSlotLabel } from '@/utils/validation';
import {
  formatDate,
  formatMonthlyRent,
  formatTime,
  formatTimeAgo,
} from '@/utils/format';
import { colors, radii, spacing } from '@/theme';

export interface BookingCardProps {
  item: BookingWithProperty;
  /** 'student' hides the landlord's decision buttons. */
  perspective: 'student' | 'landlord';
  onOpen: () => void;
  onApprove?: (() => void) | undefined;
  onReject?: (() => void) | undefined;
  onCancel?: (() => void) | undefined;
  onAcceptReschedule?: (() => void) | undefined;
  isPending?: boolean;
}

/**
 * One row in either the student's Bookings tab or the landlord's requests list.
 *
 * The actions offered are derived from `booking.status`, so the same component
 * can never render an approve button on a request that was already cancelled.
 */
function BookingCardComponent({
  item,
  perspective,
  onOpen,
  onApprove,
  onReject,
  onCancel,
  onAcceptReschedule,
  isPending = false,
}: BookingCardProps) {
  const { booking, property, landlord, requester } = item;
  const isVisit = booking.kind === 'visit';
  const other = perspective === 'landlord' ? requester : landlord;
  const coverUrl = imageService.publicUrl(property?.cover_image_path, property?.cover_is_uploaded ?? false);

  const isPendingDecision = booking.status === 'pending';
  const hasRescheduleProposal = Boolean(booking.reschedule_date && booking.reschedule_time);

  const schedule = isVisit
    ? `${formatDate(booking.scheduled_date)} · ${timeSlotLabel(booking.scheduled_time ?? '')}`
    : `Move in ${formatDate(booking.move_in_date ?? booking.scheduled_date)}`;

  return (
    <Card
      onPress={onOpen}
      accessibilityLabel={`${isVisit ? 'Viewing request' : 'Rental application'} for ${property?.title ?? 'a listing'}, ${booking.status}`}
      accessibilityHint="Opens the full request"
      style={styles.card}
      testID={`booking-card-${booking.id}`}
    >
      <View style={styles.header}>
        <Badge
          label={isVisit ? 'Viewing' : 'Application'}
          tone="info"
          icon={isVisit ? 'eye-outline' : 'document-text-outline'}
        />
        <BookingStatusBadge status={booking.status} compact />
      </View>

      <View style={styles.main}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Ionicons name="home-outline" size={20} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.details}>
          <AppText variant="subheading" numberOfLines={1}>
            {property?.title ?? 'Listing unavailable'}
          </AppText>

          {property ? (
            <AppText variant="caption" numberOfLines={1}>
              {property.barangay}, {property.city} · {formatMonthlyRent(property.monthly_rent)}
            </AppText>
          ) : null}

          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <AppText variant="captionStrong" color={colors.primary} numberOfLines={1} style={{ flex: 1 }}>
              {schedule}
            </AppText>
          </View>

          {hasRescheduleProposal ? (
            <View style={styles.reschedule}>
              <Ionicons name="swap-horizontal" size={13} color={colors.warning} />
              <AppText variant="caption" color={colors.warning} style={{ flex: 1 }}>
                New time offered: {formatDate(booking.reschedule_date)} ·{' '}
                {formatTime(booking.reschedule_time)}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {other ? (
        <View style={styles.party}>
          <Ionicons name="person-outline" size={14} color={colors.textMuted} />
          <AppText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
            {perspective === 'landlord' ? 'From' : 'To'} {other.full_name}
            {booking.occupants ? ` · ${booking.occupants} occupant${booking.occupants === 1 ? '' : 's'}` : ''}
          </AppText>
        </View>
      ) : null}

      {booking.note ? (
        <View style={styles.note}>
          <AppText variant="caption" numberOfLines={3}>
            “{booking.note}”
          </AppText>
        </View>
      ) : null}

      {booking.status === 'rejected' && booking.rejection_reason ? (
        <View style={styles.rejection}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <AppText variant="caption" color={colors.danger} style={{ flex: 1 }}>
            {booking.rejection_reason}
          </AppText>
        </View>
      ) : null}

      <AppText variant="caption" color={colors.textMuted}>
        Requested {formatTimeAgo(booking.created_at)}
      </AppText>

      {(perspective === 'landlord' ? isPendingDecision : booking.status === 'pending') ? (
        <View style={styles.actions}>
          {perspective === 'student' && onCancel ? (
            <Button
              label="Cancel request"
              variant="outline"
              size="sm"
              icon="close"
              onPress={onCancel}
              isLoading={isPending}
              style={{ flex: 1 }}
            />
          ) : null}

          {perspective === 'student' && hasRescheduleProposal && onAcceptReschedule ? (
            <Button
              label="Accept new time"
              variant="secondary"
              size="sm"
              icon="checkmark"
              onPress={onAcceptReschedule}
              isLoading={isPending}
              style={{ flex: 1 }}
            />
          ) : null}

          {perspective === 'landlord' && onReject ? (
            <Button
              label="Decline"
              variant="outline"
              size="sm"
              icon="close"
              onPress={onReject}
              isLoading={isPending}
              style={{ flex: 1 }}
            />
          ) : null}

          {perspective === 'landlord' && onApprove ? (
            <Button
              label="Approve"
              variant="primary"
              size="sm"
              icon="checkmark"
              onPress={onApprove}
              isLoading={isPending}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

export const BookingCard = memo(BookingCardComponent);

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  main: { flexDirection: 'row', gap: spacing.md },
  cover: { width: 76, height: 76, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, gap: 2 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  reschedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  party: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  note: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  rejection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});