import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui';
import { BookingsPanel } from '@/components/bookings-panel';
import { TabScreenHeader } from '@/components/tab-screen-header';
import { useAuth } from '@/hooks/use-auth';

/**
 * Student bookings.
 *
 * Read-only apart from cancelling a pending request and accepting a proposed
 * reschedule. The landlord owns the approve/decline decision.
 */
export default function StudentBookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Screen>
      <BookingsPanel
        viewerId={user?.id}
        perspective="student"
        onOpen={(item) => router.push(`/booking/${item.booking.id}`)}
        header={
          <TabScreenHeader
            title="Bookings"
            subtitle="Track your viewing requests and rental applications."
          />
        }
      />
    </Screen>
  );
}