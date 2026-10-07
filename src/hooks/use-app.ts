import { useContext } from 'react';

import { AppContext, type AppContextValue } from '@/providers/app-provider';

/** The whole store: session, profile and every persisted collection. */
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside <AppProvider>.');
  }
  return context;
}

/**
 * The signed-in user's id.
 *
 * Throws when called while signed out, so use it inside protected layouts.
 */
export function useUserId(): string {
  const { profile } = useApp();
  return profile.id;
}