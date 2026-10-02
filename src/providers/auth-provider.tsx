import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, setupMessage, DEMO_MODE } from '@/lib/config';
import { toMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { ProfileRow, UserRole } from '@/lib/database.types';
import { profileService } from '@/services/profile-service';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  role: UserRole | null;
  isLoading: boolean;
  profileError: string | null;
  configured: boolean;
  isStudent: boolean;
  isLandlord: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Demo mode only — pick a role without a real account. */
  setDemoRole?: (role: UserRole | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function makeDemoProfile(role: UserRole): ProfileRow {
  return {
    id: `demo-${role}`,
    role,
    full_name: role === 'landlord' ? 'Demo Landlord' : 'Carl Louise',
    avatar_url: null,
    bio: null,
    is_public: false,
    public_phone: null,
    public_email: null,
    business_name: role === 'landlord' ? 'Demo Properties' : null,
    verification_status: 'verified',
    verified_at: new Date().toISOString(),
    notify_booking_updates: true,
    notify_roommate_requests: true,
    notify_listing_updates: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Demo provider (no Supabase calls at all) ─────────────────────────────────
function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [demoRole, setDemoRole] = useState<UserRole | null>(null);

  const demoProfile = demoRole ? makeDemoProfile(demoRole) : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      session: null,
      user: demoRole ? ({ id: `demo-${demoRole}` } as User) : null,
      profile: demoProfile,
      role: demoRole,
      isLoading: false,
      profileError: null,
      configured: true,
      isStudent: demoRole === 'student',
      isLandlord: demoRole === 'landlord',
      refreshProfile: async () => {},
      signOut: async () => setDemoRole(null),
      setDemoRole,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demoRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Real provider (Supabase) ─────────────────────────────────────────────────
function RealAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const mounted = useRef(true);

  const loadProfile = useCallback(async (userId: string) => {
    const result = await profileService.getMyProfile(userId);
    if (!mounted.current) return;
    if (result.ok) {
      setProfile(result.data.profile);
      setProfileError(null);
    } else {
      setProfile(null);
      setProfileError(toMessage(result.error, 'Your profile could not be loaded.'));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!isSupabaseConfigured) {
      setRestored(true);
      return () => { mounted.current = false; };
    }
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted.current) return;
      setSession(data.session ?? null);
      setRestored(true);
    })();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!restored) return;
    const userId = session?.user?.id;
    if (!userId) { setProfile(null); setProfileError(null); return; }
    void loadProfile(userId);
  }, [session?.user?.id, restored, loadProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted.current) return;
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id;
    if (userId) await loadProfile(userId);
  }, [session?.user?.id, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      isLoading: !restored,
      profileError,
      configured: isSupabaseConfigured,
      isStudent: profile?.role === 'student',
      isLandlord: profile?.role === 'landlord',
      refreshProfile,
      signOut,
    }),
    [session, profile, restored, profileError, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Public export: picks the right provider at module load time ──────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  if (DEMO_MODE) return <DemoAuthProvider>{children}</DemoAuthProvider>;
  return <RealAuthProvider>{children}</RealAuthProvider>;
}

export const CONFIG_ERROR_MESSAGE = setupMessage;
