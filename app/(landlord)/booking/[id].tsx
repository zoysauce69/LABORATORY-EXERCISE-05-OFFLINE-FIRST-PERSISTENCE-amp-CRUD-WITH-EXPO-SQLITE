import { useRouter } from 'expo-router';

import { BookingDetail } from '@/components/booking-detail';

/** Landlord request detail, reached from the Requests tab. */
export default function LandlordBookingDetailScreen() {
  const router = useRouter();

  return (
    <BookingDetail
      backRoute="/(landlord)/(tabs)/bookings"
      onOpenProperty={(propertyId) => router.push(`/(landlord)/property/${propertyId}`)}
    />
  );
}