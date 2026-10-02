import { z } from 'zod';

import { PH_CITIES, PH_BARANGAYS } from '@/constants/locations';

/** Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX. */
const PH_PHONE = /^(?:\+?63|0)9\d{9}$/;

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .email('That does not look like a valid email address.')
  .max(160, 'That email address is too long.')
  .toLowerCase();

/**
 * Password rules are enforced here and by a Supabase Auth policy, so a weak
 * password cannot be set even if this check is bypassed.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Passwords must be 72 characters or fewer.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Enter your full name.')
  .max(80, 'That name is too long.');

export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Enter a contact number.')
  .regex(PH_PHONE, 'Enter a valid Philippine mobile number, e.g. 0917 123 4567.');

export const optionalPhoneSchema = z
  .union([z.string().trim(), z.literal('')])
  .transform((v) => (v === '' ? undefined : v))
  .refine((v) => v === undefined || PH_PHONE.test(v), {
    message: 'Enter a valid Philippine mobile number.',
  })
  .optional();

export const citySchema = z.enum(
  PH_CITIES.map((c) => c.label) as [string, ...string[]],
  { message: 'Choose a city.' },
);

export const barangaySchema = z.string().trim().min(2, 'Enter a barangay.').max(80);

export const passwordMatchSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

/* ------------------------------------------------------------------ */
/* Authentication                                                      */
/* ------------------------------------------------------------------ */

export const roleSchema = z.enum(['student', 'landlord'], {
  message: 'Choose whether you are looking for a room or listing one.',
});

