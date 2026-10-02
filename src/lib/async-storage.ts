/**
 * Local storage wrapper using AsyncStorage for demo data persistence.
 *
 * All app data (bookings, saved properties, roommate requests) is stored locally
 * when DEMO_MODE is true. Data persists across app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BookingRow, SavedPropertyRow, SavedRoommateProfileRow, RoommateRequestRow } from '@/lib/database.types';

// Storage keys
const KEYS = {
  BOOKINGS: 'demo-bookings',
  SAVED_PROPERTIES: 'demo-saved-properties',
  SAVED_ROOMMATES: 'demo-saved-roommates',
  ROOMMATE_REQUESTS: 'demo-roommate-requests',
  SEEDED: 'demo-seeded',
} as const;

// ── Generic helpers ──────────────────────────────────────────────────────────

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const json = await AsyncStorage.getItem(key);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch (error) {
    console.error(`[async-storage] Failed to get ${key}:`, error);
    return null;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    const json = JSON.stringify(value);
    await AsyncStorage.setItem(key, json);
  } catch (error) {
    console.error(`[async-storage] Failed to set ${key}:`, error);
  }
}

async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[async-storage] Failed to remove ${key}:`, error);
  }
}

// ── Bookings ─────────────────────────────────────────────────────────────────

export async function getBookings(): Promise<BookingRow[]> {
  return (await getItem<BookingRow[]>(KEYS.BOOKINGS)) ?? [];
}

export async function setBookings(bookings: BookingRow[]): Promise<void> {
  await setItem(KEYS.BOOKINGS, bookings);
}

export async function addBooking(booking: BookingRow): Promise<void> {
  const bookings = await getBookings();
  bookings.push(booking);
  await setBookings(bookings);
}

export async function updateBooking(id: string, updates: Partial<BookingRow>): Promise<BookingRow | null> {
  const bookings = await getBookings();
  const index = bookings.findIndex((b) => b.id === id);
  if (index === -1) return null;
  const current = bookings[index];
  const updated = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  } as BookingRow;
  bookings[index] = updated;
  await setBookings(bookings);
  return updated;
}

export async function removeBooking(id: string): Promise<void> {
  const bookings = await getBookings();
  const filtered = bookings.filter((b) => b.id !== id);
  await setBookings(filtered);
}

// ── Saved Properties ─────────────────────────────────────────────────────────

export async function getSavedProperties(): Promise<SavedPropertyRow[]> {
  return (await getItem<SavedPropertyRow[]>(KEYS.SAVED_PROPERTIES)) ?? [];
}

export async function setSavedProperties(saved: SavedPropertyRow[]): Promise<void> {
  await setItem(KEYS.SAVED_PROPERTIES, saved);
}

export async function addSavedProperty(userId: string, propertyId: string): Promise<void> {
  const saved = await getSavedProperties();
  const exists = saved.some((s) => s.user_id === userId && s.property_id === propertyId);
  if (!exists) {
    saved.push({
      user_id: userId,
      property_id: propertyId,
      created_at: new Date().toISOString(),
    });
    await setSavedProperties(saved);
  }
}

export async function removeSavedProperty(userId: string, propertyId: string): Promise<void> {
  const saved = await getSavedProperties();
  const filtered = saved.filter((s) => !(s.user_id === userId && s.property_id === propertyId));
  await setSavedProperties(filtered);
}

// ── Saved Roommates ──────────────────────────────────────────────────────────

export async function getSavedRoommates(): Promise<SavedRoommateProfileRow[]> {
  return (await getItem<SavedRoommateProfileRow[]>(KEYS.SAVED_ROOMMATES)) ?? [];
}

export async function setSavedRoommates(saved: SavedRoommateProfileRow[]): Promise<void> {
  await setItem(KEYS.SAVED_ROOMMATES, saved);
}

export async function addSavedRoommate(userId: string, roommateProfileId: string): Promise<void> {
  const saved = await getSavedRoommates();
  const exists = saved.some((s) => s.user_id === userId && s.roommate_profile_id === roommateProfileId);
  if (!exists) {
    saved.push({
      user_id: userId,
      roommate_profile_id: roommateProfileId,
      created_at: new Date().toISOString(),
    });
    await setSavedRoommates(saved);
  }
}

export async function removeSavedRoommate(userId: string, roommateProfileId: string): Promise<void> {
  const saved = await getSavedRoommates();
  const filtered = saved.filter((s) => !(s.user_id === userId && s.roommate_profile_id === roommateProfileId));
  await setSavedRoommates(filtered);
}

// ── Roommate Requests ────────────────────────────────────────────────────────

export async function getRoommateRequests(): Promise<RoommateRequestRow[]> {
  return (await getItem<RoommateRequestRow[]>(KEYS.ROOMMATE_REQUESTS)) ?? [];
}

export async function setRoommateRequests(requests: RoommateRequestRow[]): Promise<void> {
  await setItem(KEYS.ROOMMATE_REQUESTS, requests);
}

export async function addRoommateRequest(request: RoommateRequestRow): Promise<void> {
  const requests = await getRoommateRequests();
  requests.push(request);
  await setRoommateRequests(requests);
}

export async function updateRoommateRequest(id: string, updates: Partial<RoommateRequestRow>): Promise<RoommateRequestRow | null> {
  const requests = await getRoommateRequests();
  const index = requests.findIndex((r) => r.id === id);
  if (index === -1) return null;
  const current = requests[index];
  const updated = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  } as RoommateRequestRow;
  requests[index] = updated;
  await setRoommateRequests(requests);
  return updated;
}

export async function removeRoommateRequest(id: string): Promise<void> {
  const requests = await getRoommateRequests();
  const filtered = requests.filter((r) => r.id !== id);
  await setRoommateRequests(filtered);
}

// ── Seeding flag ─────────────────────────────────────────────────────────────

export async function isSeeded(): Promise<boolean> {
  const flag = await getItem<boolean>(KEYS.SEEDED);
  return flag === true;
}

export async function markSeeded(): Promise<void> {
  await setItem(KEYS.SEEDED, true);
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    removeItem(KEYS.BOOKINGS),
    removeItem(KEYS.SAVED_PROPERTIES),
    removeItem(KEYS.SAVED_ROOMMATES),
    removeItem(KEYS.ROOMMATE_REQUESTS),
    removeItem(KEYS.SEEDED),
  ]);
}
