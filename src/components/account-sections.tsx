import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText, Button, Card, Divider, InlineAlert } from '@/components/ui';
import type { IconName } from '@/constants/options';
import type { ProfileRow } from '@/lib/database.types';
import { colors, hitSlop, layout, spacing } from '@/theme';

/* ------------------------------------------------------------------ */
/* Navigable row                                                       */
/* ------------------------------------------------------------------ */

export interface AccountRowProps {
  label: string;
  value?: string;
  icon: IconName;
  onPress?: () => void;
  /** Renders a right-hand toggle instead of a chevron. */
  switchValue?: boolean;
  onSwitchChange?: (next: boolean) => void;
  danger?: boolean;
  disabled?: boolean;
}

export function AccountRow({
  label,
  value,
  icon,
  onPress,
  switchValue,
  onSwitchChange,
  danger = false,
  disabled = false,
}: AccountRowProps) {
  const tint = danger ? colors.danger : colors.textSecondary;
  const content = (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <Ionicons name={icon} size={19} color={tint} style={{ width: 24 }} />
      <View style={styles.rowText}>
        <AppText variant="body" color={danger ? colors.danger : colors.text}>
          {label}
        </AppText>
        {value ? (
          <AppText variant="caption" numberOfLines={1}>
            {value}
          </AppText>
        ) : null}
      </View>
      {switchValue !== undefined && onSwitchChange ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          accessibilityLabel={label}
          disabled={disabled}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={switchValue ? colors.primary : colors.surface}
        />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${value ? `: ${value}` : ''}`}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={({ pressed }) => (pressed ? styles.rowPressed : undefined)}
    >
      {content}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Notification preferences                                            */
/* ------------------------------------------------------------------ */

export type NotificationPreferenceKey =
  | 'notify_booking_updates'
  | 'notify_roommate_requests'
  | 'notify_listing_updates';

/**
 * In-app notification switches.
 *
 * These control what the database writes to the `notifications` table, not the
 * OS-level push permission, which is requested separately on first sign-in.
 * `onToggle` owns the write so the caller can keep its cached profile in sync.
 */
export function NotificationPreferences({
  profile,
  onToggle,
}: {
  profile: ProfileRow;
  onToggle: (key: NotificationPreferenceKey, next: boolean) => Promise<boolean>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<NotificationPreferenceKey | null>(null);

  const toggle = async (key: NotificationPreferenceKey) => {
    const next = !profile[key];
    setBusyKey(key);
    setError(null);

    const saved = await onToggle(key, next);
    setBusyKey(null);

    if (!saved) {
      setError('That preference could not be saved. Please try again.');
    }
  };

  return (
    <Card style={styles.card}>
      <AppText variant="heading" accessibilityRole="header">
        Notifications
      </AppText>
      <AppText variant="caption">
        Choose which updates appear in your notification centre.
      </AppText>

      <Divider />

      <AccountRow
        label="Booking and rental requests"
        icon="calendar-outline"
        switchValue={profile.notify_booking_updates}
        onSwitchChange={() => {
          void toggle('notify_booking_updates');
        }}
        disabled={busyKey !== null}
      />
      <AccountRow
        label="Roommate requests"
        icon="people-outline"
        switchValue={profile.notify_roommate_requests}
        onSwitchChange={() => {
          void toggle('notify_roommate_requests');
        }}
        disabled={busyKey !== null}
      />
      <AccountRow
        label="Listing updates"
        icon="home-outline"
        switchValue={profile.notify_listing_updates}
        onSwitchChange={() => {
          void toggle('notify_listing_updates');
        }}
        disabled={busyKey !== null}
      />

      {error ? <InlineAlert tone="danger" message={error} /> : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Session + destructive actions                                       */
/* ------------------------------------------------------------------ */

export function SessionActions({
  onSignOut,
  onDeleteAccount,
}: {
  onSignOut: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <Card style={styles.card}>
      <Button label="Sign out" variant="outline" icon="log-out-outline" onPress={onSignOut} fullWidth />

      <Divider />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete my account"
        onPress={onDeleteAccount}
        style={styles.dangerRow}
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <AppText variant="body" color={colors.danger}>
          Delete my account
        </AppText>
      </Pressable>
      <AppText variant="caption">
        Permanently removes your profile, listings, requests and saved items. This cannot be undone.
      </AppText>
    </Card>
  );
}

/** Confirmation wrapper so both roles share one copy of the warning. */
export function confirmSignOut(onConfirm: () => void): void {
  Alert.alert('Sign out of RoomLink?', 'You can sign back in at any time.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: onConfirm },
  ]);
}

export function confirmDeleteAccount(onConfirm: () => void): void {
  Alert.alert(
    'Delete your account?',
    'This permanently removes your profile, listings, requests and saved items. There is no way to undo this.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: onConfirm },
    ],
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.controlHeight,
    paddingVertical: spacing.xs,
  },
  rowText: { flex: 1, gap: 1 },
  rowDisabled: { opacity: 0.5 },
  rowPressed: { opacity: 0.7 },
  card: { padding: spacing.lg, gap: spacing.md },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.controlHeight,
  },
});