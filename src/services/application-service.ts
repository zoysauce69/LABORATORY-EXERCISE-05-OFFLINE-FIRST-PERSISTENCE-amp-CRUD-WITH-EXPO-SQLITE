/**
 * Applications and roommate requests.
 *
 * Both share the `Application` shape so "My applications" can show them in one
 * timeline, but they are stored under separate keys so answering a roommate
 * does not require loading the room-application list.
 *
 * Room applications are simulated: submitting one creates a `pending` record,
 * and `simulateDecision` lets the demo user advance it so the approved /
 * rejected states are reachable without a server.
 */

import { fail, ok, type Result } from '@/lib/errors';
import { findRoommate, SEED_APPLICATIONS } from '@/lib/mock-data';
import { getApplications, getRoommateRequests, setApplications, setRoommateRequests } from '@/lib/storage';
import type { Application, ApplicationDraft, ApplicationStatus, RoommateRequestStatus } from '@/lib/types';
import { getRoom } from './room-service';

let counter = 0;

/** Monotonic, collision-resistant id for locally created records. */
function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/** Room applications, newest first. */
export async function listRoomApplications(): Promise<Result<Application[]>> {
  const result = await getApplications(SEED_APPLICATIONS.filter((a) => a.kind === 'room'));
  if (!result.ok) return fail(result.error.message, result.error.code);

  const sorted = [...result.data]
    .filter((a) => a.kind === 'room')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return ok(sorted);
}

/** Roommate requests, newest first. */
export async function listRoommateRequests(): Promise<Result<Application[]>> {
  const result = await getRoommateRequests(SEED_APPLICATIONS.filter((a) => a.kind === 'roommate'));
  if (!result.ok) return fail(result.error.message, result.error.code);

  const sorted = [...result.data]
    .filter((a) => a.kind === 'roommate')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return ok(sorted);
}

/** Everything, for the combined "My applications" timeline. */
export async function listAllApplications(): Promise<Result<Application[]>> {
  const rooms = await listRoomApplications();
  if (!rooms.ok) return rooms;

  const roommates = await listRoommateRequests();
  if (!roommates.ok) return fail(roommates.error.message, roommates.error.code);

  return ok(
    [...rooms.data, ...roommates.data].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );
}

/**
 * Request statuses keyed by roommate id.
 *
 * Roommate records in the fixtures carry `requestStatus: null`; the truth lives
 * in storage, so this is how the roommate list learns a request already exists.
 */
