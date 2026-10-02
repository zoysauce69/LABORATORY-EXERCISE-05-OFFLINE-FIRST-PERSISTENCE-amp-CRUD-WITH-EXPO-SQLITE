import { useRouter } from 'expo-router';

import { BookingDetail } from '@/components/booking-detail';

/** Student booking detail, reached after sending a request or from the bookings tab. */
export default function StudentBookingDetailScreen() {
  const router = useRouter();

  return (
    <BookingDetail
      backRoute="/(student)/(tabs)/bookings"
      onOpenProperty={(propertyId) => router.push(`/(student)/property/${propertyId}`)}
    />
  );
}