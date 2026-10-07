/**
 * In-app notifications.
 *
 * These are the local counterpart to the notifications screen: application
 * updates, roommate request outcomes, and new messages. Actions in the app push
 * to this list as well as mutating their own records, so the bell reflects what
 * just happened.
 */

import { fail, ok, type Result } from '@/lib/errors';
import { SEED_NOTIFICATIONS } from '@/lib/mock-data';
import { getNotifications, setNotifications } from '@/lib/storage';
import type { AppNotification, IconName, NotificationKind } from '@/lib/types';

let counter = 0;

function newId(): string {
  counter += 1;
  return `notif-${Date.now().toString(36)}-${counter}`;
}

/** Newest first. */
export async function listNotifications(): Promise<Result<AppNotification[]>> {
  const result = await getNotifications(SEED_NOTIFICATIONS);
  if (!result.ok) return fail(result.error.message, result.error.code);

  const sorted = [...result.data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return ok(sorted);
}

export async function unreadCount(): Promise<Result<number>> {
  const result = await listNotifications();
  if (!result.ok) return fail(result.error.message, result.error.code);
  return ok(result.data.filter((n) => !n.isRead).length);
}

export async function markRead(id: string): Promise<Result<true>> {
  const result = await listNotifications();
  if (!result.ok) return fail(result.error.message, result.error.code);

  const target = result.data.find((n) => n.id === id);
  if (!target || target.isRead) return ok(true);

  const written = await setNotifications(
    result.data.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
  );
  if (!written.ok) return fail(written.error.message, written.error.code);
  return ok(true);
}

export async function markAllRead(): Promise<Result<number>> {
  const result = await listNotifications();
  if (!result.ok) return fail(result.error.message, result.error.code);

  const unread = result.data.filter((n) => !n.isRead);
  if (unread.length === 0) return ok(0);

  const written = await setNotifications(result.data.map((n) => ({ ...n, isRead: true })));
  if (!written.ok) return fail(written.error.message, written.error.code);

  return ok(unread.length);
}

/**
 * Appends a notification. Called by the application and message services so a
 * new submission shows up in the bell immediately.
 */
export async function notify(input: {
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
}): Promise<Result<AppNotification>> {
  const notification: AppNotification = {
    id: newId(),
    kind: input.kind,
    title: input.title,
    body: input.body,
    isRead: false,
    createdAt: new Date().toISOString(),
    href: input.href ?? null,
  };

  const result = await listNotifications();
  if (!result.ok) return fail(result.error.message, result.error.code);

  const written = await setNotifications([notification, ...result.data]);
  if (!written.ok) return fail(written.error.message, written.error.code);

  return ok(notification);
}

export const NOTIFICATION_META: Record<
  NotificationKind,
  { label: string; icon: IconName; tone: 'info' | 'success' | 'warning' | 'neutral' }
> = {
  application_update: { label: 'Application', icon: 'document-text-outline', tone: 'success' },
  roommate_request: { label: 'Roommate', icon: 'people-outline', tone: 'warning' },
  message: { label: 'Message', icon: 'chatbubbles-outline', tone: 'neutral' },
};