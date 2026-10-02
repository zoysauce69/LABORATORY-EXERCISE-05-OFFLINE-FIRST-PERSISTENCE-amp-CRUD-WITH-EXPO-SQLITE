import { useCallback, useEffect, useState } from 'react';

import { ok } from '@/lib/errors';
import type { NotificationRow } from '@/lib/database.types';
import { inAppNotificationService, notificationService } from '@/services/notification-service';
import { useAsyncData } from './use-async-data';

export function useNotifications(userId: string | undefined) {
  const state = useAsyncData<NotificationRow[]>(
    async () => (userId ? inAppNotificationService.list(userId) : ok([])),
    [userId],
    { enabled: Boolean(userId) },
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const rows = state.data ?? [];
  const unreadCount = rows.filter((row) => row.read_at === null).length;

  const markRead = useCallback(
    async (id: string) => {
      setActionError(null);
      const result = await inAppNotificationService.markRead(id);
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      state.setData((current) =>
        current
          ? current.map((row) =>
              row.id === id ? { ...row, read_at: new Date().toISOString() } : row,
            )
          : current,
      );
    },
    [state],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setActionError(null);
    const result = await inAppNotificationService.markAllRead(userId);
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    void state.reload();
  }, [state, userId]);

  const remove = useCallback(
    async (id: string) => {
      setActionError(null);
      const result = await inAppNotificationService.remove(id);
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      state.setData((current) => (current ? current.filter((row) => row.id !== id) : current));
    },
    [state],
  );

  return { ...state, unreadCount, actionError, clearActionError: () => setActionError(null), markRead, markAllRead, remove };
}

/**
 * Asks for push permission once per install and stores the token.
 *
 * A failure here is not fatal: the in-app notification centre already contains
 * every status change, so the app stays fully functional.
 */
export function usePushRegistration(userId: string | undefined, enabled = true) {
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied' | 'unavailable'>('idle');

  useEffect(() => {
    if (!enabled || !userId || status !== 'idle') return;

    let cancelled = false;
    void (async () => {
      const result = await notificationService.registerForPush(userId);
      if (cancelled) return;
      setStatus(result.ok ? result.data : 'unavailable');
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId, status]);

  return { status, diagnostics: notificationService.diagnostics() };
}