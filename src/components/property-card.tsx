import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { AppText, Badge, Card } from '@/components/ui';
import { amenityIcon, propertyStatusTone, propertyTypeLabel } from '@/constants/options';
import { imageService } from '@/services/image-service';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { formatDistance, formatMonthlyRent, pluralUnitSummary } from '@/utils/format';
import type { PropertySearchResult } from '@/lib/database.types';

export interface PropertyCardProps {
  property: PropertySearchResult;
  onPress: () => void;
  onToggleSave?: (() => void) | undefined;
  isSaved?: boolean;
  /** True on the landlord's own listing, where status is editable. */
  showStatus?: boolean;
  isSaving?: boolean;
}

/**
 * The one property card used by Home, Search, Saved and Listings.
 *
 * Memoised because these lists can render 12+ cards and re-render on every
 * keystroke in the search field.
 */
function PropertyCardComponent({
  property,
  onPress,
  onToggleSave,
  isSaved = false,
  showStatus = false,
  isSaving = false,
}: PropertyCardProps) {
  const coverUrl = imageService.publicUrl(property.cover_image_path, property.cover_is_uploaded);
  const availableUnits = Math.max(property.total_units - property.occupied_units, 0);
  const isUnavailable = property.status !== 'published' || availableUnits === 0;

  const accessibilityLabel = [
    property.title,
    formatMonthlyRent(property.monthly_rent),
    `${property.barangay}, ${property.city}`,
    property.landlord_verified ? 'verified landlord' : null,
    isUnavailable ? 'currently unavailable' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the listing details"
      style={styles.card}
      testID={`property-card-${property.id}`}
    >
      <View style={styles.imageWrap}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`Photo of ${property.title}`}
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons name="home-outline" size={32} color={colors.textMuted} />
            <AppText variant="caption" style={{ marginTop: spacing.sm }}>
              No photo yet
            </AppText>
          </View>
        )}

        <View style={styles.imageTopRow} pointerEvents="box-none">
          {property.landlord_verified ? (
            <Badge label="Verified" tone="success" icon="shield-checkmark" style={styles.badgeOverlay} />
          ) : null}
          {onToggleSave ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSaved, busy: isSaving }}
              accessibilityLabel={isSaved ? 'Remove from saved' : 'Save this listing'}
              onPress={onToggleSave}
              hitSlop={8}
              style={styles.saveButton}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={19}
                color={isSaved ? colors.danger : colors.text}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.imageBottomRow} pointerEvents="none">
          <Badge
            label={propertyTypeLabel(property.property_type)}
            tone="info"
            style={styles.badgeOverlay}
          />
          {showStatus ? (
            <Badge
              label={property.status === 'published' ? 'Listed' : property.status === 'draft' ? 'Draft' : property.status === 'occupied' ? 'Occupied' : 'Unlisted'}
              tone={propertyStatusTone(property.status)}
              style={styles.badgeOverlay}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.priceRow}>
          <AppText variant="price" style={styles.price}>
            {formatMonthlyRent(property.monthly_rent)}
          </AppText>
          {property.advance_amount > 0 ? (
            <AppText variant="caption">₱{property.advance_amount.toLocaleString('en-PH')} advance</AppText>
          ) : null}
        </View>

        <AppText variant="subheading" numberOfLines={1}>
          {property.title}
        </AppText>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <AppText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
            {property.landmark ? `${property.landmark}, ` : ''}
            {property.barangay}, {property.city}
          </AppText>
        </View>

        <View style={styles.metaRow}>
          <AppText variant="caption" color={isUnavailable ? colors.danger : colors.success}>
            {pluralUnitSummary(property.total_units, property.occupied_units)}
          </AppText>
          {property.distance_km !== null && property.distance_km !== undefined ? (
            <AppText variant="caption">
              {property.distance_source === 'straightline' ? '~' : ''}
              {formatDistance(property.distance_km)}
            </AppText>
          ) : null}
        </View>

        {property.amenities.length > 0 ? (
          <View style={styles.amenityRow}>
            {property.amenities.slice(0, 3).map((amenity) => (
              <View key={amenity.id} style={styles.amenityPill}>
                <Ionicons name={amenityIcon(amenity.slug)} size={12} color={colors.textSecondary} />
                <AppText variant="caption" numberOfLines={1}>
                  {amenity.label}
                </AppText>
              </View>
            ))}
            {property.amenities.length > 3 ? (
              <AppText variant="caption" color={colors.textMuted}>
                +{property.amenities.length - 3}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

export const PropertyCard = memo(PropertyCardComponent);

const styles = StyleSheet.create({
  card: { ...shadows.sm },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 180, backgroundColor: colors.surfaceMuted },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },

  imageTopRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  imageBottomRow: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badgeOverlay: {
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  saveButton: {
    marginLeft: 'auto',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { padding: spacing.lg, gap: spacing.xs },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  price: { ...typography.price },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  amenityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
});