export const signUpSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Type your password again.'),
    role: roleSchema,
    businessName: z.string().trim().max(120).optional(),
    // Typed as `boolean` rather than `z.literal(true)`: the checkbox has to
    // start unchecked, and a literal `true` output type would force every form
    // to cast its own default value. The refine still rejects `false`.
    acceptTerms: z.boolean().refine((accepted) => accepted, {
      message: 'Please accept the terms to continue.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
export type SignUpValues = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/* ------------------------------------------------------------------ */
/* Profile                                                              */
/* ------------------------------------------------------------------ */

export const profileSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  bio: z.string().trim().max(500, 'Keep your bio under 500 characters.').optional(),
  avatarUri: z.string().optional(),
  city: z.string().trim().optional(),
  barangay: z.string().trim().optional(),
  addressLine: z.string().trim().max(200).optional(),
  institutionName: z.string().trim().max(160, 'That name is too long.').optional(),
  institutionKind: z.enum(['school', 'workplace']).optional(),
  institutionLatitude: z.number().min(-90).max(90).optional(),
  institutionLongitude: z.number().min(-180).max(180).optional(),
  emergencyContactName: z.string().trim().max(80).optional(),
  emergencyContactPhone: optionalPhoneSchema,
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const landlordContactSchema = z.object({
  businessName: z.string().trim().min(2, 'Enter the business or owner name.').max(120),
  publicPhone: phoneSchema,
  publicEmail: emailSchema.optional().or(z.literal('')),
  bio: z.string().trim().max(500).optional(),
  isPublic: z.boolean(),
});
export type LandlordContactValues = z.infer<typeof landlordContactSchema>;

/* ------------------------------------------------------------------ */
/* Property                                                             */
/* ------------------------------------------------------------------ */

export const otherFeeSchema = z.object({
  label: z.string().trim().min(1, 'Name this fee.').max(60),
  amount: z.number().min(0, 'Amount cannot be negative.').max(100_000),
  recurring: z.boolean(),
  note: z.string().trim().max(120).optional(),
});

export const propertySchema = z
  .object({
    title: z.string().trim().min(4, 'Give your listing a title.').max(120),
    propertyType: z.enum(['boarding_house', 'apartment', 'studio', 'shared_room'], {
      message: 'Choose a property type.',
    }),
    description: z
      .string()
      .trim()
      .min(20, 'Describe the place in at least 20 characters so renters know what to expect.')
      .max(4000),
    monthlyRent: z.coerce
      .number({ message: 'Enter the monthly rent.' })
      .positive('Rent must be greater than zero.')
      .max(500_000, 'That rent looks unusually high. Check the amount.'),
    advanceAmount: z.coerce
      .number({ message: 'Enter the advance amount, or 0 if none is required.' })
      .min(0, 'The advance cannot be negative.')
      .max(500_000)
      .default(0),
    otherFees: z.array(otherFeeSchema).max(10).default([]),
    city: citySchema,
    barangay: barangaySchema,
    // Optional while drafting; the publish gate (canPublishProperty) and the
    // database constraint both require a landmark or address before publishing.
    addressLine: z.string().trim().max(200, 'Keep the address under 200 characters.').optional(),
    landmark: z.string().trim().max(120, 'Keep the landmark under 120 characters.').optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    nearbySchools: z
      .array(
        z.object({
          name: z.string().trim().min(2).max(160),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        }),
      )
      .max(5)
      .default([]),
    nearbyWorkplaces: z
      .array(
        z.object({
          name: z.string().trim().min(2).max(160),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        }),
      )
      .max(5)
      .default([]),
    totalUnits: z.coerce
      .number({ message: 'How many units does this property have?' })
      .int('Use a whole number of units.')
      .min(1, 'A property needs at least one unit.')
      .max(500),
    occupiedUnits: z.coerce
      .number()
      .int('Use a whole number of units.')
      .min(0, 'Occupied units cannot be negative.')
      .max(500)
      .default(0),
    genderPreference: z.enum(['any', 'female_only', 'male_only']).default('any'),
    availableFrom: z.string().trim().optional(),
    amenityIds: z.array(z.number().int().positive()).max(30).default([]),
    virtualTourUrl: z
      .union([z.string().trim().url('Enter a valid URL, including https://'), z.literal('')])
      .transform((v) => (v === '' ? undefined : v))
      .optional(),
    status: z.enum(['draft', 'published', 'unpublished', 'occupied']).default('draft'),
  })
  .refine(
    (data) => (data.latitude === undefined) === (data.longitude === undefined),
    { message: 'Provide both coordinates or neither.', path: ['latitude'] },
  )
  .refine((data) => data.occupiedUnits <= data.totalUnits, {
    message: 'Occupied units cannot exceed the total number of units.',
    path: ['occupiedUnits'],
  })
  // Publishing without an availability date hides the one fact a renter needs
  // most: when they can move in.
  .refine(
    (data) => data.status !== 'published' || (data.availableFrom ?? '').trim().length > 0,
    { message: 'Set the move-in availability date before publishing.', path: ['availableFrom'] },
  );

export type PropertyFormValues = z.infer<typeof propertySchema>;

/** Raw form shape before `z.coerce` turns the rent/unit text boxes into numbers. */
export type PropertyFormInput = z.input<typeof propertySchema>;

/** Cross-field rule the database also enforces on publish. */
export function canPublishProperty(values: {
  description: string;
  landmark?: string | undefined;
  addressLine?: string | undefined;
  totalUnits: number;
  occupiedUnits: number;
  amenityIds: number[];
}): { ok: boolean; reason?: string } {
  if (values.description.trim().length < 20) {
    return { ok: false, reason: 'Add a description of at least 20 characters before publishing.' };
  }
  if (!values.landmark?.trim() && !values.addressLine?.trim()) {
    return { ok: false, reason: 'Add a landmark or street address before publishing.' };
  }
  if (values.totalUnits <= values.occupiedUnits) {
    return { ok: false, reason: 'All units are occupied. Mark the listing as occupied instead of publishing.' };
  }
  if (values.amenityIds.length === 0) {
    return { ok: false, reason: 'Select at least one amenity so renters can compare listings.' };
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Booking                                                              */
/* ------------------------------------------------------------------ */

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

export const visitBookingSchema = z.object({
  scheduledDate: z
    .string()
    .trim()
    .min(1, 'Choose a date for your visit.')
    .refine((value) => value >= TODAY_ISO(), {
      message: 'Choose today or a future date.',
    }),
  scheduledTime: z.string().trim().min(1, 'Choose a time slot.'),
  contactName: fullNameSchema,
  contactPhone: phoneSchema,
  contactEmail: emailSchema.optional().or(z.literal('')),
  note: z
    .string()
    .trim()
    .max(1000, 'Keep your note under 1000 characters.')
    .optional(),
});
export type VisitBookingValues = z.infer<typeof visitBookingSchema>;

export const applicationSchema = z.object({
  moveInDate: z
    .string()
    .trim()
    .min(1, 'Tell the landlord when you plan to move in.')
    .refine((value) => value >= TODAY_ISO(), {
      message: 'Choose today or a future move-in date.',
    }),
  occupants: z.coerce
    .number({ message: 'How many people will live in the unit?' })
    .int('Use a whole number.')
    .min(1, 'At least one occupant.')
    .max(20, 'For groups larger than 20, contact the landlord directly.'),
  contactName: fullNameSchema,
  contactPhone: phoneSchema,
  contactEmail: emailSchema.optional().or(z.literal('')),
  note: z
    .string()
    .trim()
    .max(1000, 'Keep your note under 1000 characters.')
    .optional(),
});
export type ApplicationValues = z.infer<typeof applicationSchema>;

/**
 * The one form behind both request kinds.
 *
 * A discriminated union was tempting but makes the React Hook Form field paths
 * awkward, so this is one object schema whose visit-only and application-only
 * rules are applied in a `superRefine`. The form always renders every field and
 * simply ignores the ones the current kind does not use.
 */
export const bookingRequestSchema = z
  .object({
    kind: z.enum(['visit', 'application']),
    scheduledDate: z.string().trim(),
    scheduledTime: z.string().trim(),
    moveInDate: z.string().trim(),
    occupants: z.coerce.number().int().min(1).max(20),
    contactName: fullNameSchema,
    contactPhone: phoneSchema,
    contactEmail: z.union([emailSchema, z.literal('')]).optional(),
    note: z.string().trim().max(1000, 'Keep your note under 1000 characters.').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'visit') {
      if (data.scheduledDate.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Choose a date for your visit.',
          path: ['scheduledDate'],
        });
      } else if (data.scheduledDate < TODAY_ISO()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Choose today or a future date.',
          path: ['scheduledDate'],
        });
      }

      if (data.scheduledTime.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Choose a time slot.',
          path: ['scheduledTime'],
        });
      }
      return;
    }

    if (data.moveInDate.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Tell the landlord when you plan to move in.',
        path: ['moveInDate'],
      });
    } else if (data.moveInDate < TODAY_ISO()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Choose today or a future move-in date.',
        path: ['moveInDate'],
      });
    }

    if (!Number.isFinite(data.occupants) || data.occupants < 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one occupant.',
        path: ['occupants'],
      });
    } else if (data.occupants > 20) {
      ctx.addIssue({
        code: 'custom',
        message: 'For groups larger than 20, contact the landlord directly.',
        path: ['occupants'],
      });
    }
  });

