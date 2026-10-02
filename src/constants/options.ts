import { Ionicons } from '@expo/vector-icons';

import type { PropertyStatus, PropertyType, BookingStatus, RoommateRequestStatus, VerificationStatus } from '@/lib/database.types';

/**
 * Every glyph Ionicons ships.
 *
 * Derived from `glyphMap` rather than `ComponentProps<typeof Ionicons>`: the
 * `Icon` type in @expo/vector-icons v15 is construct-only (no call signature),
 * so `ComponentProps` cannot recover the prop types and collapses to `any`.
 */
export type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Maps the amenity slugs seeded by the migration to icon names.
 *
 * The slug column in Postgres is the contract; this map keeps the UI in sync
 * without a second round trip. Unknown slugs fall back to a neutral icon.
 */
export const AMENITY_ICONS: Record<string, IconName> = {
  wifi: 'wifi',
  air_conditioning: 'snow',
  parking: 'car',
  laundry: 'shirt',
  kitchen: 'restaurant',
  gym: 'barbell',
  water: 'water',
  electricity: 'flash',
  internet: 'globe',
  pet_friendly: 'paw',
  security: 'shield-checkmark',
  furnished: 'bed',
  balcony: 'partly-sunny',
  study_area: 'book',
  elevator: 'swap-vertical',
  cctv: 'videocam',
  water_heater: 'thermometer',
  own_electric_meter: 'speedometer',
  flexible_terms: 'calendar',
};

export function amenityIcon(slug: string | null | undefined): IconName {
  if (!slug) return 'help-circle-outline';
  return AMENITY_ICONS[slug] ?? 'checkmark-circle-outline';
}

export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export const PROPERTY_TYPE_OPTIONS: Option<PropertyType>[] = [
  { value: 'boarding_house', label: 'Boarding house' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'studio', label: 'Studio' },
  { value: 'shared_room', label: 'Shared room' },
];

export function propertyTypeLabel(type: PropertyType): string {
  return PROPERTY_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = {
  draft: 'Draft',
  published: 'Available',
  unpublished: 'Unlisted',
  occupied: 'Occupied',
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const ROOMMATE_STATUS_LABEL: Record<RoommateRequestStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected',
};

/** Tone used by StatusBadge to pick colours. */
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function bookingStatusTone(status: BookingStatus): BadgeTone {
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

export function roommateStatusTone(status: RoommateRequestStatus): BadgeTone {
  switch (status) {
    case 'accepted':
      return 'success';
    case 'declined':
      return 'danger';
    case 'cancelled':
      return 'neutral';
    case 'pending':
    default:
      return 'warning';
  }
}

export function verificationStatusTone(status: VerificationStatus): BadgeTone {
  switch (status) {
    case 'verified':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'pending':
    default:
      return 'warning';
  }
}

/**
 * Copy for the landlord verification card.
 *
 * Only an admin can move a landlord to `verified` (the database enforces this),
 * so every status here tells the landlord exactly what happens next rather than
 * implying they can self-approve.
 */
export interface VerificationSummary {
  message: string;
  nextStep: string;
  actionLabel: string;
}

export function verificationSummary(status: VerificationStatus): VerificationSummary {
  switch (status) {
    case 'verified':
      return {
        message: 'Your identity is verified. Your listings show a verified tick.',
        nextStep: '',
        actionLabel: 'View verification details',
      };
    case 'rejected':
      return {
        message: 'We could not verify your submission. See the reviewer note before resubmitting.',
        nextStep: '',
        actionLabel: 'Review and resubmit',
      };
    case 'pending':
      return {
        message: 'Your documents are with a RoomLink admin.',
        nextStep: 'Reviews usually finish within two working days. We will notify you.',
        actionLabel: 'View my submission',
      };
    default:
      return {
        message: 'Verify your identity to earn a verified tick and publish listings faster.',
        nextStep: '',
        actionLabel: 'Start verification',
      };
  }
}

export function propertyStatusTone(status: PropertyStatus): BadgeTone {
  switch (status) {
    case 'published':
      return 'success';
    case 'occupied':
      return 'warning';
    case 'draft':
      return 'neutral';
    case 'unpublished':
    default:
      return 'neutral';
  }
}

export const CLEANLINESS_LABELS: Record<number, string> = {
  1: 'Spotless – I clean daily',
  2: 'Very tidy – cleaned regularly',
  3: 'Balanced – tidy most days',
  4: 'Relaxed – tidy when needed',
  5: 'Relaxed – no strict routine',
};

export function cleanlinessLabel(value: number | null | undefined): string {
  if (!value) return 'Not set';
  return CLEANLINESS_LABELS[value] ?? 'Not set';
}

export const SMOKING_OPTIONS: Option<'non_smoker' | 'smoker' | 'no_preference'>[] = [
  { value: 'non_smoker', label: 'Non-smoker only' },
  { value: 'smoker', label: 'Smoker friendly' },
  { value: 'no_preference', label: 'No preference' },
];

export const SLEEP_SCHEDULE_OPTIONS: Option<'early_bird' | 'night_owl' | 'flexible'>[] = [
  { value: 'early_bird', label: 'Early bird' },
  { value: 'night_owl', label: 'Night owl' },
  { value: 'flexible', label: 'Flexible' },
];

export const STUDY_HABIT_OPTIONS: Option<'quiet_study' | 'study_together' | 'no_preference'>[] = [
  { value: 'quiet_study', label: 'Prefer quiet study time' },
  { value: 'study_together', label: 'Happy to study together' },
  { value: 'no_preference', label: 'No preference' },
];

export const PET_OPTIONS: Option<'love_pets' | 'no_pets' | 'no_preference'>[] = [
  { value: 'love_pets', label: 'Pets welcome' },
  { value: 'no_pets', label: 'No pets' },
  { value: 'no_preference', label: 'No preference' },
];

export const GUEST_OPTIONS: Option<'few_guests' | 'no_guests' | 'no_preference'>[] = [
  { value: 'few_guests', label: 'Occasional guests ok' },
  { value: 'no_guests', label: 'No guests' },
  { value: 'no_preference', label: 'No preference' },
];

export const DRINKING_OPTIONS: Option<'non_drinker' | 'social' | 'no_preference'>[] = [
  { value: 'non_drinker', label: 'Non-drinker' },
  { value: 'social', label: 'Social drinker' },
  { value: 'no_preference', label: 'No preference' },
];

export const GENDER_PREFERENCE_OPTIONS: Option<string>[] = [
  { value: 'any', label: 'Open to anyone' },
  { value: 'female_only', label: 'Female tenants only' },
  { value: 'male_only', label: 'Male tenants only' },
];