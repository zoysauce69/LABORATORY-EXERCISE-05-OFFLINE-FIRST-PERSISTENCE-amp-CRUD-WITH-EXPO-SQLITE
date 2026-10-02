import type { Session } from '@supabase/supabase-js';

import { DEMO_MODE } from '@/lib/config';
import { AppError, ok, runQuery, type Result } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type {
  ProfileInsert,
  ProfilePrivateDetailsRow,
  ProfileRow,
  UserRole,
} from '@/lib/database.types';

export interface PublicLandlord {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  business_name: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  public_phone: string | null;
  public_email: string | null;
}

export interface Me {
  profile: ProfileRow;
  privateDetails: ProfilePrivateDetailsRow | null;
}

const DEMO_ERROR = new AppError('Demo mode: changes are not saved.', 'demo');

export const profileService = {
  async getMyProfile(userId: string): Promise<Result<Me>> {
    if (DEMO_MODE) return { ok: false, error: new AppError('Demo mode.', 'demo') };

    const profileResult = await runQuery('Load profile', () =>
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    );
    if (!profileResult.ok) return profileResult;
    if (!profileResult.data) {
      return { ok: false, error: new AppError('Your profile is still being created. Please try again in a moment.', 'profile_missing') };
    }

    const details = await supabase.from('profile_private_details').select('*').eq('user_id', userId).maybeSingle();
    if (details.error) {
      return { ok: false, error: new AppError('Your profile loaded but your private contact details could not be read.', details.error.code ?? 'private_details_error', { details: details.error }) };
    }

    return ok({ profile: profileResult.data, privateDetails: details.data });
  },

  async getPublicLandlord(landlordId: string): Promise<Result<PublicLandlord | null>> {
    if (DEMO_MODE) return ok(null);
    const result = await runQuery('Load landlord', () =>
      supabase.from('profiles').select('id, full_name, avatar_url, bio, business_name, verification_status, verified_at, public_phone, public_email').eq('id', landlordId).maybeSingle(),
    );
    if (!result.ok) return result;
    return ok(result.data);
  },

  async updatePublicProfile(
    userId: string,
    values: Partial<Omit<ProfileInsert, 'id' | 'role' | 'verification_status' | 'verified_at'>>,
  ): Promise<Result<ProfileRow>> {
    if (DEMO_MODE) return { ok: false, error: DEMO_ERROR };
    return runQuery('Update profile', () =>
      supabase.from('profiles').update(values).eq('id', userId).select('*').single(),
    );
  },

  async updatePrivateDetails(
    userId: string,
    values: Partial<Omit<ProfilePrivateDetailsRow, 'user_id' | 'created_at' | 'updated_at'>>,
  ): Promise<Result<ProfilePrivateDetailsRow>> {
    if (DEMO_MODE) return { ok: false, error: DEMO_ERROR };
    return runQuery('Update contact details', () =>
      supabase.from('profile_private_details').update(values).eq('user_id', userId).select('*').single(),
    );
  },

  async updateNotificationPreferences(
    userId: string,
    prefs: { notify_booking_updates?: boolean; notify_roommate_requests?: boolean; notify_listing_updates?: boolean },
  ): Promise<Result<ProfileRow>> {
    if (DEMO_MODE) return { ok: false, error: DEMO_ERROR };
    return runQuery('Update notification preferences', () =>
      supabase.from('profiles').update(prefs).eq('id', userId).select('*').single(),
    );
  },

  async getRole(userId: string): Promise<Result<UserRole>> {
    if (DEMO_MODE) return ok('student');
    const result = await runQuery('Load role', () =>
      supabase.from('profiles').select('role').eq('id', userId).single(),
    );
    if (!result.ok) return result;
    return ok(result.data.role);
  },

  async syncEmail(userId: string, email: string): Promise<Result<true>> {
    if (DEMO_MODE) return ok(true);
    const result = await runQuery('Sync email', () =>
      supabase.from('profile_private_details').update({ email }).eq('user_id', userId).select('user_id').single(),
    );
    if (!result.ok) return result;
    return ok(true);
  },

  async getSessionUser(): Promise<Session | null> {
    if (DEMO_MODE) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
};
