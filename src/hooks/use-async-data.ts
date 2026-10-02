import { useCallback, useEffect, useRef, useState } from 'react';

import { toMessage } from '@/lib/errors';
import type { Result } from '@/lib/errors';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  /** True only on the very first load; used to show skeletons vs inline spinners. */
  isInitialLoading: boolean;
  reload: () => Promise<void>;
  setData: (updater: T | null | ((current: T | null) => T | null)) => void;
}

/**
 * Small data-fetching hook used by every screen.
 *
 * Deliberately not a caching library: each screen owns its own state and the
 * backend is the single source of truth. It handles the four states the brief
 * requires — loading, error, empty (via a null/empty `data`) and success — and
 * ignores results that arrive after unmount.
 */
export function useAsyncData<T>(
  loader: () => Promise<Result<T>>,
  deps: React.DependencyList,
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const { enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const current = ++requestId.current;
    setIsLoading(true);

    const result = await loaderRef.current();

    // A newer request superseded this one, or the screen unmounted.
    if (!mounted.current || current !== requestId.current) return;

    setIsLoading(false);
    setHasLoadedOnce(true);

    if (result.ok) {
      setError(null);
      setData(result.data);
    } else {
      setError(toMessage(result.error, 'Something went wrong.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const update = useCallback((updater: T | null | ((current: T | null) => T | null)) => {
    setData((current) =>
      typeof updater === 'function' ? (updater as (c: T | null) => T | null)(current) : updater,
    );
  }, []);

  return {
    data,
    error,
    isLoading,
    isInitialLoading: isLoading && !hasLoadedOnce,
    reload: run,
    setData: update,
  };
}

/**
 * Wraps a one-shot action (submit a form, toggle a save) with pending and error
 * state so buttons can disable themselves and screens can show an inline error
 * without duplicating that logic everywhere.
 */
export function useAction<Args extends unknown[], T>(
  action: (...args: Args) => Promise<Result<T>>,
): {
  run: (...args: Args) => Promise<Result<T>>;
  isPending: boolean;
  error: string | null;
  clearError: () => void;
} {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(async (...args: Args): Promise<Result<T>> => {
    setIsPending(true);
    setError(null);

    const result = await actionRef.current(...args);

    if (mounted.current) {
      setIsPending(false);
      if (!result.ok) {
        setError(toMessage(result.error, 'That did not work. Please try again.'));
      }
    }
    return result;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { run, isPending, error, clearError };
}