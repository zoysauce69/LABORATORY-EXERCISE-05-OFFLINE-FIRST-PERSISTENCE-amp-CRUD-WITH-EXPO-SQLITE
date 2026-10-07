/**
 * Form schemas.
 *
 * One source of truth for what a valid sign-in, sign-up, profile edit,
 * application or contact message looks like. The forms use these through
 * react-hook-form's `zodResolver`, so a field can never be marked invalid by
 * one screen and valid by another.
 */

import { z } from 'zod';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/;

/** Accepts a phone number with or without a leading +63 or 0. */
const phoneField = z
  .string()
  .trim()
  .min(1, 'Enter a contact number.')
  .regex(PHONE_PATTERN, 'Enter a valid contact number.');

const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .regex(EMAIL_PATTERN, 'Enter a valid email address.');

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.'),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(80, 'That name is too long.'),
  email: emailField,
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(72, 'That password is too long.'),
  confirmPassword: z.string().min(1, 'Confirm your password.'),
  /**
   * A boolean that must end up true, rather than `z.literal(true)`.
   *
   * A literal type would force the form's `defaultValues` to already be `true`,
   * which is exactly backwards: the box starts unchecked. The refinement still
   * rejects `false` with the same message.
   */
  acceptedTerms: z.boolean().refine((accepted) => accepted, {
    message: 'You must accept the terms to continue.',
  }),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit code from your inbox.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Those passwords do not match.',
    path: ['confirmPassword'],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/* ------------------------------------------------------------------ */
/* Booking & roommate requests                                         */
/* ------------------------------------------------------------------ */

export const applicationSchema = z.object({
  moveInDate: z.string().min(1, 'Choose a move-in date.'),
  occupants: z
    .number({ message: 'Enter how many people will move in.' })
    .int('Enter a whole number of people.')
    .min(1, 'At least one person.')
    .max(6, 'That is more people than this room allows.'),
  contactName: z.string().trim().min(2, 'Enter your full name.'),
  contactPhone: phoneField,
  contactEmail: emailField,
  note: z.string().trim().max(500, 'Keep your note under 500 characters.'),
});
export type ApplicationValues = z.infer<typeof applicationSchema>;

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

const budgetField = z
  .number({ message: 'Enter an amount in pesos.' })
  .int('Enter a whole peso amount.')
  .min(1000, 'The minimum realistic budget is ₱1,000.')
  .max(100000, 'Enter an amount below ₱100,000.');

export const profileSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name.').max(80, 'That name is too long.'),
    email: emailField,
    phone: phoneField,
    occupation: z.string().trim().min(2, 'Tell us what you do.').max(80, 'Keep this short.'),
    headline: z.string().trim().max(120, 'Keep your headline under 120 characters.'),
    bio: z.string().trim().max(600, 'Keep your bio under 600 characters.'),
    budgetMin: budgetField,
    budgetMax: budgetField,
    preferredCity: z.string().trim().min(1, 'Choose a preferred city.'),
    moveInDate: z.string().min(1, 'Choose a move-in date.'),
  })
  .refine((values) => values.budgetMax >= values.budgetMin, {
    message: 'Your maximum budget must be at least your minimum.',
    path: ['budgetMax'],
  });
export type ProfileValues = z.infer<typeof profileSchema>;

/* ------------------------------------------------------------------ */
/* Contact (help & support)                                            */
/* ------------------------------------------------------------------ */

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.'),
  email: emailField,
  topic: z.string().trim().min(1, 'Choose a topic.'),
  message: z
    .string()
    .trim()
    .min(20, 'Give us at least a couple of sentences so we can help.')
    .max(1000, 'Keep your message under 1000 characters.'),
});
export type ContactValues = z.infer<typeof contactSchema>;

/* ------------------------------------------------------------------ */
/* Messaging                                                           */
/* ------------------------------------------------------------------ */

export const MESSAGE_MAX_LENGTH = 1000;

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Type a message before sending.')
    .max(MESSAGE_MAX_LENGTH, `Keep messages under ${MESSAGE_MAX_LENGTH} characters.`),
});
export type MessageValues = z.infer<typeof messageSchema>;

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Flattens a zod error into `{ field: message }` for inline rendering.
 *
 * Returns only the first message per field so a control shows one clear
 * instruction rather than a stack of them.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (key.length > 0 && !(key in result)) {
      result[key] = issue.message;
    }
  }
  return result;
}