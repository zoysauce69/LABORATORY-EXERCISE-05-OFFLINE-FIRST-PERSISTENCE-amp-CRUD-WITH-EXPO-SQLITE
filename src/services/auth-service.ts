import type { AuthError, Session, User } from '@supabase/supabase-js';

import { AppError, describeSupabaseError, ok, runQuery, type Result } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'student' | 'landlord';
  businessName?: string | undefined;
}

export interface SignInInput {
  email: string;
  password: string;
}

/** Maps Supabase auth messages onto something a person can act on. */
function authMessage(error: AuthError | null, fallback: string): AppError {
  if (!error) return new AppError(fallback, 'auth_error');

  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return new AppError('That email and password combination is not correct.', error.code ?? 'auth_error');
  }
  if (message.includes('email not confirmed')) {
    return new AppError('Confirm your email address before signing in.', error.code ?? 'auth_error');
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return new AppError('An account already uses that email. Try signing in instead.', error.code ?? 'auth_error');
  }
  if (message.includes('password should be')) {
    return new AppError(
      'Password must be at least 8 characters and include a letter and a number.',
      error.code ?? 'weak_password',
    );
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return new AppError('Too many attempts. Wait a moment and try again.', error.code ?? 'rate_limited');
  }
  if (message.includes('unable to validate email')) {
    return new AppError('That email address could not be validated.', error.code ?? 'auth_error');
  }

  return describeSupabaseError(error, fallback);
}

export const authService = {
  /**
   * Registers the user. The role is written to signup metadata and read once by
   * the `handle_new_user` trigger; it cannot be changed afterwards.
   */
  async signUp(input: SignUpInput): Promise<Result<User>> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          role: input.role,
          full_name: input.fullName,
          phone: input.phone,
          ...(input.businessName ? { business_name: input.businessName } : {}),
        },
      },
    });

    if (error) return { ok: false, error: authMessage(error, 'Could not create your account.') };
    if (!data.user) {
      return { ok: false, error: new AppError('Could not create your account.', 'auth_error') };
    }

    // Mirror the contact fields into the private details table.
    const details = await supabase
      .from('profile_private_details')
      .upsert({ user_id: data.user.id, phone: input.phone, email: input.email })
      .select('user_id')
      .maybeSingle();

    if (details.error) {
      // The account exists; surface the partial state honestly.
      return {
        ok: false,
        error: new AppError(
          'Your account was created but your contact number could not be saved. Open Profile to fix it.',
          details.error.code ?? 'partial_failure',
          { details: details.error },
        ),
      };
    }

    return ok(data.user);
  },

  async signIn(input: SignInInput): Promise<Result<Session>> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) return { ok: false, error: authMessage(error, 'Could not sign you in.') };
    if (!data.session) {
      return { ok: false, error: new AppError('Could not sign you in.', 'auth_error') };
    }
    return ok(data.session);
  },

  /**
   * Sends a reset email. Always resolves successfully so the response does not
   * reveal whether an address is registered.
   */
  async requestPasswordReset(email: string, redirectTo: string): Promise<Result<true>> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return { ok: false, error: authMessage(error, 'Could not send the reset email.') };
    }
    return ok(true);
  },

  /** Completes a recovery flow. The user already has a session from the link. */
  async updatePassword(password: string): Promise<Result<true>> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { ok: false, error: authMessage(error, 'Could not update your password.') };
    }
    return ok(true);
  },

  async signOut(): Promise<Result<true>> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { ok: false, error: authMessage(error, 'Could not sign you out.') };
    }
    return ok(true);
  },

  /**
   * Permanent deletion. The RPC removes storage objects and the auth user,
   * which cascades through every profile-owned table.
   */
  async deleteAccount(): Promise<Result<true>> {
    const result = await runQuery('Account deletion', () =>
      supabase.rpc('delete_my_account'),
    );
    if (!result.ok) return result;
    return ok(true);
  },

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  },

  onAuthStateChange(
    handler: (session: Session | null) => void,
  ): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      handler(session);
    });
    return () => data.subscription.unsubscribe();
  },
};