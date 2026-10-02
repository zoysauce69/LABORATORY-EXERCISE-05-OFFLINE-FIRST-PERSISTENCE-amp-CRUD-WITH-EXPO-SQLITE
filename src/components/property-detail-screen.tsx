import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { ScreenHeader } from '@/components/tab-screen-header';
import { VerifiedMark } from '@/components/status-badge';
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  InlineAlert,
  LoadingState,
  Screen,
} from '@/components/ui';
import { amenityIcon, propertyTypeLabel, type IconName } from '@/constants/options';
import { useAsyncData } from '@/hooks/use-async-data';
import { propertyService } from '@/services/property-service';
import { imageService } from '@/services/image-service';
import { effectiveDistanceMode } from '@/lib/config';
import type { NearbyPlace, PropertyImageRow } from '@/lib/database.types';
import {
  formatDate,
  formatDistance,
  formatMonthlyRent,
  formatNumber,
  formatTimeAgo,
  pluralUnitSummary,
} from '@/utils/format';
import { colors, radii, spacing } from '@/theme';

export interface PropertyDetailScreenProps {
  /** Hides the renter actions when the viewer is the owner. */
  showApplyActions: boolean;
  onEdit?: () => void;
}

/**
 * Listing detail, shared by the student and landlord flows.
 *
 * Read-only by design: anything a landlord can change lives behind the edit
 * route, so this screen never has to reason about who owns the record.
 */
