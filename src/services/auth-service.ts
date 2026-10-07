/**
 * Simulated authentication.
 *
 * There is no auth provider. Accounts are a local list in AsyncStorage, the
 * session is a stored record, and route protection is a check in
 * `app/(app)/_layout.tsx`. This is what makes every feature reachable without
 * real credentials while still exercising the sign-in / sign-out flow.
 *
 * SECURITY: `passwordHash` is obfuscation, not hashing. See `LocalAccount`.
 */

import { fail, ok, type Result } from '@/lib/errors';
import { DEMO_CREDENTIALS, DEMO_PROFILE } from '@/lib/mock-data';
import {
  clearSession,
  getAccounts,
  getSession,
  obfuscatePassword,
  setAccounts,
  setSession,
  type LocalAccount,
  type StoredSession,
} from '@/lib/storage';
import type { Profile } from '@/lib/types';

/** The demo account exists from first launch so sign-in always works. */
const DEMO_ACCOUNT: LocalAccount = {
  email: DEMO_CREDENTIALS.email,
  fullName: DEMO_PROFILE.fullName,
  passwordHash: obfuscatePassword(DEMO_CREDENTIALS.password),
  createdAt: new Date().toISOString(),
};

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The signed-in session, or null when signed out. */
export async function getCurrentSession(): Promise<Result<StoredSession | null>> {
  return getSession();
}

export async function signIn(email: string, password: string): Promise<Result<StoredSession>> {
  const normalised = normaliseEmail(email);
  if (normalised.length === 0) return fail('Enter your email address.', 'invalid_input');
  if (password.length === 0) return fail('Enter your password.', 'invalid_input');

  const accounts = await getAccounts([DEMO_ACCOUNT]);
  if (!accounts.ok) return fail(accounts.error.message, accounts.error.code);

  const account = accounts.data.find((a) => a.email === normalised);
  // One message for both "no such account" and "wrong password" so the form
  // cannot be used to enumerate which emails are registered.
  if (!account || account.passwordHash !== obfuscatePassword(password)) {
    return fail('That email and password do not match an account.', 'invalid_credentials');
  }

  const session: StoredSession = {
    userId: DEMO_PROFILE.id,
    email: account.email,
    signedInAt: new Date().toISOString(),
  };

  const written = await setSession(session);
  if (!written.ok) return fail(written.error.message, written.error.code);

  return ok(session);
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
}

export async function signUp(input: SignUpInput): Promise<Result<StoredSession>> {
  const fullName = input.fullName.trim();
  const normalised = normaliseEmail(input.email);

  if (fullName.length < 2) return fail('Enter your full name.', 'invalid_input');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised)) {
    return fail('Enter a valid email address.', 'invalid_input');
  }
  if (input.password.length < 8) {
    return fail('Use a password of at least 8 characters.', 'invalid_input');
  }

  const accounts = await getAccounts([DEMO_ACCOUNT]);
  if (!accounts.ok) return fail(accounts.error.message, accounts.error.code);

  if (accounts.data.some((a) => a.email === normalised)) {
    return fail('An account already exists for that email. Try signing in.', 'duplicate');
  }

  const account: LocalAccount = {
    email: normalised,
    fullName,
    passwordHash: obfuscatePassword(input.password),
    createdAt: new Date().toISOString(),
  };

  const writtenAccounts = await setAccounts([...accounts.data, account]);
  if (!writtenAccounts.ok) return fail(writtenAccounts.error.message, writtenAccounts.error.code);

  const session: StoredSession = {
    userId: DEMO_PROFILE.id,
    email: normalised,
    signedInAt: new Date().toISOString(),
  };

  const writtenSession = await setSession(session);
  if (!writtenSession.ok) return fail(writtenSession.error.message, writtenSession.error.code);

  return ok(session);
}

/**
 * Signs out.
 *
 * Only clears the session. Saved rooms, applications, messages, notifications
 * and the profile all survive, so signing back in restores the demo account's
 * state instead of resetting the demo every time.
 */
export async function signOut(): Promise<Result<true>> {
  const result = await clearSession();
  if (!result.ok) return fail(result.error.message, result.error.code);
  return ok(true);
}

/* ------------------------------------------------------------------ */
/* Password reset (simulated)                                          */
/* ------------------------------------------------------------------ */

export interface ResetTicket {
  email: string;
  code: string;
  issuedAt: string;
}

/**
 * Pretends to send a reset code.
 *
 * Returns the code so the demo can show it in the UI instead of pretending an
 * inbox exists. The check is always "is this an email we know about", which is
 * the same answer a real service would give without leaking account existence
 * to a third party.
 */
export async function requestPasswordReset(email: string): Promise<Result<ResetTicket>> {
  const normalised = normaliseEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised)) {
    return fail('Enter a valid email address.', 'invalid_input');
  }

  const accounts = await getAccounts([DEMO_ACCOUNT]);
  if (!accounts.ok) return fail(accounts.error.message, accounts.error.code);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  return ok({ email: normalised, code, issuedAt: new Date().toISOString() });
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<Result<true>> {
  const normalised = normaliseEmail(email);
  if (code.trim().length !== 6) return fail('Enter the 6-digit code.', 'invalid_input');
  if (newPassword.length < 8) {
    return fail('Use a password of at least 8 characters.', 'invalid_input');
  }

  const accounts = await getAccounts([DEMO_ACCOUNT]);
  if (!accounts.ok) return fail(accounts.error.message, accounts.error.code);

  const index = accounts.data.findIndex((a) => a.email === normalised);
  const account = index >= 0 ? accounts.data[index] : undefined;
  if (!account) return fail('That email and password do not match an account.', 'invalid_credentials');

  const next = [...accounts.data];
  next[index] = { ...account, passwordHash: obfuscatePassword(newPassword) };

  const written = await setAccounts(next);
  if (!written.ok) return fail(written.error.message, written.error.code);

  return ok(true);
}

/* ------------------------------------------------------------------ */
/* Profile passthrough                                                 */
/* ------------------------------------------------------------------ */

/**
 * The profile that belongs to the signed-in session.
 *
 * There is one profile in this demo — the fixtures always describe the same
 * person — so this just reads it. Re-exported from the auth service so the
 * screens have one place to ask "who am I".
 */
export async function getSignedInProfile(): Promise<Result<Profile>> {
  const { getMyProfile } = await import('./profile-service');
  return getMyProfile();
}

export { DEMO_CREDENTIALS };