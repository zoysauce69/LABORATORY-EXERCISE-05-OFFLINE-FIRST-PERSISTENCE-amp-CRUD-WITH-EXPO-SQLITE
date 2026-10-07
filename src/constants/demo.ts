/**
 * The demo banner.
 *
 * RoomLink has no backend, so the landing page and the auth screens state that
 * plainly rather than implying a live service. Kept in one place so the wording
 * stays identical everywhere it appears.
 */

import { DEMO_CREDENTIALS } from '@/lib/mock-data';

export const DEMO_NOTICE_TITLE = 'Demo app — no backend';

export const DEMO_NOTICE_BODY =
  'RoomLink runs entirely on this device. Listings, roommates, messages and applications are sample data, and everything you create is saved locally.';

export const DEMO_CREDENTIALS_NOTE =
  `Demo account: ${DEMO_CREDENTIALS.email} · ${DEMO_CREDENTIALS.password}`;