/**
 * RoomLink domain types.
 *
 * RoomLink is a frontend-only demo: there is no server, no database and no
 * external auth. These types describe the shape of the mock data in
 * `@/lib/mock-data` and the shape persisted to AsyncStorage by
 * `@/lib/storage`. Nothing here is derived from a schema, so nothing here may
 * be "invented" to match a column — if a screen needs a field, add it here and
 * give it a value in the fixtures.
 */

import { Ionicons } from '@expo/vector-icons';

/**
 * Every glyph Ionicons ships.
 *
 * Derived from `glyphMap` rather than `ComponentProps<typeof Ionicons>`: the
 * `Icon` type in @expo/vector-icons v15 is construct-only (no call signature),
 * so `ComponentProps` cannot recover the prop types and collapses to `any`.
 */
export type IconName = keyof typeof Ionicons.glyphMap;

/* ------------------------------------------------------------------ */
/* Lifestyle                                                           */
/* ------------------------------------------------------------------ */

export type SmokingPreference = 'non_smoker' | 'smoker' | 'no_preference';
export type DrinkingPreference = 'non_drinker' | 'social' | 'no_preference';
export type PetPreference = 'love_pets' | 'no_pets' | 'no_preference';
export type GuestPreference = 'few_guests' | 'no_guests' | 'no_preference';
export type StudyHabits = 'quiet_study' | 'study_together' | 'no_preference';
export type SleepSchedule = 'early_bird' | 'night_owl' | 'flexible';
export type GenderPreference = 'any' | 'female_only' | 'male_only';

/**
 * The compatibility axes shown on a roommate profile and scored when matching.
 * Every field has a defined "no preference" value so two profiles always
 * compare without throwing on `undefined`.
 */
export interface Lifestyle {
  /** 1 = spotless, daily cleaning … 5 = relaxed, no routine. */
  cleanliness: number;
  smoking: SmokingPreference;
  drinking: DrinkingPreference;
  pets: PetPreference;
  guests: GuestPreference;
  studyHabits: StudyHabits;
  sleepSchedule: SleepSchedule;
  genderPreference: GenderPreference;
}

export function defaultLifestyle(): Lifestyle {
  return {
    cleanliness: 3,
    smoking: 'no_preference',
    drinking: 'no_preference',
    pets: 'no_preference',
    guests: 'no_preference',
    studyHabits: 'no_preference',
    sleepSchedule: 'flexible',
    genderPreference: 'any',
  };
}

/* ------------------------------------------------------------------ */
/* Amenities                                                           */
/* ------------------------------------------------------------------ */

export interface Amenity {
  slug: string;
  label: string;
  icon: IconName;
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  /** One line under the name on the profile and roommate cards. */
  headline: string;
  /** Longer "about me" text. */
  bio: string;
  occupation: string;
  budgetMin: number;
  budgetMax: number;
  preferredCity: string;
  moveInDate: string;
  interests: string[];
  lifestyle: Lifestyle;
  /**
   * Which updates to surface in the bell.
   *
   * Grouped rather than four loose booleans so "notifications" is one value
   * with a known shape — adding a channel later is a type change, not a hunt
   * through every screen that reads a field.
   */
  notificationPrefs: {
    applications: boolean;
    roommateRequests: boolean;
    messages: boolean;
  };
  /** Hides the profile from roommate search while still allowing room applications. */
  isDiscoverable: boolean;
}

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

export type RoomType = 'studio' | 'apartment' | 'boarding_house' | 'condo' | 'shared_room';

export interface LandlordSummary {
  name: string;
  verified: boolean;
  avatarUrl: string | null;
  responseTime: string;
}

/** The current occupant of a slot, as shown on the room detail page. */
export interface OccupantSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  occupation: string;
  compatibility: number;
}

export interface Room {
  id: string;
  title: string;
  roomType: RoomType;
  monthlyRent: number;
  /** Deposit + first month, shown on the detail page. */
  advanceAmount: number;
  city: string;
  barangay: string;
  landmark: string;
  latitude: number;
  longitude: number;
  /** ISO date the slot becomes free. */
  availableFrom: string;
  minStayMonths: number;
  /** How many people can share the unit. */
  capacity: number;
  /** Slots still open. */
  availableSlots: number;
  isFeatured: boolean;
  description: string;
  amenities: Amenity[];
  houseRules: string[];
  images: string[];
  landlord: LandlordSummary;
  occupants: OccupantSummary[];
  /** Straight-line distance from the signed-in user's preferred city centre. */
  distanceKm: number | null;
  rating: number;
  reviewCount: number;
}

/* ------------------------------------------------------------------ */
/* Roommates                                                           */
/* ------------------------------------------------------------------ */

export type MatchKind = 'match' | 'near' | 'mismatch';

export interface MatchReason {
  label: string;
  detail: string;
  kind: MatchKind;
}

/**
 * The state of a request the user has sent.
 *
 * One vocabulary for both kinds. A room application and a roommate request are
 * the same object pointed at a different target, so they share a status type —
 * the only thing that differs is the wording shown to the reader, which lives
 * with the labels in `@/services/application-service`.
 */
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** @deprecated Kept as an alias so existing call sites read correctly. */
export type RoommateRequestStatus = RequestStatus;

export type ApplicationStatus = RequestStatus;

export interface Roommate {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string;
  about: string;
  occupation: string;
  schoolOrWork: string;
  budgetMin: number;
  budgetMax: number;
  preferredCity: string;
  preferredBarangay: string;
  moveInDate: string;
  interests: string[];
  lifestyle: Lifestyle;
  /** 0-100 against the signed-in user's profile. */
  compatibilityScore: number;
  matchReasons: MatchReason[];
  verified: boolean;
  responseTime: string;
  /** Set by `@/services` from the persisted request list, never in fixtures. */
  requestStatus: RoommateRequestStatus | null;
  /** Set by `@/services` from the persisted saved list, never in fixtures. */
  isSaved: boolean;
}

