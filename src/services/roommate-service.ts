/**
 * Roommate search, filtering, sorting and scoring.
 *
 * Reads the fixtures in `@/lib/mock-data`, recomputes the compatibility score
 * and match reasons against the signed-in profile via `@/services/compatibility`,
 * and overlays the two pieces of state the user owns — saved ids and any
 * outgoing request — from AsyncStorage.
 */

import { ROOMMATES, findRoommate } from '@/lib/mock-data';
import type {
  Profile,
  Roommate,
  RoommateFilters,
  RoommateRequestStatus,
  RoommateSort,
  SleepSchedule,
  StudyHabits,
} from '@/lib/types';
import { matchReasons, scoreRoommate } from './compatibility';

function matchesQuery(roommate: Roommate, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (query.length === 0) return true;

  const haystack = [
    roommate.fullName,
    roommate.headline,
    roommate.about,
    roommate.occupation,
    roommate.schoolOrWork,
    roommate.preferredCity,
    roommate.preferredBarangay,
    ...roommate.interests,
  ]
    .join(' ')
    .toLowerCase();

  return query.split(/\s+/).every((term) => haystack.includes(term));
}

/** The roommate can afford at least the bottom of the user's budget band. */
function budgetOverlaps(
  roommate: Roommate,
  min: number | null,
  max: number | null,
): boolean {
  if (min !== null && roommate.budgetMax < min) return false;
  if (max !== null && roommate.budgetMin > max) return false;
  return true;
}

function sortRoommates(roommates: Roommate[], sort: RoommateSort): Roommate[] {
  const list = [...roommates];
  switch (sort) {
    case 'budget_asc':
      return list.sort((a, b) => a.budgetMin - b.budgetMin);
    case 'newest':
      // Fixtures have no signup dates, so "newest" means soonest move-in.
      return list.sort(
        (a, b) => new Date(a.moveInDate).getTime() - new Date(b.moveInDate).getTime(),
      );
    case 'compatibility':
    default:
      return list.sort((a, b) => {
        if (b.compatibilityScore !== a.compatibilityScore) {
          return b.compatibilityScore - a.compatibilityScore;
        }
        return a.fullName.localeCompare(b.fullName);
      });
  }
}

/**
 * Applies the user's lifestyle to the roommate list.
 *
 * `isDiscoverable = false` hides the user from *other* people, but must not
 * stop them browsing, so this is a filter on the roommate's side only and the
 * signed-in user is never in `ROOMMATES`.
 */
function applyFilters(roommates: Roommate[], filters: RoommateFilters): Roommate[] {
  return roommates.filter((roommate) => {
    if (!matchesQuery(roommate, filters.query)) return false;
    if (filters.city !== null && roommate.preferredCity !== filters.city) return false;
    if (!budgetOverlaps(roommate, filters.minBudget, filters.maxBudget)) return false;

    if (filters.interests.length > 0) {
      const owned = new Set(roommate.interests.map((i) => i.toLowerCase()));
      const shares = filters.interests.some((interest) => owned.has(interest.toLowerCase()));
      if (!shares) return false;
    }

    if (filters.studyHabits.length > 0 && !filters.studyHabits.includes(roommate.lifestyle.studyHabits)) {
      return false;
    }

    if (filters.sleepSchedules.length > 0 && !filters.sleepSchedules.includes(roommate.lifestyle.sleepSchedule)) {
      return false;
    }

    if (filters.nonSmokersOnly && roommate.lifestyle.smoking === 'smoker') return false;

    return true;
  });
}

/**
 * Scores, decorates and filters the roommate list.
 *
 * `savedIds` and `requests` come from AsyncStorage; passing them in keeps this
 * function pure and testable, and lets the caller batch its storage reads.
 */
export function searchRoommates(
  profile: Profile,
  filters: RoommateFilters,
  savedIds: readonly string[],
  requests: ReadonlyMap<string, RoommateRequestStatus>,
): Roommate[] {
  const scored = ROOMMATES.map((roommate) => ({
    ...roommate,
    compatibilityScore: scoreRoommate(profile, roommate),
    matchReasons: matchReasons(profile, roommate),
    isSaved: savedIds.includes(roommate.id),
    requestStatus: requests.get(roommate.id) ?? null,
  }));

  const filtered = applyFilters(scored, filters);
  return sortRoommates(filtered, filters.sort);
}

export function getRoommate(id: string): Roommate | undefined {
  return findRoommate(id);
}

/** Decorates a single roommate for the profile screen. */
export function decorateRoommate(
  profile: Profile,
  roommate: Roommate,
  savedIds: readonly string[],
  requests: ReadonlyMap<string, RoommateRequestStatus>,
): Roommate {
  return {
    ...roommate,
    compatibilityScore: scoreRoommate(profile, roommate),
    matchReasons: matchReasons(profile, roommate),
    isSaved: savedIds.includes(roommate.id),
    requestStatus: requests.get(roommate.id) ?? null,
  };
}

/** Everyone, scored, for the landing page rail. */
export function topMatches(profile: Profile, limit = 4): Roommate[] {
  return ROOMMATES.map((roommate) => ({
    ...roommate,
    compatibilityScore: scoreRoommate(profile, roommate),
    matchReasons: matchReasons(profile, roommate),
  }))
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, limit);
}

export function budgetBounds(): { min: number; max: number } {
  if (ROOMMATES.length === 0) return { min: 0, max: 0 };
  const all = ROOMMATES.flatMap((r) => [r.budgetMin, r.budgetMax]);
  return { min: Math.min(...all), max: Math.max(...all) };
}

export const ROOMMATE_SORT_OPTIONS: { value: RoommateSort; label: string }[] = [
  { value: 'compatibility', label: 'Best compatibility' },
  { value: 'budget_asc', label: 'Budget: low to high' },
  { value: 'newest', label: 'Available soonest' },
];

export const STUDY_HABIT_OPTIONS: { value: StudyHabits; label: string }[] = [
  { value: 'quiet_study', label: 'Quiet study' },
  { value: 'study_together', label: 'Study together' },
  { value: 'no_preference', label: 'No preference' },
];

export const SLEEP_SCHEDULE_OPTIONS: { value: SleepSchedule; label: string }[] = [
  { value: 'early_bird', label: 'Early bird' },
  { value: 'night_owl', label: 'Night owl' },
  { value: 'flexible', label: 'Flexible' },
];