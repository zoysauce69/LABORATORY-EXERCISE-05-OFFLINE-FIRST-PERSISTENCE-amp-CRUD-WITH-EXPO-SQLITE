import { useMemo } from 'react';

import { useApp } from './use-app';
import { findRoommate, findRoom } from '@/lib/mock-data';
import { decorateRoommate, searchRoommates } from '@/services/roommate-service';
import { searchRooms } from '@/services/room-service';
import type { RoommateFilters, RoommateRequestStatus, RoomFilters } from '@/lib/types';

type RequestStatus = RoommateRequestStatus;

/** Outgoing request statuses keyed by roommate id, newest request winning. */
function useRequestMap(): Map<string, RequestStatus> {
  const { roommateRequests } = useApp();

  return useMemo(() => {
    const map = new Map<string, RequestStatus>();
    for (const request of roommateRequests) {
      if (!request.roommateId) continue;
      map.set(request.roommateId, request.status === 'cancelled' ? 'cancelled' : request.status);
    }
    return map;
  }, [roommateRequests]);
}

/**
 * Rooms matching `filters`, with the saved ids alongside.
 *
 * Filtering is synchronous over fixtures, so this is a plain derivation rather
 * than an async hook — it re-runs only when the filters or the saved ids move.
 */
export function useRoomSearch(filters: RoomFilters) {
  // `customRooms` is a dependency so a room added or deleted in Settings shows
  // up in the listings without a reload: the provider hands the new list down,
  // which re-runs the synchronous search.
  const { savedRoomIds, customRooms } = useApp();

  return useMemo(() => {
    const rooms = searchRooms(filters);
    return {
      rooms,
      total: rooms.length,
      isSaved: (roomId: string): boolean => savedRoomIds.includes(roomId),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, savedRoomIds, customRooms]);
}

/**
 * Roommates matching `filters`, scored against the signed-in profile and
 * decorated with saved / request state.
 */
export function useRoommateSearch(filters: RoommateFilters) {
  const { profile, savedRoommateIds } = useApp();
  const requests = useRequestMap();

  return useMemo(() => {
    const roommates = searchRoommates(profile, filters, savedRoommateIds, requests);
    return { roommates, total: roommates.length };
  }, [profile, filters, savedRoommateIds, requests]);
}

/** A single roommate, already scored and decorated, or undefined if unknown. */
export function useRoommate(id: string | undefined) {
  const { profile, savedRoommateIds } = useApp();
  const requests = useRequestMap();

  return useMemo(() => {
    if (!id) return undefined;
    const roommate = findRoommate(id);
    if (!roommate) return undefined;
    return decorateRoommate(profile, roommate, savedRoommateIds, requests);
  }, [id, profile, savedRoommateIds, requests]);
}

/** The saved rooms and roommates, hydrated from fixtures and custom rooms. */
export function useFavorites() {
  const { savedRoomIds, savedRoommateIds, profile, customRooms } = useApp();
  const requests = useRequestMap();

  return useMemo(() => {
    // Custom rooms are checked first so a listing added in Settings resolves
    // even though it never existed in the fixtures.
    const customById = new Map(customRooms.map((room) => [room.id, room]));

    const rooms = savedRoomIds
      .map((roomId) => customById.get(roomId) ?? findRoom(roomId))
      .filter((room): room is NonNullable<typeof room> => room !== undefined);

    const roommates = savedRoommateIds
      .map(findRoommate)
      .filter((roommate): roommate is NonNullable<typeof roommate> => roommate !== undefined)
      .map((roommate) => decorateRoommate(profile, roommate, savedRoommateIds, requests));

    return { rooms, roommates };
    // `customRooms` is a dependency so an edited or deleted room refreshes the
    // saved list without a reload.
  }, [savedRoomIds, savedRoommateIds, profile, requests, customRooms]);
}