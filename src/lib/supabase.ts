import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { config, isSupabaseConfigured, DEMO_MODE } from './config';
import type { Database } from './database.types';

/**
 * Single Supabase client for the app.
 *
 * Only the anon key is used. Every access rule is enforced by Row Level
 * Security policies in supabase/migrations, not by this file.
 *
 * When credentials are missing we still create a client pointing at a
 * syntactically valid placeholder so that module imports never throw. Calls
 * will fail and callers surface a setup message via `isSupabaseConfigured`.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  config.supabaseUrl || 'https://placeholder.supabase.co',
  config.supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      // In demo mode skip AsyncStorage entirely — no session to persist.
      // On web SSR (Node) window is undefined and AsyncStorage crashes.
      // On native without a dev build the native module may be null.
      storage: DEMO_MODE || typeof window === 'undefined' ? undefined : AsyncStorage,
      persistSession: !DEMO_MODE && typeof window !== 'undefined',
      autoRefreshToken: !DEMO_MODE && typeof window !== 'undefined',
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-application-name': 'roomlink' },
    },
  },
);

/** Named export mirroring the database bucket names created by the migrations. */
export const storageBuckets = {
  propertyImages: 'property-images',
  verificationDocuments: 'verification-documents',
  avatars: 'avatars',
} as const;

export { isSupabaseConfigured };