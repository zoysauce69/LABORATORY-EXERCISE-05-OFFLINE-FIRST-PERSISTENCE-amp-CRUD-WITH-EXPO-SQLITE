import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SmartImage } from '@/components/image';
import { RequestSheet } from '@/components/request-sheet';
import { RoomCard } from '@/components/room-card';
import { ScreenHeader } from '@/components/screen-header';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  InlineAlert,
} from '@/components/ui';
import { useApp } from '@/hooks/use-app';
import { featuredRooms } from '@/lib/mock-data';
import { getRoom } from '@/services/room-service';
import { lifestyleSummary } from '@/constants/options';
import { formatMonthlyRent, formatRelativeFuture } from '@/utils/format';
import { colors, layout, radii, spacing } from '@/theme';

/**
 * A room listing, in full.
 *
 * Occupancy is the headline rather than the photos, because the reason RoomLink
 * exists is that a cheap room is only a good deal if you can live with the people
 * already in it. So who is there, how well they match, and when the slot opens
 * all appear before the description.
 */
export default function RoomDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, savedRoomIds, toggleSavedRoom, applyToRoom, applications } = useApp();

  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const room = useMemo(() => getRoom(id ?? ''), [id]);
  const isSaved = room ? savedRoomIds.includes(room.id) : false;

  // An existing live application changes the primary action from "Apply" to
  // "Track it", rather than letting someone send a second one.
  const liveApplication = room
    ? applications.find(
        (a) => a.roomId === room.id && (a.status === 'pending' || a.status === 'approved'),
      )
    : undefined;

  const similar = useMemo(
    () => (room ? featuredRooms().filter((other) => other.id !== room.id).slice(0, 3) : []),
    [room],
  );

  if (!room) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Room" />
        <EmptyState
          icon="help-circle-outline"
          title="That room is no longer listed"
          message="It may have been rented since you last looked. Here is what is available now."
          actionLabel="Browse rooms"
          onAction={() => router.replace('/(app)/(tabs)/rooms')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.gallery}>
        <SmartImage
          uri={room.images[activeImage] ?? room.images[0] ?? null}
          style={styles.heroImage}
          accessibilityLabel={`${room.title}, photo ${activeImage + 1} of ${room.images.length}`}
        />

        <View style={styles.galleryTop} pointerEvents="box-none">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/rooms'))}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={() => void toggleSavedRoom(room.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSaved }}
            accessibilityLabel={isSaved ? 'Remove from saved' : 'Save this room'}
            style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={20}
              color={isSaved ? colors.primary : colors.text}
            />
          </Pressable>
        </View>

        {room.images.length > 1 ? (
          <View style={styles.dots} pointerEvents="none">
            {room.images.map((image, index) => (
              <View
                key={image}
                style={[styles.dot, index === activeImage && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.stickyHeader}>
        <ScreenHeader
          title={room.title}
          subtitle={`${room.barangay}, ${room.city}`}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/rooms'))}
          right={
            <Pressable
              onPress={() => setActiveImage(0)}
              accessibilityRole="button"
              accessibilityLabel={`Photo ${activeImage + 1} of ${room.images.length}`}
              style={({ pressed }) => [styles.imageCounter, pressed && styles.pressed]}
            >
              <Ionicons name="images-outline" size={14} color={colors.textSecondary} />
              <AppText variant="caption">
                {activeImage + 1}/{room.images.length}
              </AppText>
            </Pressable>
          }
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Price and availability ────────────────────────────── */}
        <View style={styles.priceRow}>
          <View>
            <AppText variant="price">{formatMonthlyRent(room.monthlyRent)}</AppText>
            <AppText variant="caption">
              {formatMonthlyRent(room.advanceAmount)} advance
            </AppText>
          </View>
          <View style={styles.priceRight}>
            {room.isFeatured ? <Badge label="Featured" tone="info" icon="star" /> : null}
            <Badge
              label={`${room.rating.toFixed(1)} · ${room.reviewCount} reviews`}
              tone="neutral"
              icon="star-outline"
            />
          </View>
        </View>

        <InlineAlert
          tone={room.availableSlots > 0 ? 'success' : 'danger'}
          title={
            room.availableSlots > 0
              ? `Free ${formatRelativeFuture(room.availableFrom)}`
              : 'Fully booked right now'
          }
          message={
            room.availableSlots > 0
              ? `${room.availableSlots} of ${room.capacity} ${room.capacity === 1 ? 'slot' : 'slots'} still open · minimum stay ${room.minStayMonths} ${room.minStayMonths === 1 ? 'month' : 'months'}`
              : 'This listing is full. Save it and we will keep it in your list in case someone moves out.'
          }
        />

        {/* ── Occupants ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            Who you would be living with
          </AppText>

          {room.occupants.length === 0 ? (
            <Card style={styles.emptyOccupants}>
              <Ionicons name="home-outline" size={22} color={colors.primary} />
              <AppText variant="bodyStrong">Nobody else is there yet</AppText>
              <AppText variant="caption">
                The whole unit is yours for the length of your stay.
              </AppText>
            </Card>
          ) : (
            room.occupants.map((occupant) => (
              <View key={occupant.id} style={styles.occupantRow}>
                <Avatar uri={occupant.avatarUrl} name={occupant.name} size={layout.avatarMd} />
                <View style={styles.occupantText}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {occupant.name}
                  </AppText>
                  <AppText variant="caption" numberOfLines={1}>
                    {occupant.occupation}
                  </AppText>
                </View>
                <Badge
                  label={`${occupant.compatibility}% match`}
                  tone={
                    occupant.compatibility >= 80
                      ? 'success'
                      : occupant.compatibility >= 60
                        ? 'warning'
                        : 'danger'
                  }
                />
              </View>
            ))
          )}

          {room.occupants.length > 0 ? (
            <AppText variant="caption">
              Matched against your profile: {lifestyleSummary(profile.lifestyle)}. Edit your
              lifestyle to see these numbers change.
            </AppText>
          ) : null}
        </View>

        <Divider />

        {/* ── Details ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            About this place
          </AppText>
          <AppText variant="body">{room.description}</AppText>

          <View style={styles.facts}>
            <Fact icon="location-outline" label="Location" value={`${room.barangay}, ${room.city}`} />
            <Fact icon="navigate-outline" label="Landmark" value={room.landmark} />
            <Fact
              icon="calendar-outline"
              label="Available"
              value={formatRelativeFuture(room.availableFrom)}
            />
            <Fact
              icon="people-outline"
              label="Capacity"
              value={`${room.capacity} ${room.capacity === 1 ? 'person' : 'people'} max`}
            />
            <Fact
              icon="wallet-outline"
              label="Advance"
              value={`${formatMonthlyRent(room.advanceAmount)} (deposit + first month)`}
            />
            <Fact
              icon="calendar-number-outline"
              label="Minimum stay"
              value={`${room.minStayMonths} ${room.minStayMonths === 1 ? 'month' : 'months'}`}
            />
          </View>
        </View>

        <Divider />

        {/* ── Amenities ────────────────────────────────────────── */}
        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            What is included
          </AppText>
          <View style={styles.amenities}>
            {room.amenities.map((amenity) => (
              <View key={amenity.slug} style={styles.amenity}>
                <Ionicons name={amenity.icon} size={16} color={colors.primary} />
                <AppText variant="caption">{amenity.label}</AppText>
              </View>
            ))}
          </View>
        </View>

        {room.houseRules.length > 0 ? (
          <>
            <Divider />
            <View style={styles.section}>
              <AppText variant="heading" accessibilityRole="header">
                House rules
              </AppText>
              {room.houseRules.map((rule) => (
                <View key={rule} style={styles.ruleRow}>
                  <Ionicons name="ellipse" size={6} color={colors.textMuted} />
                  <AppText variant="body" style={styles.ruleText}>
                    {rule}
                  </AppText>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Divider />

        {/* ── Landlord ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            Your landlord
          </AppText>
          <View style={styles.occupantRow}>
            <Avatar
              uri={room.landlord.avatarUrl}
              name={room.landlord.name}
              size={layout.avatarMd}
              verified={room.landlord.verified}
            />
            <View style={styles.occupantText}>
              <AppText variant="bodyStrong">{room.landlord.name}</AppText>
              <AppText variant="caption">Usually replies {room.landlord.responseTime}</AppText>
            </View>
          </View>
        </View>

        {similar.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="heading" accessibilityRole="header">
              Similar places
            </AppText>
            <View style={styles.similarList}>
              {similar.map((other) => (
                <RoomCard
                  key={other.id}
                  room={other}
                  variant="compact"
                  onPress={() => router.push(`/(app)/room/${other.id}`)}
                  onToggleSave={() => void toggleSavedRoom(other.id)}
                  isSaved={savedRoomIds.includes(other.id)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Sticky action bar ─────────────────────────────────── */}
      <View style={styles.actionBar}>
        <Pressable
          onPress={() => void toggleSavedRoom(room.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: isSaved }}
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save this room'}
          style={({ pressed }) => [styles.actionSecondary, pressed && styles.pressed]}
        >
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={22}
            color={isSaved ? colors.primary : colors.textSecondary}
          />
        </Pressable>

        {liveApplication ? (
          <Button
            label={liveApplication.status === 'approved' ? 'Approved — view request' : 'Application pending'}
            variant="secondary"
            size="lg"
            icon="document-text-outline"
            onPress={() => router.push('/(app)/applications')}
            style={styles.actionPrimary}
          />
        ) : (
          <Button
            label="Apply to this room"
            size="lg"
            icon="paper-plane-outline"
            disabled={room.availableSlots <= 0}
            onPress={() => setIsRequestOpen(true)}
            style={styles.actionPrimary}
          />
        )}
      </View>

      <RequestSheet
        visible={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        profile={profile}
        subject={{
          title: 'Send your application',
          subtitle: `${room.title} · ${formatMonthlyRent(room.monthlyRent)}`,
        }}
        maxOccupants={room.capacity}
        duplicateMessage={`You already have a ${liveApplication?.status ?? 'pending'} application for this room.`}
        onSubmit={async (draft) => {
          const result = await applyToRoom({ ...draft, kind: 'room', roomId: room.id });
          return result.ok
            ? { ok: true }
            : { ok: false, error: result.error.message };
        }}
      />
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function Fact({
  icon,
  label,
  value,
}: {
  icon: import('@/lib/types').IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={16} color={colors.textMuted} style={styles.factIcon} />
      <AppText variant="caption" style={styles.factLabel}>
        {label}
      </AppText>
      <AppText variant="caption" style={styles.factValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  gallery: { height: layout.galleryImageHeight, backgroundColor: colors.surfaceMuted },
  heroImage: { width: '100%', height: '100%' },
  galleryTop: {
    position: 'absolute',
    top: spacing.lg,
    left: layout.screenPadding,
    right: layout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  pressed: { opacity: 0.7 },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  dotActive: { backgroundColor: colors.white, width: 18 },

  stickyHeader: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  imageCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },

  scroll: { flex: 1 },
  content: { padding: layout.screenPadding, gap: spacing.lg, paddingBottom: spacing.huge },

  priceRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  priceRight: { alignItems: 'flex-end', gap: spacing.xs },

  section: { gap: spacing.md },
  emptyOccupants: { padding: spacing.lg, gap: spacing.xs },
  occupantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  occupantText: { flex: 1, gap: 1 },

  facts: { gap: spacing.sm },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  factIcon: { width: 18 },
  factLabel: { width: 96 },
  factValue: { flex: 1 },

  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },

  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.xxs },
  ruleText: { flex: 1 },

  similarList: { gap: spacing.md },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: layout.screenPadding,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  actionSecondary: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPrimary: { flex: 1 },
});