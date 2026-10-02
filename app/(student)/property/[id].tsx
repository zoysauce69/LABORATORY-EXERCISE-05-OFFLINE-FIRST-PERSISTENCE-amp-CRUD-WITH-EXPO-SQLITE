import { PropertyDetailScreen } from '@/components/property-detail-screen';

/**
 * Student property detail.
 *
 * The student area owns this route so the landlord's edit screen can never be
 * reached by a student, and vice versa.
 */
export default function StudentPropertyDetailScreen() {
  return <PropertyDetailScreen showApplyActions />;
}