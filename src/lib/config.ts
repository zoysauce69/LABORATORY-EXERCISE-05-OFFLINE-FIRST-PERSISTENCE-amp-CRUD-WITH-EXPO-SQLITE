/**
 * Runtime configuration.
 *
 * Reads only EXPO_PUBLIC_* variables, which are inlined into the client bundle
 * by the Expo CLI. Nothing here may read a secret: the Supabase service_role key
 * must never reach the client.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export type DistanceMode = 'straightline' | 'routes';

function parseDistanceMode(value: string | undefined): DistanceMode {
  return value === 'routes' ? 'routes' : 'straightline';
}

export const config = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  distanceMode: parseDistanceMode(process.env.EXPO_PUBLIC_DISTANCE_MODE),
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '',
} as const;

/**
 * True when the required Supabase credentials are present.
 *
 * Screens check this so the user gets an actionable setup message instead of a
 * cryptic "Invalid API key" error from the network layer.
 */
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0 && SUPABASE_URL.startsWith('https://');

/**
 * When true the app skips Supabase entirely and uses hard-coded demo data.
 * Flip to false (or remove) before connecting a real project.
 */
export const DEMO_MODE = true;

/** Routes mode requires an API key; fall back to straight line if it is absent. */
export const effectiveDistanceMode: DistanceMode =
  config.distanceMode === 'routes' && config.googleMapsApiKey.length > 0
    ? 'routes'
    : 'straightline';

export const setupMessage =
  'RoomLink is not connected to a database yet. Copy .env.example to .env.local, ' +
  'fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server.';