export type BookingRequestValues = z.infer<typeof bookingRequestSchema>;

/** Raw form shape before `z.coerce` turns the occupants text box into a number. */
export type BookingRequestInput = z.input<typeof bookingRequestSchema>;

/** Time slots offered for visits. Stored as Postgres `time` (HH:MM:SS). */
export const VISIT_TIME_SLOTS: { value: string; label: string }[] = [
  { value: '09:00:00', label: '9:00 AM' },
  { value: '10:00:00', label: '10:00 AM' },
  { value: '11:00:00', label: '11:00 AM' },
  { value: '13:00:00', label: '1:00 PM' },
  { value: '14:00:00', label: '2:00 PM' },
  { value: '15:00:00', label: '3:00 PM' },
  { value: '16:00:00', label: '4:00 PM' },
  { value: '17:00:00', label: '5:00 PM' },
];

export function timeSlotLabel(value: string): string {
  return VISIT_TIME_SLOTS.find((s) => s.value.startsWith(value.slice(0, 5)))?.label ?? value;
}

/* ------------------------------------------------------------------ */
/* Roommate                                                             */
/* ------------------------------------------------------------------ */

export const roommateProfileSchema = z.object({
  headline: z.string().trim().min(4, 'Add a short headline.').max(120),
  about: z.string().trim().max(800, 'Keep this under 800 characters.').optional(),
  occupation: z.string().trim().max(120).optional(),
  budgetMin: z.coerce.number().min(0, 'Budget cannot be negative.').max(200_000).default(0),
  budgetMax: z.coerce.number().min(0).max(200_000).default(0),
  preferredCity: z.string().trim().optional(),
  preferredBarangay: z.string().trim().optional(),
  moveInDate: z.string().trim().optional(),
  cleanliness: z.coerce
    .number()
    .int()
    .min(1, 'Pick a tidiness level.')
    .max(5),
  smokingPreference: z.enum(['non_smoker', 'smoker', 'no_preference']).default('no_preference'),
  drinkingPreference: z.enum(['non_drinker', 'social', 'no_preference']).default('no_preference'),
  petsPreference: z.enum(['love_pets', 'no_pets', 'no_preference']).default('no_preference'),
  guestsPreference: z.enum(['few_guests', 'no_guests', 'no_preference']).default('no_preference'),
  studyHabits: z.enum(['quiet_study', 'study_together', 'no_preference']).default('no_preference'),
  sleepSchedule: z.enum(['early_bird', 'night_owl', 'flexible']).default('flexible'),
  isActive: z.boolean().default(true),
  discoverable: z.boolean().default(true),
  shareBudget: z.boolean().default(true),
  shareLocation: z.boolean().default(true),
  shareMoveInDate: z.boolean().default(true),
  shareLifestyle: z.boolean().default(true),
  shareOccupation: z.boolean().default(false),
}).refine((data) => data.budgetMax === 0 || data.budgetMax >= data.budgetMin, {
  message: 'Maximum budget must be at least the minimum budget.',
  path: ['budgetMax'],
});

