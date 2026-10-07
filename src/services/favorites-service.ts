/**
 * Favourites — saved rooms and saved roommates.
 *
 * Only ids are persisted. The records themselves are always hydrated from the
 * fixtures, so a saved room can never drift out of sync with its listing, and
 * a saved id that no longer matches a fixture is dropped rather than rendered
 * as an empty row.
 */

import { fail, ok, type Result } from '@/lib/errors';
import { findRoommate } from '@/lib/mock-data';
import {
  getSavedRoommateIds,
  getSavedRoomIds,
  setSavedRoommateIds,
  setSavedRoomIds,
} from '@/lib/storage';
import type { Profile, Roommate, Room } from '@/lib/types';
import { getRoom } from './room-service';
import { decorateRoommate } from './roommate-service';

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

export async function listSavedRooms(): Promise<Result<Room[]>> {
  const ids = await getSavedRoomIds();
  if (!ids.ok) return fail(ids.error.message, ids.error.code);

  const rooms = ids.data
    .map((id) => getRoom(id))
    .filter((room): room is Room => room !== undefined);

  return ok(rooms);
}

/**
 * Adds or removes a room and returns the new saved state.
 *
 * Returns `saved: true` when the room ended up saved, so the caller can toast
 * the right message without re-reading the list.
 */
export async function toggleSavedRoom(roomId: string): Promise<Result<{ saved: boolean }>> {
  if (!getRoom(roomId)) {
    return fail('That room is no longer listed.', 'not_found');
  }

  const ids = await getSavedRoomIds();
  if (!ids.ok) return fail(ids.error.message, ids.error.code);

  const current = ids.data;
  const isSaved = current.includes(roomId);
  const next = isSaved ? current.filter((id) => id !== roomId) : [...current, roomId];

  const written = await setSavedRoomIds(next);
  if (!written.ok) return fail(written.error.message, written.error.code);

  return ok({ saved: !isSaved });
}

export async function isRoomSaved(roomId: string): Promise<Result<boolean>> {
  const ids = await getSavedRoomIds();
  if (!ids.ok) return fail(ids.error.message, ids.error.code);
  return ok(ids.data.includes(roomId));
}

/** Ids of every saved room — used to decorate the rooms list. */
export async function savedRoomIds(): Promise<Result<string[]>> {
  const ids = await getSavedRoomIds();
  if (!ids.ok) return fail(ids.error.message, ids.error.code);
  return ok(ids.data);
}

/* ------------------------------------------------------------------ */
/* Roommates                                                           */
/* ------------------------------------------------------------------ */

export async function listSavedRoommates(profile: Profile): Promise<Result<Roommate[]>> {
  const ids = await getSavedRoommateIds();
  if (!ids.ok) return fail(ids.error.message, ids.error.code);

  const roommates = ids.data
    .map((id) => findRoommate(id))
    .filter((roommate): roommate is Roommate => roommate !== undefined)
    .map((roommate) => decorateRoommate(profile, roommate, ids.data, new Map()));

  return ok(roommates);
}

export async function toggleSavedRoommate(roommateId: string): Promise<Result<{ saved: boolean }>> {
  if (!findRoommate(roommateId)) {
    return fail('That roommate is no longer available.', 'not_found');
  }

  const ids = await getSavedRoommateIds();
  if (!ids.ok) return fail(ids.error.message, ids.error.code);

  const current = ids.data;
  const isSaved = current.includes(roommateId);
  const next = isSaved ? current.filter((id) => id !== roommateId) : [...current, roommateId];

  const written = await setSavedRoommateIds(next);
  if (!written.ok) return fail(written.error.message, written.error.code);

  return ok({ saved: !isSaved });
}

export async function savedRoommateIds(): Promise<Result<string[]>> {
  const ids = await getSavedRoommateIds();
  if (!ids.ok) return fail(ids.error.message, ids.error.code);
  return ok(ids.data);
}