/**
 * The signed-in user's profile.
 *
 * Reads and writes the `Profile` in AsyncStorage, merging over the demo fixture
 * so a profile saved by an older build still satisfies the current shape.
 * Nothing is validated here — `src/utils/validation` owns the rules so the
 * forms and this layer cannot disagree about what is valid.
 */

import { fail, ok, type Result } from '@/lib/errors';
import { DEMO_PROFILE } from '@/lib/mock-data';
import { getProfile, setProfile } from '@/lib/storage';
import type { Profile } from '@/lib/types';

export async function getMyProfile(): Promise<Result<Profile>> {
  return getProfile(DEMO_PROFILE);
}

/**
 * Saves a partial edit.
 *
 * Merging rather than replacing means a form that only submits the fields it
 * renders cannot silently blank the rest of the profile.
 */
export async function updateMyProfile(updates: Partial<Profile>): Promise<Result<Profile>> {
  const current = await getMyProfile();
  if (!current.ok) return fail(current.error.message, current.error.code);

  const next: Profile = {
    ...current.data,
    ...updates,
    lifestyle: { ...current.data.lifestyle, ...(updates.lifestyle ?? {}) },
    interests: updates.interests ?? current.data.interests,
  };

  const written = await setProfile(next);
  if (!written.ok) return fail(written.error.message, written.error.code);

  return ok(next);
}