import { Platform } from 'react-native';
import * as Device from 'expo-device';

import { DEMO_MODE, effectiveDistanceMode } from '@/lib/config';
import { DEMO_NOTIFICATIONS } from '@/lib/demo-data';
import { ok, runCount, runQuery, type Result } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { NotificationRow } from '@/lib/database.types';
import { colors } from '@/theme';

type NotificationsModule = typeof import('expo-notifications');

let _notifications: NotificationsModule | null = null;
async function getNotifications(): Promise<NotificationsModule> {
  if (!_notifications) _notifications = await import('expo-notifications');
  return _notifications;
}

let handlerConfigured = false;

async function configureHandler(): Promise<void> {
  if (handlerConfigured) return;
  handlerConfigured = true;
  const N = await getNotifications();
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const N = await getNotifications();
  await N.setNotificationChannelAsync('bookings', {
    name: 'Booking updates',
    importance: N.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: colors.primary,
  });
}

export const notificationService = {
  async registerForPush(userId: string): Promise<Result<'granted' | 'denied' | 'unavailable'>> {
    if (DEMO_MODE || !Device.isDevice) return ok('unavailable');

    try {
      await configureHandler();
      await ensureAndroidChannel();
      const N = await getNotifications();

      const current = await N.getPermissionsAsync();
      let status = current.status;
      if (status !== 'granted') {
        const requested = await N.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted') return ok('denied');

      const token = await N.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      });

      const result = await runQuery('Save push token', () =>
        supabase.from('push_tokens').upsert(
          {
            user_id: userId,
            token: token.data,
            platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown',
          },
          { onConflict: 'token' },
        ).select('token'),
      );

      if (!result.ok) return ok('unavailable');
      return ok('granted');
    } catch {
      return ok('unavailable');
    }
  },

  async unregister(token: string): Promise<Result<true>> {
    const result = await runQuery('Remove push token', () =>
      supabase.from('push_tokens').delete().eq('token', token).select('token').single(),
    );
    if (!result.ok) return result;
    return ok(true);
  },

  diagnostics(): { supported: boolean; distanceMode: string; reason?: string } {
    return {
      supported: Device.isDevice,
      distanceMode: effectiveDistanceMode,
      reason: Device.isDevice ? undefined : 'Push tokens are only available on a physical device.',
    };
  },
};

export const inAppNotificationService = {
  async list(userId: string, limit = 50): Promise<Result<NotificationRow[]>> {
    if (DEMO_MODE) {
      return ok(DEMO_NOTIFICATIONS.filter((n) => n.user_id === userId).slice(0, limit));
    }
    return runQuery('Load notifications', () =>
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit),
    );
  },

  async unreadCount(userId: string): Promise<Result<number>> {
    if (DEMO_MODE) return ok(1);
    return runCount('Count unread', () =>
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null),
    );
  },

  async markRead(notificationId: string): Promise<Result<true>> {
    if (DEMO_MODE) return ok(true);
    const result = await runQuery('Mark notification read', () =>
      supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).select('id').single(),
    );
    if (!result.ok) return result;
    return ok(true);
  },

  async markAllRead(userId: string): Promise<Result<true>> {
    if (DEMO_MODE) return ok(true);
    const result = await runQuery('Mark all read', () =>
      supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null).select('id'),
    );
    if (!result.ok) return result;
    return ok(true);
  },

  async remove(notificationId: string): Promise<Result<true>> {
    if (DEMO_MODE) return ok(true);
    const result = await runQuery('Delete notification', () =>
      supabase.from('notifications').delete().eq('id', notificationId).select('id').single(),
    );
    if (!result.ok) return result;
    return ok(true);
  },
};