export function PropertyDetailScreen({ showApplyActions, onEdit }: PropertyDetailScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeImage, setActiveImage] = useState(0);

  const { id } = useLocalSearchParams<{ id: string }>();
  const propertyId = typeof id === 'string' ? id : '';

  const detail = useAsyncData(async () => propertyService.getById(propertyId), [propertyId], {
    enabled: propertyId.length > 0,
  });

  if (detail.isInitialLoading) {
    return (
      <Screen>
        <LoadingState label="Loading listing…" />
      </Screen>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <Screen>
        <ScreenHeader title="Listing" onBack={() => router.back()} />
        <ErrorState
          title="Listing unavailable"
          message={detail.error ?? 'This listing may have been removed or unpublished.'}
          onRetry={detail.reload}
        />
      </Screen>
    );
  }

  const { property, images, amenities, landlord } = detail.data;
  const heroHeight = Math.round(width * 0.66);
  const coverUrl =
    imageService.publicUrl(images[0]?.storage_path, images[0]?.is_uploaded ?? false) ?? null;
  const available = Math.max(0, property.total_units - property.occupied_units);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Listing"
          onBack={() => router.back()}
          action={
            onEdit ? (
              <Button label="Edit" variant="outline" size="sm" icon="create-outline" onPress={onEdit} />
            ) : null
          }
        />

        <View>
          <View style={[styles.hero, { height: heroHeight }]}>
            {coverUrl ? (
              <Image
                source={{ uri: coverUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
                accessibilityLabel={`Photo of ${property.title}`}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.heroFallback]}>
                <Ionicons name="image-outline" size={36} color={colors.textMuted} />
                <AppText variant="caption">The landlord has not added photos yet.</AppText>
              </View>
            )}
          </View>

          {images.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbs}
            >
              {images.map((image: PropertyImageRow, index: number) => (
                <Pressable
                  key={image.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Show photo ${index + 1} of ${images.length}`}
                  accessibilityState={{ selected: index === activeImage }}
                  onPress={() => setActiveImage(index)}
                  style={[styles.thumb, index === activeImage && styles.thumbActive]}
                >
                  <Image
                    source={{ uri: imageService.publicUrl(image.storage_path, image.is_uploaded) ?? '' }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={120}
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.headline}>
          <View style={styles.priceRow}>
            <AppText variant="price">{formatMonthlyRent(property.monthly_rent)}</AppText>
            <Badge
              label={propertyTypeLabel(property.property_type)}
              tone="info"
              icon="home-outline"
            />
          </View>

          <AppText variant="title" accessibilityRole="header">
            {property.title}
          </AppText>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
            <AppText variant="caption" style={{ flex: 1 }}>
              {[property.barangay, property.city].filter(Boolean).join(', ')}
            </AppText>
          </View>

          {property.landmark ? (
            <View style={styles.locationRow}>
              <Ionicons name="flag-outline" size={15} color={colors.textSecondary} />
              <AppText variant="caption" style={{ flex: 1 }} numberOfLines={2}>
                {property.landmark}
              </AppText>
            </View>
          ) : null}

          <NearbyRow places={property.nearby_schools} icon="school-outline" />
          <NearbyRow places={property.nearby_workplaces} icon="briefcase-outline" />
        </View>

        <Card style={styles.card}>
          <View style={styles.statRow}>
            <HeadlineStat label="Move in" value={formatDate(property.available_from)} />
            <HeadlineStat label="Availability" value={pluralUnitSummary(property.total_units, property.occupied_units)} />
            <HeadlineStat label="Views" value={formatNumber(property.view_count)} />
          </View>

          {property.gender_preference !== 'any' ? (
            <InlineAlert
              tone="info"
              message={
                property.gender_preference === 'female_only'
                  ? 'This property accepts female tenants only.'
                  : 'This property accepts male tenants only.'
              }
            />
          ) : null}

          {available === 0 ? (
            <InlineAlert
              tone="warning"
              title="Fully occupied"
              message="Every unit here is taken. Save it and we will let you know if a slot opens up."
            />
          ) : null}
        </Card>

        {property.description ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              About this place
            </AppText>
            <AppText variant="body">{property.description}</AppText>
          </Card>
        ) : null}

        {amenities.length > 0 ? (
          <Card style={styles.card}>
            <AppText variant="heading" accessibilityRole="header">
              Amenities
            </AppText>
            <View style={styles.amenityGrid}>
              {amenities.map((amenity) => (
                <View key={amenity.id} style={styles.amenity}>
                  <Ionicons name={amenityIcon(amenity.slug)} size={17} color={colors.primary} />
                  <AppText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                    {amenity.label}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <AppText variant="heading" accessibilityRole="header">
            Costs
          </AppText>
          <FeeRow label="Monthly rent" value={formatMonthlyRent(property.monthly_rent)} emphasise />
          <FeeRow
            label="Advance / deposit"
            value={
              property.advance_amount > 0 ? formatMonthlyRent(property.advance_amount) : 'None'
            }
          />
          {property.other_fees.map((fee) => (
            <FeeRow
              key={`${fee.label}-${fee.amount}`}
              label={fee.recurring ? `${fee.label} (monthly)` : fee.label}
              value={fee.amount > 0 ? formatMonthlyRent(fee.amount) : 'Ask the landlord'}
            />
          ))}
          <Divider />
          <AppText variant="caption">
            Charges for water and electricity are not published for this property. Ask the landlord
            for the exact amounts before committing to anything.
          </AppText>
        </Card>

        {landlord ? (
          <Card style={styles.card}>
            <View style={styles.landlordRow}>
              <AppText variant="heading" accessibilityRole="header" style={{ flex: 1 }}>
                Landlord
              </AppText>
              {landlord.verification_status === 'verified' ? <VerifiedMark size={16} /> : null}
            </View>

            <AppText variant="bodyStrong">
              {landlord.business_name ?? landlord.full_name}
            </AppText>
            {landlord.business_name ? (
              <AppText variant="caption">{landlord.full_name}</AppText>
            ) : null}
            {landlord.bio ? <AppText variant="caption">{landlord.bio}</AppText> : null}

            {landlord.verification_status === 'verified' ? (
              <AppText variant="caption" color={colors.success}>
                Identity verified by RoomLink.
              </AppText>
            ) : (
              <AppText variant="caption" color={colors.textMuted}>
                This landlord has not completed identity verification.
              </AppText>
            )}

            <Divider />
            <AppText variant="caption" color={colors.textSecondary}>
              RoomLink does not publish landlord contact details. They are included with a request
              once you send one.
            </AppText>
          </Card>
        ) : null}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {showApplyActions ? (
        <View style={styles.actionBar}>
          <Button
            label="Request a viewing"
            variant="secondary"
            icon="calendar-outline"
            style={{ flex: 1 }}
            onPress={() => router.push(`/(student)/booking/request/${property.id}?kind=visit` as never)}
          />
          <Button
            label="Apply to rent"
            icon="document-text-outline"
            style={{ flex: 1 }}
            onPress={() => router.push(`/(student)/booking/request/${property.id}?kind=application` as never)}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function NearbyRow({
  places,
  icon,
}: {
  places: NearbyPlace[] | null | undefined;
  icon: IconName;
}) {
  if (!places || places.length === 0) return null;
  return (
    <View style={styles.locationRow}>
      <Ionicons name={icon} size={15} color={colors.textSecondary} />
      <AppText variant="caption" style={{ flex: 1 }} numberOfLines={2}>
        {places.map((place) => place.name).join(' · ')}
      </AppText>
    </View>
  );
}

function HeadlineStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

function FeeRow({
  label,
  value,
  emphasise = false,
}: {
  label: string;
  value: string;
  emphasise?: boolean;
}) {
  return (
    <View style={styles.feeRow}>
      <AppText variant={emphasise ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.huge },
  hero: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  heroFallback: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  thumbs: { gap: spacing.sm, paddingTop: spacing.sm },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceMuted,
  },
  thumbActive: { borderColor: colors.primary },
  headline: { padding: spacing.lg, gap: spacing.sm },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, gap: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  amenity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '50%',
    paddingVertical: 3,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 34,
  },
  landlordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  bottomSpace: { height: 96 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});