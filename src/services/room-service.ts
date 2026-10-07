/**
 * Room search, filtering and sorting.
 *
 * The fixtures in `@/lib/mock-data` are the base source of rooms, merged with
 * the rooms the user has added themselves (Settings → Room Management), so a
 * newly added room appears in listings immediately and a deleted one
 * disappears. Every filter in the brief is implemented here — keyword, city,
 * price band, room type, amenities and availability — plus five sort orders.
 */

import { ROOMS, findRoom } from '@/lib/mock-data';
import type { Room, RoomFilters, RoomSort, RoomType } from '@/lib/types';

/**
 * Rooms the user added locally, kept in memory as well as AsyncStorage so
 * search stays synchronous. The provider writes through `setCustomRoomsCache`
 * whenever the list changes.
 */
let customRooms: Room[] = [];

export function setCustomRoomsCache(rooms: Room[]): void {
  customRooms = [...rooms];
}

export function getCustomRoomsCache(): Room[] {
  return [...customRooms];
}

/** Fixture rooms plus the user's own listings. */
export function allRooms(): Room[] {
  return [...customRooms, ...ROOMS];
}

/**
 * How a keyword matches. Checks the fields a renter would actually type:
 * a barangay, a landmark, a school name, or a couple of words from the title.
 */
function matchesQuery(room: Room, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (query.length === 0) return true;

  const haystack = [
    room.title,
    room.city,
    room.barangay,
    room.landmark,
    room.description,
    room.roomType.replace(/_/g, ' '),
    ...room.amenities.map((a) => a.label),
  ]
    .join(' ')
    .toLowerCase();

  // Every whitespace-separated term must appear somewhere, so "quezon studio"
  // narrows rather than widens.
  return query.split(/\s+/).every((term) => haystack.includes(term));
}

function matchesAmenities(room: Room, required: string[]): boolean {
  if (required.length === 0) return true;
  const owned = new Set(room.amenities.map((a) => a.slug));
  return required.every((slug) => owned.has(slug));
}

/** True when the room has a free slot on or before `isoDate`. */
function isAvailableBy(room: Room, isoDate: string): boolean {
  if (room.availableSlots <= 0) return false;
  return new Date(room.availableFrom).getTime() <= new Date(isoDate).getTime();
}

/** Best occupant compatibility, used by the "compatible only" filter. */
function bestCompatibility(room: Room): number {
  if (room.occupants.length === 0) return 100;
  return Math.max(...room.occupants.map((o) => o.compatibility));
}

function sortRooms(rooms: Room[], sort: RoomSort): Room[] {
  const list = [...rooms];
  switch (sort) {
    case 'price_asc':
      return list.sort((a, b) => a.monthlyRent - b.monthlyRent);
    case 'price_desc':
      return list.sort((a, b) => b.monthlyRent - a.monthlyRent);
    case 'newest':
      // No listing dates in the fixtures, so "newest" means soonest available.
      return list.sort(
        (a, b) => new Date(a.availableFrom).getTime() - new Date(b.availableFrom).getTime(),
      );
    case 'distance':
      // Rooms with no known distance sort last rather than pretending to be 0 km.
      return list.sort((a, b) => {
        if (a.distanceKm === null) return b.distanceKm === null ? 0 : 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    case 'recommended':
    default:
      return list.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        if (a.availableSlots !== b.availableSlots) return b.availableSlots - a.availableSlots;
        return bestCompatibility(b) - bestCompatibility(a);
      });
  }
}

export function searchRooms(filters: RoomFilters): Room[] {
  let results = allRooms().filter((room) => {
    if (room.availableSlots <= 0) return false;
    if (!matchesQuery(room, filters.query)) return false;
    if (filters.city !== null && room.city !== filters.city) return false;
    if (filters.minRent !== null && room.monthlyRent < filters.minRent) return false;
    if (filters.maxRent !== null && room.monthlyRent > filters.maxRent) return false;
    if (filters.roomTypes.length > 0 && !filters.roomTypes.includes(room.roomType)) return false;
    if (!matchesAmenities(room, filters.amenities)) return false;
    if (filters.availableBefore !== null && !isAvailableBy(room, filters.availableBefore)) return false;
    if (filters.minCompatibility !== null && bestCompatibility(room) < filters.minCompatibility) {
      return false;
    }
    return true;
  });

  results = sortRooms(results, filters.sort);
  return results;
}

export function getRoom(id: string): Room | undefined {
  const custom = customRooms.find((room) => room.id === id);
  if (custom) return custom;
  return findRoom(id);
}

export function getFeaturedRooms(limit = 6): Room[] {
  return allRooms()
    .filter((room) => room.isFeatured && room.availableSlots > 0)
    .slice(0, limit);
}

/** Cheapest and dearest rents across fixtures and custom rooms. */
export function rentBounds(): { min: number; max: number } {
  const rooms = allRooms();
  if (rooms.length === 0) return { min: 0, max: 0 };
  const rents = rooms.map((r) => r.monthlyRent);
  return { min: Math.min(...rents), max: Math.max(...rents) };
}

export function roomCountForCity(city: string): number {
  return allRooms().filter((room) => room.city === city && room.availableSlots > 0).length;
}

export const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = [
  { value: 'studio', label: 'Studio' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'boarding_house', label: 'Boarding house' },
  { value: 'shared_room', label: 'Shared room' },
];

export function roomTypeLabel(type: RoomType): string {
  return ROOM_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export const ROOM_SORT_OPTIONS: { value: RoomSort; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Available soonest' },
  { value: 'distance', label: 'Nearest first' },
];
