/**
 * The single store for everything the signed-in user owns.
 *
 * RoomLink has no server and no shared cache, so one provider owns the
 * persisted collections — saved ids, applications, roommate requests,
 * conversations, messages, notifications — and the session. Screens read from
 * here instead of each hitting AsyncStorage, which is what keeps a toggle in
 * the saved tab and the heart icon on a room card showing the same state.
 *
 * Every mutation writes through to storage first and only then updates state,
 * so a failed write leaves the UI showing the truth rather than an optimistic
 * value that was never stored.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ok, fail, type Result } from '@/lib/errors';
import { DEMO_PROFILE } from '@/lib/mock-data';
import {
  getApplications,
  getConversations,
  getMessages,
  getNotifications,
  getProfile,
  getSavedRoommateIds,
  getSavedRoomIds,
  getRoommateRequests,
  getCustomRooms,
  setCustomRooms,
  getSession,
  markSeeded,
  resetAllData,
  type StoredSession,
} from '@/lib/storage';
import type {
  AppNotification,
  Application,
  ApplicationDraft,
  Conversation,
  Message,
  Profile,
  Room,
} from '@/lib/types';

import {
  applyToRoom as applyToRoomOp,
  cancelApplication as cancelApplicationOp,
  requestRoommate as requestRoommateOp,
  simulateDecision as simulateDecisionOp,
} from '@/services/application-service';
import * as authService from '@/services/auth-service';
import * as favoritesService from '@/services/favorites-service';
import * as messageService from '@/services/message-service';
import * as notificationService from '@/services/notification-service';
import * as profileService from '@/services/profile-service';
import { setCustomRoomsCache } from '@/services/room-service';

export interface AppState {
  /** False until the first storage read has settled. */
  isLoading: boolean;
  /** Set when that first read failed; the screens offer a retry. */
  loadError: string | null;

  session: StoredSession | null;
  isSignedIn: boolean;
  profile: Profile;

  savedRoomIds: string[];
  savedRoommateIds: string[];
  applications: Application[];
  roommateRequests: Application[];
  conversations: Conversation[];
  messages: Message[];
  notifications: AppNotification[];
  customRooms: Room[];
}

export interface AppContextValue extends AppState {
  /** Unread in-app notifications. Drives the bell badge. */
  unreadNotificationCount: number;
  /** Unread messages across every thread. Drives the messages tab badge. */
  unreadMessageCount: number;

  signIn: (email: string, password: string) => Promise<Result<StoredSession>>;
  signUp: (input: authService.SignUpInput) => Promise<Result<StoredSession>>;
  signOut: () => Promise<Result<true>>;

  updateProfile: (updates: Partial<Profile>) => Promise<Result<Profile>>;

  toggleSavedRoom: (roomId: string) => Promise<Result<boolean>>;
  toggleSavedRoommate: (roommateId: string) => Promise<Result<boolean>>;

  applyToRoom: (draft: Extract<ApplicationDraft, { kind: 'room' }>) => Promise<Result<Application>>;
  requestRoommate: (
    draft: Extract<ApplicationDraft, { kind: 'roommate' }>,
  ) => Promise<Result<Application>>;
  cancelApplication: (id: string) => Promise<Result<Application>>;
  /** Answers a pending room application, standing in for a landlord reply. */
  decideApplication: (
    id: string,
    status: 'approved' | 'rejected',
  ) => Promise<Result<Application>>;

  sendMessage: (conversationId: string, body: string) => Promise<Result<Message>>;
  openConversation: (roommateId: string) => Promise<Result<Conversation>>;
  /** Clears a thread's unread badge when it is opened. */
  markConversationRead: (conversationId: string) => Promise<Result<true>>;

  markNotificationRead: (id: string) => Promise<Result<true>>;
  markAllNotificationsRead: () => Promise<Result<number>>;

