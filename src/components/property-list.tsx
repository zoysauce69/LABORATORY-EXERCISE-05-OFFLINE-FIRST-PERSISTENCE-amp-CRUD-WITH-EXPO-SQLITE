import { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import type { PropertySearchResult } from '@/lib/database.types';
import { PropertyCard } from '@/components/property-card';
import {
  EmptyState,
  ErrorState,
  PropertyCardSkeleton,
} from '@/components/ui';
import { colors, spacing } from '@/theme';

export interface PropertyListProps {
  items: PropertySearchResult[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore?: boolean;
  error: string | null;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onOpen: (property: PropertySearchResult) => void;
  /** Omitted on landlord-owned listings, where saving is meaningless. */
  onToggleSave?: ((property: PropertySearchResult) => void) | undefined;
  savedIds?: Set<string>;
  isSavingId?: string | null;
  /** Shows the editable status pill (landlord's own listings). */
  showStatus?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ComponentProps<typeof EmptyState>['icon'];
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  contentPaddingBottom?: number;
  testID?: string;
}

/**
 * List renderer shared by Home, Saved and Listings.
 *
 * Owns the four states the brief calls for — initial skeleton, error with retry,
 * empty with guidance, and paginated results — so no screen re-implements them.
 */
export function PropertyList({
  items,
  isInitialLoading,
  isRefreshing,
  isLoadingMore = false,
  error,
  hasMore,
  onRefresh,
  onLoadMore,
  onOpen,
  onToggleSave,
  savedIds,
  isSavingId,
  showStatus = false,
  emptyTitle = 'No listings found',
  emptyMessage = 'Try widening your filters or searching a nearby city.',
  emptyIcon = 'search-outline',
  emptyActionLabel,
  onEmptyAction,
  ListHeaderComponent,
  contentPaddingBottom,
  testID,
}: PropertyListProps) {
  const renderItem = useCallback(
    ({ item }: { item: PropertySearchResult }) => (
      <PropertyCard
        property={item}
        onPress={() => onOpen(item)}
        onToggleSave={onToggleSave ? () => onToggleSave(item) : undefined}
        isSaved={savedIds?.has(item.id) ?? false}
        isSaving={isSavingId === item.id}
        showStatus={showStatus}
      />
    ),
    [isSavingId, onOpen, onToggleSave, savedIds, showStatus],
  );

  // Only the skeletons, so a refresh never blanks out existing results.
  if (isInitialLoading) {
    return (
      <View style={styles.skeletonWrap} testID={testID}>
        <PropertyCardSkeleton />
        <PropertyCardSkeleton />
        <PropertyCardSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateWrap} testID={testID}>
        <ErrorState message={error} onRetry={onRefresh} />
      </View>
    );
  }

  return (
    <FlatList
      testID={testID}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          message={emptyMessage}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {isLoadingMore ? <ActivityIndicator color={colors.primary} /> : null}
          {!isLoadingMore && items.length > 0 && !hasMore ? (
            <View style={styles.endMark} />
          ) : null}
        </View>
      }
      contentContainerStyle={[
        styles.content,
        contentPaddingBottom !== undefined ? { paddingBottom: contentPaddingBottom } : null,
        items.length === 0 && styles.contentEmpty,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (hasMore && !isLoadingMore && !isInitialLoading && !error) onLoadMore();
      }}
    />
  );
}

function Separator() {
  return <View style={{ height: spacing.lg }} />;
}

const styles = StyleSheet.create({
  skeletonWrap: { padding: spacing.lg, gap: spacing.lg },
  stateWrap: { flex: 1, justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.huge },
  contentEmpty: { flexGrow: 1, justifyContent: 'center' },
  footer: { paddingVertical: spacing.xl, alignItems: 'center' },
  endMark: { height: 1, width: 48, borderRadius: 1, backgroundColor: colors.divider },
});