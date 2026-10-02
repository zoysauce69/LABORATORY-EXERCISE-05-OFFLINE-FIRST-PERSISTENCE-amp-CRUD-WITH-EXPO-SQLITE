import { useCallback, useState } from 'react';

import { ok } from '@/lib/errors';
import { roommateService, type RoommateRequestWithPerson } from '@/services/roommate-service';
import { savedRoommateService } from '@/services/saved-service';
import type { RoommateMatchResult, RoommateProfileRow } from '@/lib/database.types';
import { useAsyncData } from './use-async-data';

export interface RoommateSearchFilters {
  query?: string | undefined;
  city?: string | undefined;
  minBudget?: number | undefined;
  maxBudget?: number | undefined;
  moveInBefore?: string | undefined;
}

export function useRoommateProfile(userId: string | undefined) {
  return useAsyncData<RoommateProfileRow | null>(
    async () => (userId ? roommateService.getMyProfile(userId) : ok(null)),
    [userId],
    { enabled: Boolean(userId) },
  );
}

export function useRoommateSearch(filters: RoommateSearchFilters, enabled = true) {
  const filterKey = JSON.stringify(filters);

  return useAsyncData<RoommateMatchResult[]>(
    async () => {
      const parsed = JSON.parse(filterKey) as RoommateSearchFilters;
      return roommateService.search({
        query: parsed.query ?? null,
        city: parsed.city ?? null,
        minBudget: parsed.minBudget ?? null,
        maxBudget: parsed.maxBudget ?? null,
        moveInBefore: parsed.moveInBefore ?? null,
      });
    },
    [filterKey],
    { enabled },
  );
}

export function useSavedRoommates(userId: string | undefined, enabled = true) {
  return useAsyncData<RoommateMatchResult[]>(
    async () => (userId ? savedRoommateService.list(userId) : ok([])),
    [userId],
    { enabled: enabled && Boolean(userId) },
  );
}

export function useRoommateRequests(userId: string | undefined) {
  return useAsyncData<RoommateRequestWithPerson[]>(
    async () => (userId ? roommateService.listRequests(userId) : ok([])),
    [userId],
    { enabled: Boolean(userId) },
  );
}

/**
 * Save/unsave a roommate profile.
 *
 * The saved list lives on the server; after a change we re-read it so the list
 * only ever contains rows the consent projection allows.
 */
export function useToggleSavedRoommate(userId: string | undefined) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const toggle = useCallback(
    async (roommateProfileId: string): Promise<boolean | null> => {
      if (!userId) return null;
      setPendingId(roommateProfileId);
      const result = await savedRoommateService.toggle(userId, roommateProfileId);
      setPendingId(null);
      return result.ok ? result.data : null;
    },
    [userId],
  );

  return { toggle, pendingId };
}