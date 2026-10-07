import { useMemo } from 'react';

import { useApp } from './use-app';
import type { Application, RoommateRequestStatus } from '@/lib/types';

/**
 * Room applications and roommate requests as one newest-first list, plus the
 * counts the dashboard and profile tiles render.
 */
export function useApplications() {
  const { applications, roommateRequests, cancelApplication, isLoading } = useApp();

  return useMemo(() => {
    const all: Application[] = [...applications, ...roommateRequests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const counts = all.reduce(
      (acc, application) => {
        acc[application.status] += 1;
        acc.total += 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, cancelled: 0, total: 0 },
    );

    return {
      isLoading,
      applications: all,
      roomApplications: applications,
      roommateRequests,
      counts,
      cancelApplication,
    };
  }, [applications, roommateRequests, cancelApplication, isLoading]);
}

/**
 * Outgoing request statuses keyed by roommate id.
 *
 * The fixtures always carry `requestStatus: null`; this is how a roommate card
 * knows a request is already pending or accepted.
 */
export function useRoommateRequestMap(): Map<string, RoommateRequestStatus> {
  const { roommateRequests } = useApp();

  return useMemo(() => {
    const map = new Map<string, RoommateRequestStatus>();
    for (const request of roommateRequests) {
      if (!request.roommateId) continue;
      map.set(
        request.roommateId,
        request.status === 'cancelled' ? 'cancelled' : request.status,
      );
    }
    return map;
  }, [roommateRequests]);
}