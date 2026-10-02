/**
 * Seeds AsyncStorage with demo data on first launch.
 *
 * This runs once when the app starts for the first time. Subsequent launches
 * will skip seeding and use the persisted data (which may have been modified
 * by user actions like creating bookings or saving properties).
 */

import { isSeeded, markSeeded, setBookings } from '@/lib/async-storage';
import { DEMO_BOOKINGS } from '@/lib/demo-data';

export async function seedDemoDataIfNeeded(): Promise<void> {
  const alreadySeeded = await isSeeded();
  if (alreadySeeded) {
    return;
  }

  // Seed bookings with demo data
  await setBookings(DEMO_BOOKINGS);

  // Saved properties, saved roommates, and roommate requests start empty
  // (user will add them through the UI)

  await markSeeded();
  console.log('[seed-demo-data] Demo data seeded successfully');
}