export async function roommateRequestMap(): Promise<Result<Map<string, RoommateRequestStatus>>> {
  const requests = await listRoommateRequests();
  if (!requests.ok) return fail(requests.error.message, requests.error.code);

  const map = new Map<string, RoommateRequestStatus>();
  for (const request of requests.data) {
    if (!request.roommateId) continue;
    // Most recent request wins, so accepting then cancelling shows cancelled.
    map.set(request.roommateId, request.status === 'cancelled' ? 'cancelled' : request.status);
  }
  return ok(map);
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

/**
 * Submits an application for a room.
 *
 * Rejects a second application for the same room that is still pending or
 * approved, because in the real flow that would be a duplicate the landlord
 * has to untangle.
 */
export async function applyToRoom(
  draft: Extract<ApplicationDraft, { kind: 'room' }>,
): Promise<Result<Application>> {
  const roomId = draft.roomId;

  const room = getRoom(roomId);
  if (!room) return fail('That room is no longer listed.', 'not_found');
  if (room.availableSlots <= 0) return fail('That room has no free slots left.', 'unavailable');

  const existing = await listRoomApplications();
  if (!existing.ok) return fail(existing.error.message, existing.error.code);

  const duplicate = existing.data.find(
    (a) => a.roomId === roomId && (a.status === 'pending' || a.status === 'approved'),
  );
  if (duplicate) {
    return fail(`You already have a ${duplicate.status} application for ${room.title}.`, 'duplicate');
  }

  const application: Application = {
    id: newId('app'),
    kind: 'room',
    status: 'pending',
    roomId: room.id,
    roomTitle: room.title,
    roomImage: room.images[0] ?? null,
    roommateId: null,
    roommateName: null,
    roommateAvatarUrl: null,
    moveInDate: draft.moveInDate,
    occupants: draft.occupants,
    contactName: draft.contactName,
    contactPhone: draft.contactPhone,
    contactEmail: draft.contactEmail,
    note: draft.note,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    decidedAt: null,
    rejectionReason: null,
  };

  const written = await setApplications([application, ...existing.data]);
  if (!written.ok) return fail(written.error.message, written.error.code);

  return ok(application);
}

/** Sends a roommate request, refusing to send a second one while one is live. */
export async function requestRoommate(
  draft: Extract<ApplicationDraft, { kind: 'roommate' }>,
): Promise<Result<Application>> {
  const roommateId = draft.roommateId;

  const roommate = findRoommate(roommateId);
  if (!roommate) return fail('That roommate is no longer available.', 'not_found');

  const existing = await listRoommateRequests();
  if (!existing.ok) return fail(existing.error.message, existing.error.code);

  const live = existing.data.find(
    (r) => r.roommateId === roommateId && (r.status === 'pending' || r.status === 'approved'),
  );
  if (live) {
    const label = live.status === 'pending' ? 'a pending request' : 'an accepted request';
    return fail(`You already sent ${label} to ${roommate.fullName}.`, 'duplicate');
  }

  const request: Application = {
    id: newId('req'),
    kind: 'roommate',
    status: 'pending',
    roomId: null,
    roomTitle: null,
    roomImage: null,
    roommateId: roommate.id,
    roommateName: roommate.fullName,
    roommateAvatarUrl: roommate.avatarUrl,
    moveInDate: draft.moveInDate,
    occupants: 1,
    contactName: draft.contactName,
    contactPhone: draft.contactPhone,
    contactEmail: draft.contactEmail,
    note: draft.note,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    decidedAt: null,
    rejectionReason: null,
  };

  const written = await setRoommateRequests([request, ...existing.data]);
  if (!written.ok) return fail(written.error.message, written.error.code);

  return ok(request);
}

/**
 * Cancels a pending application or request.
 *
 * Cancelling a decided application is refused rather than silently ignored —
 * the UI disables the button, so reaching here means the list is stale.
 */
export async function cancelApplication(id: string): Promise<Result<Application>> {
  const rooms = await listRoomApplications();
  if (!rooms.ok) return fail(rooms.error.message, rooms.error.code);

  const roomMatch = rooms.data.find((a) => a.id === id);
  if (roomMatch) {
    if (roomMatch.status !== 'pending') {
      return fail(`A ${roomMatch.status} application cannot be cancelled.`, 'invalid_state');
    }
    return updateRoomApplication(id, { status: 'cancelled', decidedAt: nowIso() });
  }

  const requests = await listRoommateRequests();
  if (!requests.ok) return fail(requests.error.message, requests.error.code);

  const requestMatch = requests.data.find((r) => r.id === id);
  if (!requestMatch) return fail('That application could not be found.', 'not_found');

  if (requestMatch.status !== 'pending' && requestMatch.status !== 'approved') {
    return fail(`A ${requestMatch.status} request cannot be cancelled.`, 'invalid_state');
  }

  const next = requests.data.map((r) =>
    r.id === id ? { ...r, status: 'cancelled' as const, updatedAt: nowIso() } : r,
  );
  const written = await setRoommateRequests(next);
  if (!written.ok) return fail(written.error.message, written.error.code);

  const updated = next.find((r) => r.id === id);
  if (!updated) return fail('That application could not be found.', 'not_found');
  return ok(updated);
}

async function updateRoomApplication(
  id: string,
  updates: Partial<Application>,
): Promise<Result<Application>> {
  const rooms = await listRoomApplications();
  if (!rooms.ok) return fail(rooms.error.message, rooms.error.code);

  const next = rooms.data.map((a) =>
    a.id === id ? { ...a, ...updates, updatedAt: nowIso() } : a,
  );
  const written = await setApplications(next);
  if (!written.ok) return fail(written.error.message, written.error.code);

  const updated = next.find((a) => a.id === id);
  if (!updated) return fail('That application could not be found.', 'not_found');
  return ok(updated);
}

/**
 * Advances a pending room application to a decided state.
 *
 * Exists so the demo can reach the approved and rejected branches of the UI
 * without a backend. Refuses to touch anything already decided.
 */
export async function simulateDecision(
  id: string,
  status: Extract<ApplicationStatus, 'approved' | 'rejected'>,
  rejectionReason?: string,
): Promise<Result<Application>> {
  const rooms = await listRoomApplications();
  if (!rooms.ok) return fail(rooms.error.message, rooms.error.code);

  const application = rooms.data.find((a) => a.id === id);
  if (!application) return fail('That application could not be found.', 'not_found');
  if (application.status !== 'pending') {
    return fail(`This application is already ${application.status}.`, 'invalid_state');
  }

  return updateRoomApplication(id, {
    status,
    decidedAt: nowIso(),
    rejectionReason: status === 'rejected' ? (rejectionReason ?? REJECTION_REASONS[0] ?? null) : null,
  });
}

/** Plausible landlord reasons, so a simulated rejection reads like a real one. */
export const REJECTION_REASONS = [
  'The landlord has since rented the slot to another applicant.',
  'The advance required is above what the landlord accepts for a stay this short.',
  'The unit requires a minimum stay longer than the applicant can commit to.',
  'The landlord could not reach the applicant to confirm the move-in date.',
];

export function randomRejectionReason(): string {
  const index = Math.floor(Math.random() * REJECTION_REASONS.length);
  return REJECTION_REASONS[index] ?? 'The landlord could not approve this application.';
}

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

/**
 * The wording a roommate request uses.
 *
 * The stored status is the same vocabulary as a room application — both are
 * "did they say yes" — but "Approved" sounds like a lease was signed when
 * actually two people agreed to talk. So the label changes, the state does not.
 */
export const ROOMMATE_STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  approved: 'Connected',
  rejected: 'Declined',
  cancelled: 'Withdrawn',
};

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

function toneFor(status: ApplicationStatus): BadgeTone {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'cancelled':
      return 'neutral';
    case 'pending':
    default:
      return 'warning';
  }
}

/** Badge colour for either kind. Tone only depends on the status, not the kind. */
export function applicationStatusTone(status: ApplicationStatus): BadgeTone {
  return toneFor(status);
}

export function roommateStatusTone(status: ApplicationStatus): BadgeTone {
  return toneFor(status);
}

/** Counts for the dashboard tiles. */
export interface ApplicationCounts {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  total: number;
}

export function countApplications(applications: Application[]): ApplicationCounts {
  const counts: ApplicationCounts = { pending: 0, approved: 0, rejected: 0, cancelled: 0, total: 0 };
  for (const application of applications) {
    counts.total += 1;
    if (application.status === 'pending') counts.pending += 1;
    else if (application.status === 'approved') counts.approved += 1;
    else if (application.status === 'rejected') counts.rejected += 1;
    else counts.cancelled += 1;
  }
  return counts;
}