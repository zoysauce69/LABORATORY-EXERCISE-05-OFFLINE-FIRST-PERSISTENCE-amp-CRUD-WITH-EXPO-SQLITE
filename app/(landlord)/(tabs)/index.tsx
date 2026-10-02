import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { TabScreenHeader, HeaderIconButton } from '@/components/tab-screen-header';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineAlert,
  LoadingState,
  Screen,
  StatTile,
} from '@/components/ui';
import { VerificationStatusBadge } from '@/components/status-badge';
import { PropertyCard } from '@/components/property-card';
import { useAuth } from '@/hooks/use-auth';
import { useAsyncData } from '@/hooks/use-async-data';
import { useNotifications } from '@/hooks/use-notifications';
import { propertyService } from '@/services/property-service';
import type { PropertySearchResult } from '@/lib/database.types';
import { ok } from '@/lib/errors';
import { colors, radii, spacing } from '@/theme';

/**
 * Landlord dashboard.
 *
 * Answers the three questions a landlord opens the app to ask: how many
 * requests are waiting, how is my portfolio doing, and is my account in good
 * standing to publish.
 */
export default function LandlordDashboardScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const stats = useAsyncData(async () => propertyService.dashboardStats(), [user?.id]);
  const properties = useAsyncData<PropertySearchResult[]>(
    async () => (user ? propertyService.listByLandlord(user.id) : ok([])),
    [user?.id],
    { enabled: Boolean(user) },
  );

  const notifications = useNotifications(user?.id);

  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([stats.reload(), properties.reload(), notifications.reload()]);
    setRefreshing(false);
  }, [notifications, properties, stats]);

  if (stats.isInitialLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your dashboard…" />
      </Screen>
    );
  }

  const unread = notifications.unreadCount;
  const recent = (properties.data ?? []).slice(0, 3);
  const isVerified = profile?.verification_status === 'verified';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <TabScreenHeader
          title="Dashboard"
          subtitle={profile?.business_name ?? 'Your listings at a glance'}
          action={
            <HeaderIconButton
              icon="notifications-outline"
              label="Notification centre"
              count={unread}
              onPress={() => router.push('/(landlord)/notifications')}
            />
          }
        />

        {stats.error ? <ErrorState message={stats.error} onRetry={stats.reload} /> : null}

        {/* A failed stats read must not be shown as zeroes. */}
        <View style={styles.tiles}>
          <StatTile
            label="Pending requests"
            value={stats.error ? '—' : (stats.data?.pending_bookings ?? 0)}
            icon="clipboard-outline"
            tone={stats.data?.pending_bookings ? 'warning' : 'neutral'}
            onPress={() => router.push('/(landlord)/(tabs)/bookings')}
          />
          <StatTile
            label="Published"
            value={stats.error ? '—' : (stats.data?.published_listings ?? 0)}
            icon="checkmark-circle-outline"
            tone="success"
            onPress={() => router.push('/(landlord)/(tabs)/listings')}
          />
        </View>

        <View style={styles.tiles}>
          <StatTile
            label="Total views"
            value={stats.error ? '—' : (stats.data?.total_views ?? 0)}
            icon="eye-outline"
            tone="info"
          />
          <StatTile
            label="Units available"
            value={stats.error ? '—' : (stats.data?.available_units ?? 0)}
            icon="key-outline"
            tone={(stats.data?.available_units ?? 0) > 0 ? 'success' : 'neutral'}
          />
        </View>

        {!isVerified && profile ? (
          <InlineAlert
            tone={profile.verification_status === 'rejected' ? 'danger' : 'warning'}
            title={
              profile.verification_status === 'rejected'
                ? 'Verification was declined'
                : 'Your account is not verified'
            }
            message="You can publish listings now, but a verified tick builds more trust with renters."
            actionLabel={profile.verification_status === 'rejected' ? 'Resubmit' : 'Verify now'}
            onAction={() => router.push('/(landlord)/verification')}
          />
        ) : null}

        {profile ? (
          <Card style={styles.card}>
            <View style={styles.cardHead}>
              <AppText variant="heading" style={{ flex: 1 }}>
                Verification
              </AppText>
              <VerificationStatusBadge status={profile.verification_status} compact />
            </View>
            <Button
              label={isVerified ? 'View details' : 'Manage verification'}
              variant="outline"
              size="sm"
              onPress={() => router.push('/(landlord)/verification')}
            />
          </Card>
        ) : null}

        <View style={styles.card}>
          <AppText variant="heading" accessibilityRole="header">
            Your properties
          </AppText>

          {properties.isInitialLoading ? (
            <LoadingState label="Loading properties…" compact />
          ) : properties.error ? (
            <ErrorState message={properties.error} onRetry={properties.reload} />
          ) : (properties.data ?? []).length === 0 ? (
            <EmptyState
              icon="business-outline"
              title="No properties yet"
              message="Post your first boarding house or apartment to start receiving requests."
              actionLabel="Post a property"
              onAction={() => router.push('/(landlord)/property/new')}
            />
          ) : (
            <View style={styles.recent}>
              {recent.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  showStatus
                  onPress={() => router.push(`/(landlord)/property/${property.id}/edit`)}
                />
              ))}
              {(properties.data?.length ?? 0) > recent.length ? (
                <Button
                  label={`View all ${properties.data?.length ?? 0}`}
                  variant="ghost"
                  size="sm"
                  icon="list-outline"
                  onPress={() => router.push('/(landlord)/(tabs)/listings')}
                />
              ) : null}
            </View>
          )}
        </View>

        <Button
          label="Post a new property"
          icon="add"
          fullWidth
          onPress={() => router.push('/(landlord)/property/new')}
        />

        <Card style={styles.tips}>
          <View style={styles.tipHead}>
            <Ionicons name="bulb-outline" size={18} color={colors.primary} />
            <AppText variant="subheading" style={{ flex: 1 }}>
              Getting more requests
            </AppText>
          </View>
          <AppText variant="caption">
            Listings with at least three photos and a complete description get noticeably more
            enquiries. Add a map-friendly barangay and state your water and electricity charges
            separately — those are the questions renters ask most.
          </AppText>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.huge },
  tiles: { flexDirection: 'row', gap: spacing.md },
  card: { padding: spacing.lg, gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recent: { gap: spacing.md },
  tips: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    borderWidth: 0,
  },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});