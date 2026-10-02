import type { ReactNode } from 'react';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import type { BookingWithProperty } from '@/services/booking-service';
import type { BookingFilter } from '@/hooks/use-bookings';
import { useBookings } from '@/hooks/use-bookings';
import { BookingCard } from '@/components/booking-card';
import { RejectRequestSheet } from '@/components/reject-request-sheet';
import { AppText, EmptyState, ErrorState, PropertyCardSkeleton } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

const FILTERS: { value: BookingFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
];

export interface BookingsPanelProps {
  viewerId: string | undefined;
  perspective: 'student' | 'landlord';
  onOpen: (item: BookingWithProperty) => void;
  /** Rendered above the status filters, e.g. the tab heading. */
  header?: ReactNode;
}

/**
 * Booking list shared by the student Bookings tab and the landlord requests tab.
 *
 * The panel owns the single `useBookings` instance and the decline sheet, so a
 * decline cannot be written through one hook while the list is rendered from
 * another.
 */
export function BookingsPanel({
  viewerId,
  perspective,
  onOpen,
  header,
}: BookingsPanelProps) {
  const bookings = useBookings(viewerId, perspective);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<BookingWithProperty | null>(null);

  const runAction = async (id: string, action: () => Promise<boolean>) => {
    setBusyId(id);
    await action();
    setBusyId(null);
  };

  const changeFilter = (next: BookingFilter) => {
    // A stale write error from the previous filter is noise, not information.
    bookings.clearActionError();
    bookings.setFilter(next);
  };

  const submitRejection = async (reason: string) => {
    if (!rejecting) return false;
    const saved = await bookings.reject(rejecting.booking.id, reason);
    if (saved) setRejecting(null);
    return saved;
  };

  const renderItem = ({ item }: { item: BookingWithProperty }) => (
    <BookingCard
      item={item}
      perspective={perspective}
      isPending={busyId === item.booking.id}
      onOpen={() => onOpen(item)}
      onCancel={
        perspective === 'student'
          ? () => {
              void runAction(item.booking.id, () => bookings.cancel(item.booking.id));
            }
          : undefined
      }
      onAcceptReschedule={
        perspective === 'student'
          ? () => {
              void runAction(item.booking.id, () => bookings.confirmReschedule(item.booking.id));
            }
          : undefined
      }
      onApprove={
        perspective === 'landlord'
          ? () => {
              void runAction(item.booking.id, () => bookings.approve(item.booking.id));
            }
          : undefined
      }
      onReject={perspective === 'landlord' ? () => setRejecting(item) : undefined}
    />
  );

  if (bookings.isInitialLoading) {
    return (
      <View style={styles.skeletonWrap}>
        <PropertyCardSkeleton />
        <PropertyCardSkeleton />
      </View>
    );
  }

  return (
    <>
      <FlatList
        testID={`bookings-list-${perspective}`}
        data={bookings.items}
        keyExtractor={(item) => item.booking.id}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        refreshControl={
          <RefreshControl
            refreshing={bookings.isLoading && !bookings.isInitialLoading}
            onRefresh={bookings.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {header}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTERS.map((filter) => {
                const active = bookings.filter === filter.value;
                const count = bookings.counts[filter.value];
                return (
                  <Pressable
                    key={filter.value}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${filter.label}, ${count}`}
                    onPress={() => changeFilter(filter.value)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <AppText
                      variant="captionStrong"
                      color={active ? colors.textInverse : colors.textSecondary}
                    >
                      {filter.label}
                      {count > 0 ? ` (${count})` : ''}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {bookings.actionError ? (
              <AppText variant="caption" color={colors.danger}>
                {bookings.actionError}
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          bookings.error ? (
            <ErrorState message={bookings.error} onRetry={bookings.refresh} />
          ) : bookings.filter === 'all' ? (
            <EmptyState
              icon={perspective === 'landlord' ? 'clipboard-outline' : 'calendar-outline'}
              title="No requests yet"
              message={
                perspective === 'landlord'
                  ? 'When a renter applies or asks for a viewing, it will appear here.'
                  : 'Apply to a listing or book a viewing and it will show up here.'
              }
            />
          ) : (
            <EmptyState
              icon="filter-outline"
              title="Nothing in this filter"
              message="Try a different status to see your other requests."
            />
          )
        }
        contentContainerStyle={[
          styles.content,
          bookings.items.length === 0 && styles.contentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <RejectRequestSheet
        visible={rejecting !== null}
        isSubmitting={bookings.actionPending}
        subject={
          rejecting
            ? `${rejecting.property?.title ?? 'This listing'} · ${rejecting.requester?.full_name ?? 'Renter'}`
            : undefined
        }
        onClose={() => setRejecting(null)}
        onSubmit={submitRejection}
      />
    </>
  );
}

function Separator() {
  return <View style={{ height: spacing.md }} />;
}

const styles = StyleSheet.create({
  skeletonWrap: { padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.sm, paddingBottom: spacing.md },
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    minHeight: 34,
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: colors.primary },
  content: { padding: spacing.lg, paddingBottom: spacing.huge },
  contentEmpty: { flexGrow: 1, justifyContent: 'center' },
});