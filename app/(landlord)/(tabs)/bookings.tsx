import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui';
import { BookingsPanel } from '@/components/bookings-panel';
import { TabScreenHeader } from '@/components/tab-screen-header';
import { useAuth } from '@/hooks/use-auth';

/**
 * Landlord requests tab.
 *
 * Declining requires a written reason because the sheet shows it verbatim to the
 * renter; `BookingsPanel` owns that flow so there is a single owner of the
 * request list and the decision that changes it.
 */
export default function LandlordBookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Screen>
      <BookingsPanel
        viewerId={user?.id}
        perspective="landlord"
        onOpen={(item) => router.push(`/(landlord)/booking/${item.booking.id}`)}
        header={
          <TabScreenHeader
            title="Requests"
            subtitle="Approve or decline viewing and rental requests."
          />
        }
      />
    </Screen>
  );
}