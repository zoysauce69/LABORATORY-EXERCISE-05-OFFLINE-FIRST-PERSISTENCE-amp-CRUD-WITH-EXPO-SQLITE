import { useCallback, useMemo, useState } from 'react';

import { ok } from '@/lib/errors';
import { propertyService } from '@/services/property-service';
import { savedPropertyService } from '@/services/saved-service';
import type { PropertySearchResult } from '@/lib/database.types';
import type { SearchParams } from '@/services/property-service';
import { useAsyncData } from './use-async-data';

export interface UsePropertySearchResult {
  items: PropertySearchResult[];
  isLoading: boolean;
  isRefreshing: boolean;
  isInitialLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

const PAGE_SIZE = 12;

/**
 * Paged property search.
 *
 * All filtering is delegated to Postgres, so changing a filter re-queries rather
 * than filtering a cached array in JS.
 */
export function usePropertySearch(params: SearchParams, enabled = true): UsePropertySearchResult {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<PropertySearchResult[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Serialise the params so the effect key is stable between renders. The loader
  // closes over the real object, because `useAsyncData` always invokes the newest
  // one, so no JSON round-trip is needed to recover the typed params.
  const paramKey = useMemo(() => JSON.stringify(params), [params]);

  const state = useAsyncData<PropertySearchResult[]>(
    async () => {
      const result = await propertyService.searchPage({ ...params, limit: PAGE_SIZE, offset: 0 });
      if (!result.ok) return result;

      setItems(result.data.items);
      setHasMore(result.data.hasMore);
      return ok(result.data.items);
    },
    [paramKey],
    { enabled },
  );

  const loadMore = useCallback(async () => {
    if (state.isLoading || !hasMore) return;

    const next = page + 1;
    setPage(next);
    setIsRefreshing(true);

    const result = await propertyService.searchPage({
      ...params,
      limit: PAGE_SIZE,
      offset: next * PAGE_SIZE,
    });

    setIsRefreshing(false);
    if (result.ok) {
      setItems((current) => [...current, ...result.data.items]);
      setHasMore(result.data.hasMore);
    }
  }, [hasMore, page, params, state.isLoading]);

  const refresh = useCallback(() => {
    setPage(0);
    setItems([]);
    void state.reload();
  }, [state]);

  return {
    items,
    isLoading: state.isLoading,
    isRefreshing,
    isInitialLoading: state.isInitialLoading,
    error: state.error,
    hasMore,
    loadMore,
    refresh,
  };
}

/** Saved listings with save/unsave that re-reads the list from the server. */
export function useSavedProperties(userId: string | undefined, enabled = true) {
  const state = useAsyncData<PropertySearchResult[]>(
    async () => (userId ? savedPropertyService.list(userId) : ok([])),
    [userId],
    { enabled: enabled && Boolean(userId) },
  );

  /**
   * Toggles a saved listing.
   *
   * The list is re-read from the server afterwards rather than patched locally:
   * a newly saved row has no client-side data, and inventing a placeholder row
   * would show a blank card for a frame.
   */
  const toggle = useCallback(
    async (propertyId: string): Promise<boolean | null> => {
      if (!userId) return null;
      const result = await savedPropertyService.toggle(userId, propertyId);
      if (!result.ok) return null;

      if (result.data) {
        void state.reload();
      } else {
        state.setData((current) =>
          current ? current.filter((item) => item.id !== propertyId) : current,
        );
      }
      return result.data;
    },
    [state, userId],
  );

  return { ...state, toggle };
}