export type RoommateProfileValues = z.infer<typeof roommateProfileSchema>;

/** Raw form shape before `z.coerce` turns the budget/tidiness text boxes into numbers. */
export type RoommateProfileInput = z.input<typeof roommateProfileSchema>;

export const roommateRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .max(600, 'Keep your message under 600 characters.')
    .optional(),
});
export type RoommateRequestValues = z.infer<typeof roommateRequestSchema>;

/* ------------------------------------------------------------------ */
/* Verification                                                         */
/* ------------------------------------------------------------------ */

export const verificationSchema = z.object({
  fullLegalName: fullNameSchema,
  address: z.string().trim().min(4, 'Enter your complete address.').max(300),
  idType: z.enum(['philippine_id', 'passport', 'drivers_license', 'other'], {
    message: 'Choose the type of ID you are submitting.',
  }),
  idNumberLast4: z
    .string()
    .trim()
    .min(2, 'Enter the last 2 to 4 characters only.')
    .max(4, 'Enter the last 2 to 4 characters only.')
    .regex(/^[A-Za-z0-9]{2,4}$/, 'Letters and numbers only.'),
  submittedNotes: z.string().trim().max(1000, 'Keep notes under 1000 characters.').optional(),
  // Same reasoning as `acceptTerms` above: `boolean` keeps the form default
  // cast-free, the refine keeps the guarantee.
  acceptedAccuracy: z.boolean().refine((accepted) => accepted, {
    message: 'Please confirm the details are accurate before submitting.',
  }),
});
export type VerificationValues = z.infer<typeof verificationSchema>;

/* ------------------------------------------------------------------ */
/* Search / filters                                                     */
/* ------------------------------------------------------------------ */

export const propertyFilterSchema = z.object({
  search: z.string().trim().max(120),
  city: z.string().trim().optional(),
  barangay: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).max(500_000).optional(),
  maxPrice: z.coerce.number().min(0).max(500_000).optional(),
  propertyTypes: z.array(z.enum(['boarding_house', 'apartment', 'studio', 'shared_room'])).default([]),
  amenityIds: z.array(z.number().int().positive()).default([]),
  availableOnly: z.boolean().default(true),
  maxDistanceKm: z.coerce.number().min(0.5).max(50).optional(),
  nearLatitude: z.number().min(-90).max(90).optional(),
  nearLongitude: z.number().min(-180).max(180).optional(),
  nearName: z.string().trim().max(160).optional(),
  sort: z.enum(['recent', 'price_asc', 'price_desc', 'distance']).default('recent'),
});

export type PropertyFilterValues = z.infer<typeof propertyFilterSchema>;

export const DEFAULT_PROPERTY_FILTERS: PropertyFilterValues = {
  search: '',
  city: undefined,
  barangay: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  propertyTypes: [],
  amenityIds: [],
  availableOnly: true,
  maxDistanceKm: undefined,
  nearLatitude: undefined,
  nearLongitude: undefined,
  nearName: undefined,
  sort: 'recent',
};

/** Number of filters the user has actively set. Drives the badge on the button. */
export function countActiveFilters(filters: PropertyFilterValues): number {
  let count = 0;
  if (filters.city) count += 1;
  if (filters.barangay) count += 1;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
  count += filters.propertyTypes.length;
  count += filters.amenityIds.length;
  if (!filters.availableOnly) count += 1;
  if (filters.maxDistanceKm !== undefined) count += 1;
  return count;
}

export function validateBarangayForCity(city: string, barangay: string): string | null {
  const known = PH_BARANGAYS[city];
  if (!known) return null;
  const match = known.find((b) => b.toLowerCase() === barangay.trim().toLowerCase());
  return match ?? null;
}