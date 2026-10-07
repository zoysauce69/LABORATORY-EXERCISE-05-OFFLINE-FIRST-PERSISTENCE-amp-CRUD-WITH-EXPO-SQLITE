/**
 * The only persistence layer in RoomLink.
 *
 * Everything the user creates — saved rooms and roommates, applications,
 * roommate requests, messages, notifications, profile edits and the session —
 * lives here as JSON in AsyncStorage. There is no server to reconcile with, so
 * a read is always the whole truth.
 *
 * Conventions:
 *   - Keys are namespaced `roomlink:` and are exported so "reset demo data"
 *     can enumerate them.
 *   - A corrupt or unparseable value is reported as a failure rather than
 *     silently treated as empty, so the UI can show the error instead of
 *     quietly pretending the user has no data.
 *   - Reads fall back to `seed` only when nothing has been written yet, so a
 *     user who clears their favourites keeps them cleared.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ok, fail, type Result } from './errors';
import type {
  AppNotification,
  Application,
  Conversation,
  Message,
  Profile,
  Room,
} from './types';

export const STORAGE_KEYS = {
  session: 'roomlink:session',
  accounts: 'roomlink:accounts',
  profile: 'roomlink:profile',
  savedRooms: 'roomlink:saved-rooms',
  savedRoommates: 'roomlink:saved-roommates',
  applications: 'roomlink:applications',
  roommateRequests: 'roomlink:roommate-requests',
  conversations: 'roomlink:conversations',
  messages: 'roomlink:messages',
  notifications: 'roomlink:notifications',
  seeded: 'roomlink:seeded',
  customRooms: 'roomlink:rooms:custom',
} as const;

const ALL_KEYS = Object.values(STORAGE_KEYS);

/** Thrown internally so `read` can tell "missing" from "corrupt". */
class CorruptError extends Error {}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

async function read<T>(key: string): Promise<Result<T | null>> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return fail('Your device storage is unavailable, so nothing could be saved.', 'storage_unavailable');
  }

  if (raw === null) return ok(null);

  try {
    return ok(JSON.parse(raw) as T);
  } catch {
    return fail(`Saved data for "${key}" is corrupted and could not be read.`, 'corrupt_storage');
  }
}

async function write<T>(key: string, value: T): Promise<Result<true>> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return ok(true);
  } catch {
    return fail('Your changes could not be saved to this device.', 'storage_write_failed');
  }
}

async function remove(key: string): Promise<Result<true>> {
  try {
    await AsyncStorage.removeItem(key);
    return ok(true);
  } catch {
    return fail('That change could not be saved to this device.', 'storage_write_failed');
  }
}

/**
 * Reads a list, seeding it on first launch.
 *
 * `seed` is only used when the key has never been written. Returns a failure
 * when the stored value is corrupt so the screen can show it.
 */
