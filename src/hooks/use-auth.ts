import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return context;
}

/** Throws if the user is not signed in. Use inside protected layouts. */
export function useUserId(): string {
  const { user } = useAuth();
  if (!user) {
    throw new Error('useUserId called while signed out.');
  }
  return user.id;
}