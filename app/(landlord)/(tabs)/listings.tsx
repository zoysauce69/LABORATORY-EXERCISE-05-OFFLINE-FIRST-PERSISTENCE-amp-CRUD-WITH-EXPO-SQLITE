import { ScrollView, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import type { IconName } from '@/constants/options';

import { ScreenHeader } from '@/components/tab-screen-header';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
} from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useAsyncData } from '@/hooks/use-async-data';
import { propertyService } from '@/services/property-service';
import { PROPERTY_STATUS_LABEL } from '@/constants/options';
import type { PropertySearchResult, PropertyStatus } from '@/lib/database.types';
import { ok } from '@/lib/errors';
import { formatMonthlyRent } from '@/utils/format';
import { colors, spacing } from '@/theme';

/**
 * Landlord listings tab.
 *
 * Renders every status rather than only published ones — a landlord needs to
 * see their drafts in the same place as their live listings.
 */
export default function LandlordListingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const listings = useAsyncData<PropertySearchResult[]>(
    async () => (user ? propertyService.listByLandlord(user.id) : ok([])),
    [user?.id],
    { enabled: Boolean(user) },
  );

  return (
    <Screen>
      <View style={styles.header}>
        <ScreenHeader
          title="My listings"
          subtitle={`${listings.data?.length ?? 0} propert${listings.data?.length === 1 ? 'y' : 'ies'}`}
        />
        <Button
          label="Post a new property"
          icon="add"
          fullWidth
          onPress={() => router.push('/(landlord)/property/new')}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {listings.isInitialLoading ? (
          <LoadingState label="Loading your listings…" />
        ) : listings.error ? (
          <ErrorState message={listings.error} onRetry={listings.reload} />
        ) : (listings.data ?? []).length === 0 ? (
          <EmptyState
            icon="business-outline"
            title="No listings yet"
            message="Post your first boarding house or apartment to start receiving requests."
            actionLabel="Post a property"
            onAction={() => router.push('/(landlord)/property/new')}
          />
        ) : (
          (listings.data ?? []).map((property) => (
            <Card key={property.id} style={styles.card} onPress={() => router.push(`/(landlord)/property/${property.id}/edit`)}>
              <View style={styles.cardTop}>
                <Badge
                  label={PROPERTY_STATUS_LABEL[property.status]}
                  tone={statusTone(property.status)}
                  icon={statusIcon(property.status)}
                />
                <AppText variant="caption" color={colors.textMuted}>
                  {property.city}
                </AppText>
              </View>

              <AppText variant="subheading" numberOfLines={1}>
                {property.title}
              </AppText>

              <AppText variant="caption">
                {formatMonthlyRent(property.monthly_rent)} ·{' '}
                {property.occupied_units}/{property.total_units} occupied
              </AppText>

              <View style={styles.cardActions}>
                <Button
                  label="Edit"
                  variant="outline"
                  size="sm"
                  icon="create-outline"
                  style={{ flex: 1 }}
                  onPress={() => router.push(`/(landlord)/property/${property.id}/edit`)}
                />
                <Button
                  label="Preview"
                  variant="ghost"
                  size="sm"
                  icon="eye-outline"
                  style={{ flex: 1 }}
                  onPress={() => router.push(`/(landlord)/property/${property.id}`)}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function statusTone(status: PropertyStatus): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'published':
      return 'success';
    case 'draft':
      return 'neutral';
    case 'occupied':
      return 'warning';
    case 'unpublished':
    default:
      return 'danger';
  }
}

function statusIcon(status: PropertyStatus): IconName {
  switch (status) {
    case 'published':
      return 'checkmark-circle-outline';
    case 'draft':
      return 'document-outline';
    case 'occupied':
      return 'lock-closed-outline';
    case 'unpublished':
    default:
      return 'eye-off-outline';
  }
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.huge },
  card: { padding: spacing.lg, gap: spacing.sm },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});