async function readList<T>(key: string, seed: readonly T[]): Promise<Result<T[]>> {
  const result = await read<T[]>(key);

  if (!result.ok) {
    return fail(result.error.message, result.error.code);
  }

  if (result.data === null) {
    // First launch: persist the seed so subsequent reads are plain reads.
    await write(key, [...seed]);
    return ok([...seed]);
  }

  if (!Array.isArray(result.data)) {
    return fail(`Saved data for "${key}" is corrupted and could not be read.`, 'corrupt_storage');
  }

  return ok(result.data);
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

/**
 * A locally registered account.
 *
 * SECURITY: this app has no server, so "registration" is a local list and
 * `passwordHash` is a reversible-in-principle obfuscation, not a password
 * hash. It exists purely so sign-up followed by sign-in behaves believably in
 * the demo. Never reuse this pattern for real credentials.
 */
export interface LocalAccount {
  email: string;
  fullName: string;
  passwordHash: string;
  createdAt: string;
}

/**
 * Obfuscates a password for local comparison.
 *
 * Deliberately trivial and clearly labelled as demo-only. A real deployment
 * must hash server-side with bcrypt/argon2 over HTTPS.
 */
export function obfuscatePassword(password: string): string {
  let out = '';
  for (let i = 0; i < password.length; i += 1) {
    const char = password.charCodeAt(i);
    out += String.fromCharCode(((char * 31 + 7 + i) % 126) + 33);
  }
  return `demo$${out}`;
}

export async function getAccounts(seed: readonly LocalAccount[] = []): Promise<Result<LocalAccount[]>> {
  return readList<LocalAccount>(STORAGE_KEYS.accounts, seed);
}

export async function setAccounts(accounts: LocalAccount[]): Promise<Result<true>> {
  return write(STORAGE_KEYS.accounts, accounts);
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export interface StoredSession {
  userId: string;
  email: string;
  signedInAt: string;
}

export async function getSession(): Promise<Result<StoredSession | null>> {
  return read<StoredSession>(STORAGE_KEYS.session);
}

export async function setSession(session: StoredSession): Promise<Result<true>> {
  return write(STORAGE_KEYS.session, session);
}

export async function clearSession(): Promise<Result<true>> {
  return remove(STORAGE_KEYS.session);
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

/**
 * Reads the profile, falling back to `seed` on first launch.
 *
 * Signing out deliberately does NOT clear the profile: the demo account is the
 * same person every time, and wiping their edits on every sign-out would make
 * the edit-profile screen impossible to demonstrate.
 */
export async function getProfile(seed: Profile): Promise<Result<Profile>> {
  const result = await read<Profile>(STORAGE_KEYS.profile);
  if (!result.ok) return fail(result.error.message, result.error.code);
  if (result.data === null) {
    await write(STORAGE_KEYS.profile, seed);
    return ok(seed);
  }
  return ok({ ...seed, ...result.data, lifestyle: { ...seed.lifestyle, ...result.data.lifestyle } });
}

export async function setProfile(profile: Profile): Promise<Result<true>> {
  return write(STORAGE_KEYS.profile, profile);
}

/* ------------------------------------------------------------------ */
/* Saved rooms & roommates                                             */
/* ------------------------------------------------------------------ */

/** Saved rooms are stored as ids; `@/services` hydrates them from fixtures. */
export async function getSavedRoomIds(seed: readonly string[] = []): Promise<Result<string[]>> {
  return readList<string>(STORAGE_KEYS.savedRooms, seed);
}

export async function setSavedRoomIds(ids: string[]): Promise<Result<true>> {
  return write(STORAGE_KEYS.savedRooms, ids);
}

export async function getSavedRoommateIds(seed: readonly string[] = []): Promise<Result<string[]>> {
  return readList<string>(STORAGE_KEYS.savedRoommates, seed);
}

export async function setSavedRoommateIds(ids: string[]): Promise<Result<true>> {
  return write(STORAGE_KEYS.savedRoommates, ids);
}

/* ------------------------------------------------------------------ */
/* Applications & roommate requests                                    */
/* ------------------------------------------------------------------ */

export async function getApplications(seed: readonly Application[]): Promise<Result<Application[]>> {
  return readList<Application>(STORAGE_KEYS.applications, seed);
}

export async function setApplications(applications: Application[]): Promise<Result<true>> {
  return write(STORAGE_KEYS.applications, applications);
}

/**
 * Roommate requests are stored separately from applications so the roommate
 * screen can answer one without loading the room-application list, but they
 * share the `Application` shape and the "My applications" screen shows both.
 */
export async function getRoommateRequests(seed: readonly Application[]): Promise<Result<Application[]>> {
  return readList<Application>(STORAGE_KEYS.roommateRequests, seed);
}

export async function setRoommateRequests(requests: Application[]): Promise<Result<true>> {
  return write(STORAGE_KEYS.roommateRequests, requests);
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export async function getConversations(seed: readonly Conversation[]): Promise<Result<Conversation[]>> {
  return readList<Conversation>(STORAGE_KEYS.conversations, seed);
}

export async function setConversations(conversations: Conversation[]): Promise<Result<true>> {
  return write(STORAGE_KEYS.conversations, conversations);
}

export async function getMessages(seed: readonly Message[]): Promise<Result<Message[]>> {
  return readList<Message>(STORAGE_KEYS.messages, seed);
}

export async function setMessages(messages: Message[]): Promise<Result<true>> {
  return write(STORAGE_KEYS.messages, messages);
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export async function getNotifications(seed: readonly AppNotification[]): Promise<Result<AppNotification[]>> {
  return readList<AppNotification>(STORAGE_KEYS.notifications, seed);
}

export async function setNotifications(notifications: AppNotification[]): Promise<Result<true>> {
  return write(STORAGE_KEYS.notifications, notifications);
}

/* ------------------------------------------------------------------ */
/* Demo reset                                                          */
/* ------------------------------------------------------------------ */

/**
 * Marks the fixtures as installed.
 *
 * Only used to decide whether to show the "Reset demo data" affordance; the
 * seeded lists above are written lazily on first read, so there is no
 * initialisation pass to guard.
 */
export async function hasSeeded(): Promise<Result<boolean>> {
  const result = await read<boolean>(STORAGE_KEYS.seeded);
  if (!result.ok) return fail(result.error.message, result.error.code);
  return ok(result.data === true);
}

export async function markSeeded(): Promise<Result<true>> {
  return write(STORAGE_KEYS.seeded, true);
}

/**
 * Wipes every key so the next launch re-seeds from the fixtures.
 *
 * Backs the "Reset demo data" button in Settings.
 *
 * Removes keys one at a time rather than through a batch call: the public
 * AsyncStorage API in v3 has no batch remove, and eleven sequential writes are
 * not worth wrapping in a bespoke batching helper.
 */
export async function resetAllData(): Promise<Result<true>> {
  try {
    await Promise.all(ALL_KEYS.map((key) => AsyncStorage.removeItem(key)));
    return ok(true);
  } catch {
    return fail('The demo data could not be reset on this device.', 'storage_write_failed');
  }
}

export { CorruptError };

/* ------------------------------------------------------------------ */
/* Custom rooms (created from Settings → Room Management)              */
/* ------------------------------------------------------------------ */

/** The user's own listings, kept apart from the bundled fixtures. */
export const CUSTOM_ROOMS_KEY = STORAGE_KEYS.customRooms;

/** Reads the locally added rooms. Never seeds: an empty list is valid. */
export async function getCustomRooms(): Promise<Result<Room[]>> {
  const result = await read<Room[]>(CUSTOM_ROOMS_KEY);

  if (!result.ok) {
    return fail(result.error.message, result.error.code);
  }

  if (result.data === null) return ok([]);
  if (!Array.isArray(result.data)) {
    return fail('Saved data for custom rooms is corrupted and could not be read.', 'corrupt_storage');
  }

  return ok(result.data);
}

/** Replaces the whole custom room list. */
export async function setCustomRooms(rooms: Room[]): Promise<Result<true>> {
  return write(CUSTOM_ROOMS_KEY, rooms);
}
