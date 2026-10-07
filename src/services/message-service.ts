/**
 * Messaging.
 *
 * Messages are stored flat and keyed by `conversationId`, with a parallel list
 * of conversations carrying the denormalised summary the list screen renders.
 * A conversation is created on first send to someone who is not yet in the
 * list, so "Message" works from any roommate profile without a separate
 * "start chat" step.
 */

import { fail, ok, type Result } from '@/lib/errors';
import { findRoommate, SEED_CONVERSATIONS, SEED_MESSAGES } from '@/lib/mock-data';
import { getConversations, getMessages, setConversations, setMessages } from '@/lib/storage';
import type { Conversation, Message, Profile } from '@/lib/types';

let counter = 0;

function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** The conversation id used for a given roommate. Stable in the fixtures. */
export function conversationIdFor(roommateId: string): string {
  return `convo-${roommateId.replace(/^rm-/, '')}`;
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function listConversations(): Promise<Result<Conversation[]>> {
  const result = await getConversations(SEED_CONVERSATIONS);
  if (!result.ok) return fail(result.error.message, result.error.code);

  const sorted = [...result.data].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
  return ok(sorted);
}

/** Messages in one conversation, oldest first, so the thread reads top-down. */
export async function listMessages(conversationId: string): Promise<Result<Message[]>> {
  const result = await getMessages(SEED_MESSAGES);
  if (!result.ok) return fail(result.error.message, result.error.code);

  const messages = result.data
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  return ok(messages);
}

export async function unreadConversationCount(): Promise<Result<number>> {
  const conversations = await listConversations();
  if (!conversations.ok) return fail(conversations.error.message, conversations.error.code);
  return ok(conversations.data.reduce((total, c) => total + c.unreadCount, 0));
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

/**
 * Appends a message from the signed-in user and refreshes the conversation
 * summary so the list screen shows it immediately on the next render.
 */
export async function sendMessage(
  profile: Profile,
  conversationId: string,
  body: string,
): Promise<Result<Message>> {
  const trimmed = body.trim();
  if (trimmed.length === 0) return fail('Type a message before sending.', 'empty_message');

  const conversations = await listConversations();
  if (!conversations.ok) return fail(conversations.error.message, conversations.error.code);

  const allMessages = await getMessages(SEED_MESSAGES);
  if (!allMessages.ok) return fail(allMessages.error.message, allMessages.error.code);

  const message: Message = {
    id: newId('msg'),
    conversationId,
    senderId: profile.id,
    body: trimmed,
    sentAt: nowIso(),
    isRead: true,
  };

  const writtenMessages = await setMessages([...allMessages.data, message]);
  if (!writtenMessages.ok) return fail(writtenMessages.error.message, writtenMessages.error.code);

  const existing = conversations.data.find((c) => c.id === conversationId);
  let nextConversations: Conversation[];

  if (existing) {
    nextConversations = conversations.data.map((c) =>
      c.id === conversationId
        ? { ...c, lastMessage: trimmed, lastMessageAt: message.sentAt, unreadCount: 0 }
        : c,
    );
  } else {
    // First contact: derive the summary from the roommate fixture.
    const roommateId = conversationId.replace(/^convo-/, '');
    const roommate = findRoommate(`rm-${roommateId}`);
    if (!roommate) return fail('That conversation could not be opened.', 'not_found');

    nextConversations = [
      {
        id: conversationId,
        roommateId: roommate.id,
        roommateName: roommate.fullName,
        roommateAvatarUrl: roommate.avatarUrl,
        roommateOccupation: `${roommate.occupation} · ${roommate.schoolOrWork}`,
        roommateCompatibility: roommate.compatibilityScore,
        lastMessage: trimmed,
        lastMessageAt: message.sentAt,
        unreadCount: 0,
        isSaved: true,
      },
      ...conversations.data,
    ];
  }

  const writtenConversations = await setConversations(nextConversations);
  if (!writtenConversations.ok) {
    return fail(writtenConversations.error.message, writtenConversations.error.code);
  }

  return ok(message);
}

/** Clears the unread badge when a thread is opened. */
export async function markConversationRead(conversationId: string): Promise<Result<true>> {
  const conversations = await listConversations();
  if (!conversations.ok) return fail(conversations.error.message, conversations.error.code);

  const target = conversations.data.find((c) => c.id === conversationId);
  if (!target || target.unreadCount === 0) return ok(true);

  const next = conversations.data.map((c) =>
    c.id === conversationId ? { ...c, unreadCount: 0 } : c,
  );
  const written = await setConversations(next);
  if (!written.ok) return fail(written.error.message, written.error.code);
  return ok(true);
}

/** Starts (or reuses) a conversation with a roommate. */
export async function ensureConversation(roommateId: string): Promise<Result<Conversation>> {
  const conversations = await listConversations();
  if (!conversations.ok) return fail(conversations.error.message, conversations.error.code);

  const id = conversationIdFor(roommateId);
  const existing = conversations.data.find((c) => c.id === id);
  if (existing) return ok(existing);

  const roommate = findRoommate(roommateId);
  if (!roommate) return fail('That roommate is no longer available.', 'not_found');

  const conversation: Conversation = {
    id,
    roommateId: roommate.id,
    roommateName: roommate.fullName,
    roommateAvatarUrl: roommate.avatarUrl,
    roommateOccupation: `${roommate.occupation} · ${roommate.schoolOrWork}`,
    roommateCompatibility: roommate.compatibilityScore,
    lastMessage: 'No messages yet — say hello',
    lastMessageAt: nowIso(),
    unreadCount: 0,
    isSaved: true,
  };

  const written = await setConversations([conversation, ...conversations.data]);
  if (!written.ok) return fail(written.error.message, written.error.code);

  return ok(conversation);
}