/**
 * Static option lists and label helpers for pickers, chips and filter sheets.
 *
 * Anything that maps a stored token to something a person reads lives here, so
 * a slug is never stringified straight into the UI.
 */

import type {
  DrinkingPreference,
  GenderPreference,
  GuestPreference,
  IconName,
  PetPreference,
  SleepSchedule,
  SmokingPreference,
  StudyHabits,
} from '@/lib/types';

export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/**
 * Amenity slug to icon.
 *
 * The slug is the contract; this map keeps the UI in sync without threading the
 * icon through every call site. Unknown slugs fall back to a neutral icon.
 */
export const AMENITY_ICONS: Record<string, IconName> = {
  wifi: 'wifi',
  aircon: 'snow',
  parking: 'car',
  laundry: 'shirt',
  kitchen: 'restaurant',
  gym: 'barbell',
  pool: 'water',
  elevator: 'swap-vertical',
  water: 'water',
  electricity: 'flash',
  internet: 'globe',
  pet_friendly: 'paw',
  security: 'shield-checkmark',
  furnished: 'bed',
  balcony: 'partly-sunny',
  study_area: 'book',
  cctv: 'videocam',
  water_heater: 'thermometer',
  own_meter: 'speedometer',
  flexible_terms: 'calendar',
};

export function amenityIcon(slug: string | null | undefined): IconName {
  if (!slug) return 'help-circle-outline';
  return AMENITY_ICONS[slug] ?? 'checkmark-circle-outline';
}

/* ------------------------------------------------------------------ */
/* Lifestyle                                                           */
/* ------------------------------------------------------------------ */

/** 1 = spotless and daily … 5 = relaxed with no fixed routine. */
export const CLEANLINESS_LABELS: Record<number, string> = {
  1: 'Spotless — I clean daily',
  2: 'Very tidy — cleaned regularly',
  3: 'Balanced — tidy most days',
  4: 'Relaxed — tidy when needed',
  5: 'Relaxed — no strict routine',
};

export function cleanlinessLabel(value: number | null | undefined): string {
  if (!value) return 'Not set';
  return CLEANLINESS_LABELS[value] ?? 'Not set';
}

export const CLEANLINESS_OPTIONS: Option<string>[] = [
  { value: '1', label: 'Spotless', description: 'I clean every day' },
  { value: '2', label: 'Very tidy', description: 'Cleaned regularly' },
  { value: '3', label: 'Balanced', description: 'Tidy most days' },
  { value: '4', label: 'Relaxed', description: 'Tidy when needed' },
  { value: '5', label: 'No routine', description: 'I am easygoing about mess' },
];

export const SMOKING_OPTIONS: Option<SmokingPreference>[] = [
  { value: 'non_smoker', label: 'Non-smoker only' },
  { value: 'smoker', label: 'Smoker friendly' },
  { value: 'no_preference', label: 'No preference' },
];

export const DRINKING_OPTIONS: Option<DrinkingPreference>[] = [
  { value: 'non_drinker', label: 'Non-drinker' },
  { value: 'social', label: 'Social drinker' },
  { value: 'no_preference', label: 'No preference' },
];

export const PET_OPTIONS: Option<PetPreference>[] = [
  { value: 'love_pets', label: 'Pets welcome' },
  { value: 'no_pets', label: 'No pets' },
  { value: 'no_preference', label: 'No preference' },
];

export const GUEST_OPTIONS: Option<GuestPreference>[] = [
  { value: 'few_guests', label: 'Occasional guests ok' },
  { value: 'no_guests', label: 'No guests' },
  { value: 'no_preference', label: 'No preference' },
];

export const STUDY_HABIT_OPTIONS: Option<StudyHabits>[] = [
  { value: 'quiet_study', label: 'Prefer quiet study time' },
  { value: 'study_together', label: 'Happy to study together' },
  { value: 'no_preference', label: 'No preference' },
];

export const SLEEP_SCHEDULE_OPTIONS: Option<SleepSchedule>[] = [
  { value: 'early_bird', label: 'Early bird' },
  { value: 'night_owl', label: 'Night owl' },
  { value: 'flexible', label: 'Flexible' },
];

export const GENDER_PREFERENCE_OPTIONS: Option<GenderPreference>[] = [
  { value: 'any', label: 'Open to anyone' },
  { value: 'female_only', label: 'Female tenants only' },
  { value: 'male_only', label: 'Male tenants only' },
];

/**
 * Compact one-line summary of a lifestyle, for list rows where the full set of
 * chips would not fit.
 */
export function lifestyleSummary(parts: {
  sleepSchedule: SleepSchedule;
  studyHabits: StudyHabits;
  guests: GuestPreference;
  pets: PetPreference;
  smoking: SmokingPreference;
}): string {
  const sleep: Record<SleepSchedule, string> = {
    early_bird: 'Early bird',
    night_owl: 'Night owl',
    flexible: 'Flexible schedule',
  };
  const study: Record<StudyHabits, string> = {
    quiet_study: 'Quiet study',
    study_together: 'Studies together',
    no_preference: 'Any study style',
  };
  const guests: Record<GuestPreference, string> = {
    few_guests: 'Some guests ok',
    no_guests: 'No guests',
    no_preference: 'Any guests',
  };
  const pets: Record<PetPreference, string> = {
    love_pets: 'Loves pets',
    no_pets: 'No pets',
    no_preference: 'Any pets',
  };

  return [
    sleep[parts.sleepSchedule],
    study[parts.studyHabits],
    guests[parts.guests],
    parts.smoking === 'non_smoker' ? 'Non-smoker' : undefined,
    pets[parts.pets],
  ]
    .filter((part): part is string => part !== undefined)
    .join(' · ');
}