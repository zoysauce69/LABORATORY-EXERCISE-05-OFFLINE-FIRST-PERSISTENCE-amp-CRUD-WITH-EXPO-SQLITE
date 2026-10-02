import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';

import { Screen, InlineAlert } from '@/components/ui';
import { PropertyList } from '@/components/property-list';
import { TabScreenHeader } from '@/components/tab-screen-header';
import { useAuth } from '@/hooks/use-auth';
import { useSavedProperties } from '@/hooks/use-properties';
import { savedPropertyService } from '@/services/saved-service';
import { spacing } from '@/theme';

export default function StudentSavedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const saved = useSavedProperties(user?.id);

  const savedIds = useMemo(
    () => new Set((saved.data ?? []).map((item) => item.id)),
    [saved.data],
  );

  const remove = async (propertyId: string) => {
    if (!user) return;
    setRemovingId(propertyId);
    setActionError(null);

    const result = await savedPropertyService.remove(user.id, propertyId);
    setRemovingId(null);

    if (!result.ok) {
      // The listing stays saved and the user is told why.
      setActionError(result.error.message);
      return;
    }

    // Drop the row locally so it disappears immediately, then confirm with the
    // server so a failed delete never silently hides a listing.
    saved.setData((current) =>
      current ? current.filter((item) => item.id !== propertyId) : current,
    );
    void saved.reload();
  };

  const count = saved.data?.length ?? 0;

  return (
    <Screen>
      <PropertyList
        testID="saved-property-list"
        items={saved.data ?? []}
        isInitialLoading={saved.isInitialLoading}
        isRefreshing={saved.isLoading && !saved.isInitialLoading}
        error={saved.error}
        hasMore={false}
        onRefresh={saved.reload}
        onLoadMore={() => undefined}
        onOpen={(property) => router.push(`/(student)/property/${property.id}`)}
        onToggleSave={(property) => {
          void remove(property.id);
        }}
        savedIds={savedIds}
        isSavingId={removingId}
        ListHeaderComponent={
          <View style={styles.header}>
            <TabScreenHeader
              title="Saved"
              subtitle={
                count === 0
                  ? 'Keep listings here while you compare them.'
                  : `${count} listing${count === 1 ? '' : 's'} kept for later.`
              }
            />
            {actionError ? <InlineAlert tone="danger" message={actionError} /> : null}
          </View>
        }
        emptyTitle="Nothing saved yet"
        emptyMessage="Tap the heart on any listing to keep it here while you compare options."
        emptyIcon="heart-outline"
        emptyActionLabel="Browse listings"
        onEmptyAction={() => router.push('/(student)/(tabs)')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: spacing.md },
});