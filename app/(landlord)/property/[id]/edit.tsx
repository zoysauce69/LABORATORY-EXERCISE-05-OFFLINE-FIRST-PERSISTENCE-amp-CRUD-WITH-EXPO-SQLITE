import { useLocalSearchParams } from 'expo-router';

import { PropertyEditor } from '@/components/property-editor';

/**
 * Edit an existing listing.
 *
 * The id comes from the route, so the editor never has to be told which record
 * it is writing to and cannot be pointed at another landlord's listing by a
 * stale prop.
 */
export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PropertyEditor propertyId={typeof id === 'string' ? id : ''} />;
}