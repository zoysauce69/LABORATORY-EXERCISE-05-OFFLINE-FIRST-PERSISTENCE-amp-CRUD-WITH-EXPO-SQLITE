import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText, Avatar, Badge, Card } from '@/components/ui';
import { SmartImage } from '@/components/image';
import { colors, layout, radii, spacing } from '@/theme';
import { formatMonthlyRent, formatRelativeFuture } from '@/utils/format';
import { roomTypeLabel } from '@/services/room-service';
import type { Room } from '@/lib/types';

interface RoomCardProps {
  room: Room;
  onPress: () => void;
  onToggleSave?: () => void;
  isSaved?: boolean;
  /** `wide` is the full-width list row; `compact` fits a horizontal rail. */
  variant?: 'wide' | 'compact';
  testID?: string;
}

/**
 * A room listing.
 *
 * Shows the four things a renter filters on — rent, location, who is already
 * living there, and how soon it is free — because anything less and the card
 * is not enough to decide whether to tap through.
 */
function RoomCardComponent({
  room,
  onPress,
  onToggleSave,
  isSaved = false,
  variant = 'wide',
  testID,
}: RoomCardProps) {
  const imageHeight = variant === 'compact' ? 150 : layout.roomImageHeight;
  const city = room.distanceKm === null ? room.city : `${room.city} · ${room.distanceKm} km`;

  return (
    <Card
      onPress={onPress}
      style={variant === 'compact' ? styles.compactCard : undefined}
      accessibilityLabel={`${room.title}, ${formatMonthlyRent(room.monthlyRent)}, ${city}`}
      accessibilityHint="Opens the room details"
      testID={testID ?? `room-card-${room.id}`}
    >
      <View>
        <SmartImage
          uri={room.images[0] ?? null}
          style={{ height: imageHeight }}
          containerStyle={styles.imageContainer}
          accessibilityLabel={room.title}
        />

        <View style={styles.imageOverlayTop} pointerEvents="box-none">
          {room.isFeatured ? <Badge label="Featured" tone="info" icon="star" /> : <View />}
          {onToggleSave ? (
            <Pressable
              onPress={onToggleSave}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityState={{ selected: isSaved }}
              accessibilityLabel={isSaved ? 'Remove from saved' : 'Save this room'}
              style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={20}
                color={isSaved ? colors.primary : colors.text}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.imageOverlayBottom} pointerEvents="none">
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={13} color={colors.amber500} />
            <AppText variant="captionStrong" color={colors.text}>
              {room.rating.toFixed(1)}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              ({room.reviewCount})
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <AppText variant="caption" color={colors.primary}>
          {roomTypeLabel(room.roomType)} · {room.barangay}
        </AppText>
        <AppText variant="subheading" numberOfLines={1}>
          {room.title}
        </AppText>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <AppText variant="caption" numberOfLines={1} style={styles.metaText}>
            {city}
          </AppText>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <AppText variant="caption" numberOfLines={1} style={styles.metaText}>
            Free {formatRelativeFuture(room.availableFrom)} · {room.availableSlots}{' '}
            {room.availableSlots === 1 ? 'slot' : 'slots'} left
          </AppText>
        </View>

        {room.occupants.length > 0 ? (
          <View style={styles.occupantsRow}>
            <View style={styles.avatarStack}>
              {room.occupants.slice(0, 3).map((occupant, index) => (
                <View
                  key={occupant.id}
                  // Overlapping avatars are decorative; the count is below.
                  style={[styles.stackedAvatar, index > 0 && styles.stackedAvatarOffset]}
                >
                  <Avatar uri={occupant.avatarUrl} name={occupant.name} size={26} />
                </View>
              ))}
            </View>
            <AppText variant="caption" numberOfLines={1} style={styles.metaText}>
              Sharing with {room.occupants.map((o) => o.name.split(' ')[0]).join(', ')} ·{' '}
              {Math.max(...room.occupants.map((o) => o.compatibility))}% match
            </AppText>
          </View>
        ) : (
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <AppText variant="caption" numberOfLines={1} style={styles.metaText}>
              No current occupants — you would have the place to yourself
            </AppText>
          </View>
        )}

        <View style={styles.footer}>
          <View>
            <AppText variant="price">{formatMonthlyRent(room.monthlyRent)}</AppText>
            <AppText variant="caption">{formatMonthlyRent(room.advanceAmount)} to move in</AppText>
          </View>
          <View style={styles.amenityPreview}>
            {room.amenities.slice(0, 3).map((amenity) => (
              <View key={amenity.slug} style={styles.amenityChip}>
                <Ionicons name={amenity.icon} size={13} color={colors.textSecondary} />
              </View>
            ))}
            {room.amenities.length > 3 ? (
              <AppText variant="caption" color={colors.textMuted}>
                +{room.amenities.length - 3}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

export const RoomCard = memo(RoomCardComponent);

const styles = StyleSheet.create({
  compactCard: { width: 288 },

  imageContainer: { width: '100%', borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },

  imageOverlayTop: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  saveButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  saveButtonPressed: { opacity: 0.7 },

  imageOverlayBottom: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },

  body: { padding: spacing.lg, gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { flex: 1 },

  occupantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  avatarStack: { flexDirection: 'row' },
  stackedAvatar: {
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  stackedAvatarOffset: { marginLeft: -8 },

  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  amenityPreview: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  amenityChip: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
});