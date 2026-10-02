import { useCallback, useMemo, useState } from 'react';

import { ok } from '@/lib/errors';
import { bookingService, type BookingWithProperty } from '@/services/booking-service';
import type { BookingStatus } from '@/lib/database.types';
import { useAsyncData } from './use-async-data';

export type BookingFilter = 'all' | BookingStatus;

export interface UseBookingsResult {
  items: BookingWithProperty[];
  counts: Record<BookingFilter, number>;
  filter: BookingFilter;
  setFilter: (filter: BookingFilter) => void;
  isLoading: boolean;
  isInitialLoading: boolean;
  /** Failure of the list read itself, which the panel renders as an error state. */
  error: string | null;
  /** Failure of the last write, rendered inline above the list. */
  actionError: string | null;
  /** True while any status mutation is in flight, so buttons can disable. */
  actionPending: boolean;
  clearActionError: () => void;
  refresh: () => Promise<void>;
  cancel: (bookingId: string) => Promise<boolean>;
  approve: (bookingId: string) => Promise<boolean>;
  reject: (bookingId: string, reason: string) => Promise<boolean>;
  confirmReschedule: (bookingId: string) => Promise<boolean>;
}

function filterBookings(rows: BookingWithProperty[], filter: BookingFilter): BookingWithProperty[] {
  if (filter === 'all') return rows;
  return rows.filter((row) => row.booking.status === filter);
}

function countByStatus(rows: BookingWithProperty[]): Record<BookingFilter, number> {
  const counts: Record<BookingFilter, number> = {
    all: rows.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  };
  for (const row of rows) {
    counts[row.booking.status] += 1;
  }
  return counts;
}

/** Shared hook for both the student Bookings tab and the landlord request list. */
export function useBookings(
  viewerId: string | undefined,
  mode: 'student' | 'landlord',
): UseBookingsResult {
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const state = useAsyncData<BookingWithProperty[]>(
    async () => {
      if (!viewerId) return ok([]);
      return mode === 'student'
        ? bookingService.listForUser(viewerId)
        : bookingService.listForLandlord(viewerId);
    },
    [viewerId, mode],
    { enabled: Boolean(viewerId) },
  );

  const rows = state.data ?? [];
  const items = useMemo(() => filterBookings(rows, filter), [rows, filter]);
  const counts = useMemo(() => countByStatus(rows), [rows]);

  const applyStatus = useCallback(
    async (
      bookingId: string,
      status: BookingStatus,
      reason?: string,
    ): Promise<boolean> => {
      setActionError(null);
      setActionPending(true);
      try {
        const result = await bookingService.setStatus(bookingId, status, reason);
        if (!result.ok) {
          setActionError(result.error.message);
          return false;
        }
        void state.reload();
        return true;
      } finally {
        setActionPending(false);
      }
    },
    [state],
  );

  const cancel = useCallback(
    (bookingId: string) => applyStatus(bookingId, 'cancelled'),
    [applyStatus],
  );
  const approve = useCallback(
    (bookingId: string) => applyStatus(bookingId, 'approved'),
    [applyStatus],
  );
  const reject = useCallback(
    (bookingId: string, reason: string) => applyStatus(bookingId, 'rejected', reason),
    [applyStatus],
  );

  const confirmReschedule = useCallback(
    async (bookingId: string): Promise<boolean> => {
      setActionError(null);
      setActionPending(true);
      try {
        const result = await bookingService.confirmReschedule(bookingId);
        if (!result.ok) {
          setActionError(result.error.message);
          return false;
        }
        void state.reload();
        return true;
      } finally {
        setActionPending(false);
      }
    },
    [state],
  );

  return {
    items,
    counts,
    filter,
    setFilter,
    isLoading: state.isLoading,
    isInitialLoading: state.isInitialLoading,
    error: state.error,
    actionError,
    /** True while any status mutation is in flight. */
    actionPending,
    clearActionError: () => setActionError(null),
    refresh: state.reload,
    cancel,
    approve,
    reject,
    confirmReschedule,
  };
}