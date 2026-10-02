import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui';
import {
  BOOKING_STATUS_LABEL,
  ROOMMATE_STATUS_LABEL,
  VERIFICATION_STATUS_LABEL,
  bookingStatusTone,
  type BadgeTone,
  type IconName,
  roommateStatusTone,
  verificationStatusTone,
} from '@/constants/options';
import { colors } from '@/theme';
import type { BookingStatus, RoommateRequestStatus, VerificationStatus } from '@/lib/database.types';

const ICONS: Record<BadgeTone, IconName> = {
  neutral: 'ellipse-outline',
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'time-outline',
  danger: 'close-circle',
};

interface StatusBadgeProps {
  label: string;
  tone: BadgeTone;
  /** Hides the dot/icon for dense layouts such as list rows. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

function StatusBadgeBase({ label, tone, compact = false, style }: StatusBadgeProps) {
  return <Badge label={label} tone={tone} icon={compact ? undefined : ICONS[tone]} style={style} />;
}

export function BookingStatusBadge({
  status,
  ...rest
}: { status: BookingStatus } & Omit<StatusBadgeProps, 'label' | 'tone'>) {
  return <StatusBadgeBase label={BOOKING_STATUS_LABEL[status]} tone={bookingStatusTone(status)} {...rest} />;
}

export function RoommateStatusBadge({
  status,
  ...rest
}: { status: RoommateRequestStatus } & Omit<StatusBadgeProps, 'label' | 'tone'>) {
  return (
    <StatusBadgeBase label={ROOMMATE_STATUS_LABEL[status]} tone={roommateStatusTone(status)} {...rest} />
  );
}

export function VerificationStatusBadge({
  status,
  ...rest
}: { status: VerificationStatus } & Omit<StatusBadgeProps, 'label' | 'tone'>) {
  return (
    <StatusBadgeBase
      label={VERIFICATION_STATUS_LABEL[status]}
      tone={verificationStatusTone(status)}
      {...rest}
    />
  );
}

/** The Verified landlord tick used next to names on cards. */
export function VerifiedMark({ size = 15 }: { size?: number }) {
  return (
    <View style={styles.verified} accessibilityRole="image" accessibilityLabel="Verified landlord">
      <Ionicons name="checkmark-circle" size={size} color={colors.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  verified: { alignSelf: 'center' },
});