import { useLocalSearchParams, useRouter } from 'expo-router';

import { PropertyDetailScreen } from '@/components/property-detail-screen';

/**
 * Landlord preview of their own listing.
 *
 * Identical to the student view but without the renter actions, so a landlord
 * can check exactly what a renter will see.
 */
export default function LandlordPropertyPreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PropertyDetailScreen
      showApplyActions={false}
      onEdit={() => router.push(`/(landlord)/property/${id}/edit`)}
    />
  );
}