/* ------------------------------------------------------------------ */
/* Applications & roommate requests                                    */
/* ------------------------------------------------------------------ */

export interface Application {
  id: string;
  kind: 'room' | 'roommate';
  status: ApplicationStatus;
  /** Set when kind === 'room'. */
  roomId: string | null;
  roomTitle: string | null;
  roomImage: string | null;
  /** Set when kind === 'roommate'. */
  roommateId: string | null;
  roommateName: string | null;
  roommateAvatarUrl: string | null;
  moveInDate: string;
  occupants: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  rejectionReason: string | null;
}

/** What the request form collects, independent of what it is aimed at. */
export interface RequestDetails {
  moveInDate: string;
  occupants: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  note: string;
}

/**
 * A request before it becomes an `Application`.
 *
 * A union rather than one shape with two optional ids: a room application
 * without a room id is not a thing that can be sent, and making the id required
 * on the matching branch means the type refuses to describe it.
 */
export type ApplicationDraft =
  | (RequestDetails & { kind: 'room'; roomId: string })
  | (RequestDetails & { kind: 'roommate'; roommateId: string });

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export interface Message {
  id: string;
  conversationId: string;
  /** `'me'` for messages the signed-in user sent. */
  senderId: string;
  body: string;
  sentAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  roommateId: string;
  roommateName: string;
  roommateAvatarUrl: string | null;
  roommateOccupation: string;
  roommateCompatibility: number;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isSaved: boolean;
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export type NotificationKind =
  | 'application_update'
  | 'roommate_request'
  | 'message';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  /** In-app destination, e.g. `/room/demo-room-1`. */
  href: string | null;
}

/* ------------------------------------------------------------------ */
/* Landing page content                                                */
/* ------------------------------------------------------------------ */

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  quote: string;
  avatarUrl: string;
  rating: number;
}

export interface Benefit {
  id: string;
  title: string;
  body: string;
  icon: IconName;
}

export interface HowItWorksStep {
  id: string;
  step: number;
  title: string;
  body: string;
  icon: IconName;
}

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

export type FaqCategory = 'getting_started' | 'rooms' | 'roommates' | 'applications' | 'account';

/* ------------------------------------------------------------------ */
/* Search & filter state                                               */
/* ------------------------------------------------------------------ */

export type RoomSort = 'recommended' | 'price_asc' | 'price_desc' | 'newest' | 'distance';

export interface RoomFilters {
  query: string;
  city: string | null;
  minRent: number | null;
  maxRent: number | null;
  roomTypes: RoomType[];
  amenities: string[];
  /** Only rooms with a slot free on or before this ISO date. */
  availableBefore: string | null;
  minCompatibility: number | null;
  sort: RoomSort;
}

export type RoommateSort = 'compatibility' | 'budget_asc' | 'newest';

export interface RoommateFilters {
  query: string;
  city: string | null;
  minBudget: number | null;
  maxBudget: number | null;
  interests: string[];
  studyHabits: StudyHabits[];
  sleepSchedules: SleepSchedule[];
  nonSmokersOnly: boolean;
  sort: RoommateSort;
}

export function defaultRoomFilters(): RoomFilters {
  return {
    query: '',
    city: null,
    minRent: null,
    maxRent: null,
    roomTypes: [],
    amenities: [],
    availableBefore: null,
    minCompatibility: null,
    sort: 'recommended',
  };
}

export function defaultRoommateFilters(): RoommateFilters {
  return {
    query: '',
    city: null,
    minBudget: null,
    maxBudget: null,
    interests: [],
    studyHabits: [],
    sleepSchedules: [],
    nonSmokersOnly: false,
    sort: 'compatibility',
  };
}

/** True when anything other than sort order is narrowing the result set. */
export function hasActiveRoomFilters(filters: RoomFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.city !== null ||
    filters.minRent !== null ||
    filters.maxRent !== null ||
    filters.roomTypes.length > 0 ||
    filters.amenities.length > 0 ||
    filters.availableBefore !== null ||
    filters.minCompatibility !== null
  );
}

export function hasActiveRoommateFilters(filters: RoommateFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.city !== null ||
    filters.minBudget !== null ||
    filters.maxBudget !== null ||
    filters.interests.length > 0 ||
    filters.studyHabits.length > 0 ||
    filters.sleepSchedules.length > 0 ||
    filters.nonSmokersOnly
  );
}

/** Count of narrowing filters, for the "Filters (3)" badge. */
export function countActiveRoomFilters(filters: RoomFilters): number {
  let n = 0;
  if (filters.query.trim()) n += 1;
  if (filters.city) n += 1;
  if (filters.minRent !== null || filters.maxRent !== null) n += 1;
  if (filters.roomTypes.length) n += filters.roomTypes.length;
  if (filters.amenities.length) n += filters.amenities.length;
  if (filters.availableBefore) n += 1;
  if (filters.minCompatibility !== null) n += 1;
  return n;
}

export function countActiveRoommateFilters(filters: RoommateFilters): number {
  let n = 0;
  if (filters.query.trim()) n += 1;
  if (filters.city) n += 1;
  if (filters.minBudget !== null || filters.maxBudget !== null) n += 1;
  n += filters.interests.length;
  n += filters.studyHabits.length;
  n += filters.sleepSchedules.length;
  if (filters.nonSmokersOnly) n += 1;
  return n;
}