  resetDemoData: () => Promise<Result<true>>;
  reload: () => Promise<void>;
  addCustomRoom: (room: Room) => Promise<Result<Room>>;
  updateCustomRoom: (room: Room) => Promise<Result<Room>>;
  deleteCustomRoom: (id: string) => Promise<Result<true>>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    loadError: null,
    session: null,
    isSignedIn: false,
    profile: DEMO_PROFILE,
    savedRoomIds: [],
    savedRoommateIds: [],
    applications: [],
    roommateRequests: [],
    conversations: [],
    messages: [],
    notifications: [],
    customRooms: [],
  });

  /**
   * Reads every collection in one pass.
   *
   * The collections are independent, so one corrupt key reports its own error
   * without discarding the rest: the failing list comes back empty and
   * `loadError` names what went wrong.
   */
  const reload = useCallback(async () => {
    const [
      session,
      profile,
      savedRooms,
      savedRoommates,
      applications,
      roommateRequests,
      conversations,
      messages,
      notifications,
      customRooms,
    ] = await Promise.all([
      getSession(),
      getProfile(DEMO_PROFILE),
      getSavedRoomIds(),
      getSavedRoommateIds(),
      getApplications([]),
      getRoommateRequests([]),
      getConversations([]),
      getMessages([]),
      getNotifications([]),
      getCustomRooms(),
    ]);

    const problems: string[] = [];
    if (!session.ok) problems.push(session.error.message);
    if (!profile.ok) problems.push(profile.error.message);
    if (!savedRooms.ok) problems.push(savedRooms.error.message);
    if (!savedRoommates.ok) problems.push(savedRoommates.error.message);
    if (!applications.ok) problems.push(applications.error.message);
    if (!roommateRequests.ok) problems.push(roommateRequests.error.message);
    if (!conversations.ok) problems.push(conversations.error.message);
    if (!messages.ok) problems.push(messages.error.message);
    if (!notifications.ok) problems.push(notifications.error.message);
    if (!customRooms.ok) problems.push(customRooms.error.message);

    const loadedCustomRooms = customRooms.ok ? customRooms.data : [];
    // Keep the search service in sync so listings reflect storage on launch.
    setCustomRoomsCache(loadedCustomRooms);

    setState((previous) => ({
      ...previous,
      isLoading: false,
      loadError: problems.length > 0 ? problems.join(' ') : null,
      session: session.ok ? session.data : null,
      isSignedIn: session.ok && session.data !== null,
      profile: profile.ok ? profile.data : DEMO_PROFILE,
      savedRoomIds: savedRooms.ok ? savedRooms.data : [],
      savedRoommateIds: savedRoommates.ok ? savedRoommates.data : [],
      applications: applications.ok ? applications.data : [],
      roommateRequests: roommateRequests.ok ? roommateRequests.data : [],
      conversations: conversations.ok ? conversations.data : [],
      messages: messages.ok ? messages.data : [],
      notifications: notifications.ok ? notifications.data : [],
      customRooms: loadedCustomRooms,
    }));

    await markSeeded();
  }, []);

  // Hydration. This is the one place setState belongs in an effect body: the
  // store starts empty and has to read AsyncStorage — an external system — before
  // any screen can render real data. `reload` awaits every read before it sets
  // anything, so this cannot cascade; the rule cannot see that across the
  // `useCallback` boundary and has to be told.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  /* ---------------------------------------------------------------- */
  /* Auth                                                             */
  /* ---------------------------------------------------------------- */

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authService.signIn(email, password);
    if (result.ok) {
      const profile = await getProfile(DEMO_PROFILE);
      setState((previous) => ({
        ...previous,
        session: result.data,
        isSignedIn: true,
        profile: profile.ok ? profile.data : previous.profile,
      }));
    }
    return result;
  }, []);

  const signUp = useCallback(async (input: authService.SignUpInput) => {
    const result = await authService.signUp(input);
    if (result.ok) {
      // A new account still shares the demo profile: the fixtures describe one
      // person's preferences, and inventing a second set would leave every
      // roommate score computed against nobody.
      const profile = await getProfile(DEMO_PROFILE);
      setState((previous) => ({
        ...previous,
        session: result.data,
        isSignedIn: true,
        profile: profile.ok ? profile.data : previous.profile,
      }));
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    const result = await authService.signOut();
    if (result.ok) {
      // Only the session is cleared. The profile and every collection survive
      // so signing back in restores this demo account's state rather than
      // wiping the demo every time.
      setState((previous) => ({ ...previous, session: null, isSignedIn: false }));
    }
    return result;
  }, []);

  /* ---------------------------------------------------------------- */
  /* Profile                                                          */
  /* ---------------------------------------------------------------- */

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    const result = await profileService.updateMyProfile(updates);
    if (result.ok) {
      setState((previous) => ({ ...previous, profile: result.data }));
    }
    return result;
  }, []);

  /* ---------------------------------------------------------------- */
  /* Favourites                                                       */
  /* ---------------------------------------------------------------- */

  const toggleSavedRoom = useCallback(async (roomId: string) => {
    const result = await favoritesService.toggleSavedRoom(roomId);
    if (result.ok) {
      setState((previous) => ({
        ...previous,
        savedRoomIds: result.data.saved
          ? [...previous.savedRoomIds, roomId]
          : previous.savedRoomIds.filter((id) => id !== roomId),
      }));
      return ok(result.data.saved);
    }
    return result;
  }, []);

  const toggleSavedRoommate = useCallback(async (roommateId: string) => {
    const result = await favoritesService.toggleSavedRoommate(roommateId);
    if (result.ok) {
      setState((previous) => ({
        ...previous,
        savedRoommateIds: result.data.saved
          ? [...previous.savedRoommateIds, roommateId]
          : previous.savedRoommateIds.filter((id) => id !== roommateId),
      }));
      return ok(result.data.saved);
    }
    return result;
  }, []);

  /* ---------------------------------------------------------------- */
  /* Applications                                                     */
  /* ---------------------------------------------------------------- */

  const applyToRoom = useCallback(async (draft: Extract<ApplicationDraft, { kind: 'room' }>) => {
    const result = await applyToRoomOp(draft);
    if (result.ok) {
      setState((previous) => ({ ...previous, applications: [result.data, ...previous.applications] }));
      // The bell should reflect the submission that just happened.
      await notificationService.notify({
        kind: 'application_update',
        title: 'Application submitted',
        body: `Your application for ${result.data.roomTitle ?? 'the room'} was sent to the landlord.`,
        href: '/applications',
      });
    }
    return result;
  }, []);

  const requestRoommate = useCallback(async (draft: Extract<ApplicationDraft, { kind: 'roommate' }>) => {
    const result = await requestRoommateOp(draft);
    if (result.ok) {
      setState((previous) => ({
        ...previous,
        roommateRequests: [result.data, ...previous.roommateRequests],
      }));
    }
    return result;
  }, []);

  const cancelApplication = useCallback(async (id: string) => {
    const result = await cancelApplicationOp(id);
    if (result.ok) {
      setState((previous) => {
        const patch = (list: Application[]): Application[] =>
          list.map((item) => (item.id === id ? result.data : item));
        return {
          ...previous,
          applications: patch(previous.applications),
          roommateRequests: patch(previous.roommateRequests),
        };
      });
    }
    return result;
  }, []);

  /**
   * Answers a pending room application on the user's behalf.
   *
   * Stands in for a landlord's reply, which a client-only demo cannot receive.
   * It re-reads the list rather than patching local state so the result matches
   * whatever `simulateDecision` actually decided.
   */
  const decideApplication = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      const result = await simulateDecisionOp(id, status);
      if (result.ok) {
        const [rooms, requests] = await Promise.all([
          getApplications([]),
          getRoommateRequests([]),
        ]);
        setState((previous) => ({
          ...previous,
          applications: rooms.ok ? rooms.data : previous.applications,
          roommateRequests: requests.ok ? requests.data : previous.roommateRequests,
        }));
        await notificationService.notify({
          kind: 'application_update',
          title: status === 'approved' ? 'Application approved' : 'Application declined',
          body:
            status === 'approved'
              ? `Your application for ${result.data.roomTitle ?? 'the room'} was approved.`
              : result.data.rejectionReason ?? 'Your application was not approved this time.',
          href: '/applications',
        });
      }
      return result;
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /* Messages                                                         */
  /* ---------------------------------------------------------------- */

  const sendMessage = useCallback(
    async (conversationId: string, body: string) => {
      const result = await messageService.sendMessage(state.profile, conversationId, body);
      if (result.ok) {
        setState((previous) => ({
          ...previous,
          messages: [...previous.messages, result.data],
          conversations: previous.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: result.data.body,
                  lastMessageAt: result.data.sentAt,
                  unreadCount: 0,
                }
              : c,
          ),
        }));
      }
      return result;
    },
    [state.profile],
  );

  const openConversation = useCallback(async (roommateId: string) => {
    const result = await messageService.ensureConversation(roommateId);
    if (result.ok) {
      setState((previous) => {
        if (previous.conversations.some((c) => c.id === result.data.id)) return previous;
        return { ...previous, conversations: [result.data, ...previous.conversations] };
      });
    }
    return result;
  }, []);

  const markConversationRead = useCallback(async (conversationId: string) => {
    const result = await messageService.markConversationRead(conversationId);
    if (result.ok) {
      setState((previous) => ({
        ...previous,
        conversations: previous.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      }));
    }
    return result;
  }, []);

  /* ---------------------------------------------------------------- */
  /* Notifications                                                    */
  /* ---------------------------------------------------------------- */

  const markNotificationRead = useCallback(async (id: string) => {
    const result = await notificationService.markRead(id);
    if (result.ok) {
      setState((previous) => ({
        ...previous,
        notifications: previous.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      }));
    }
    return result;
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const result = await notificationService.markAllRead();
    if (result.ok) {
      setState((previous) => ({
        ...previous,
        notifications: previous.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    }
    return result;
  }, []);

  /* ---------------------------------------------------------------- */
  /* Room management (Settings → Room Management)                      */
  /* ---------------------------------------------------------------- */

  /**
   * Every room mutation writes the whole custom list to AsyncStorage first and
   * only then updates state and the search cache, so a failed write leaves the
   * listings showing the truth. Once state holds the new list, search, the
   * rooms tab and the room detail screen all see it without another read.
   */
  const persistCustomRooms = useCallback(
    async (next: Room[]): Promise<Result<true>> => {
      const saved = await setCustomRooms(next);
      if (!saved.ok) return fail(saved.error.message, saved.error.code);

      setCustomRoomsCache(next);
      setState((previous) => ({ ...previous, customRooms: next }));
      return ok(true);
    },
    [],
  );

  const addCustomRoom = useCallback(
    async (room: Room): Promise<Result<Room>> => {
      const next = [room, ...state.customRooms];
      const saved = await persistCustomRooms(next);
      if (!saved.ok) return fail(saved.error.message, saved.error.code);
      return ok(room);
    },
    [state.customRooms, persistCustomRooms],
  );

  const updateCustomRoom = useCallback(
    async (room: Room): Promise<Result<Room>> => {
      const next = state.customRooms.map((existing) =>
        existing.id === room.id ? room : existing,
      );
      const saved = await persistCustomRooms(next);
      if (!saved.ok) return fail(saved.error.message, saved.error.code);
      return ok(room);
    },
    [state.customRooms, persistCustomRooms],
  );

  const deleteCustomRoom = useCallback(
    async (id: string): Promise<Result<true>> => {
      const next = state.customRooms.filter((room) => room.id !== id);
      const saved = await persistCustomRooms(next);
      if (!saved.ok) return fail(saved.error.message, saved.error.code);

      // A deleted room must also vanish from the saved tab rather than linger
      // as an id that resolves to nothing.
      if (state.savedRoomIds.includes(id)) {
        const remaining = state.savedRoomIds.filter((savedId) => savedId !== id);
        await favoritesService.toggleSavedRoom(id);
        setState((previous) => ({ ...previous, savedRoomIds: remaining }));
      }
      return ok(true);
    },
    [state.customRooms, state.savedRoomIds, persistCustomRooms],
  );

  /* ---------------------------------------------------------------- */
  /* Demo reset                                                       */
  /* ---------------------------------------------------------------- */

  const resetDemoData = useCallback(async () => {
    const result = await resetAllData();
    if (result.ok) {
      await reload();
    }
    return result;
  }, [reload]);

  // Derived rather than stored: both are pure functions of lists the provider
  // already holds, so caching them separately would only add a place to go stale.
  const unreadNotificationCount = useMemo(
    () => state.notifications.filter((n) => !n.isRead).length,
    [state.notifications],
  );

  const unreadMessageCount = useMemo(
    () => state.conversations.reduce((total, c) => total + c.unreadCount, 0),
    [state.conversations],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      unreadNotificationCount,
      unreadMessageCount,
      signIn,
      signUp,
      signOut,
      updateProfile,
      toggleSavedRoom,
      toggleSavedRoommate,
      applyToRoom,
      requestRoommate,
      cancelApplication,
      decideApplication,
      sendMessage,
      openConversation,
      markConversationRead,
      markNotificationRead,
      markAllNotificationsRead,
      resetDemoData,
      reload,
      addCustomRoom,
      updateCustomRoom,
      deleteCustomRoom,
    }),
    [
      state,
      unreadNotificationCount,
      unreadMessageCount,
      signIn,
      signUp,
      signOut,
      updateProfile,
      toggleSavedRoom,
      toggleSavedRoommate,
      applyToRoom,
      requestRoommate,
      cancelApplication,
      decideApplication,
      sendMessage,
      openConversation,
      markConversationRead,
      markNotificationRead,
      markAllNotificationsRead,
      resetDemoData,
      reload,
      addCustomRoom,
      updateCustomRoom,
      deleteCustomRoom,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}















