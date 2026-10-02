import { DEMO_MODE } from '@/lib/config';
import { DEMO_ROOMMATES } from '@/lib/demo-data';
import { AppError, fail, ok, runCount, runOptionalQuery, runQuery, type Result } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type {
  RoommateMatchResult,
  RoommateProfileInsert,
  RoommateProfileRow,
  RoommateRequestRow,
  RoommateRequestStatus,
} from '@/lib/database.types';
import {
  getRoommateRequests,
  addRoommateRequest,
  updateRoommateRequest,
  removeRoommateRequest,
} from '@/lib/async-storage';

export interface RoommateRequestWithPerson extends RoommateRequestRow {
  sender: { id: string; full_name: string; avatar_url: string | null } | null;
  receiver: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface RoommateSearchParams {
  query?: string | null;
  city?: string | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  moveInBefore?: string | null;
  userId?: string | null;
  limit?: number;
  offset?: number;
}

async function searchRoommates(
  params: RoommateSearchParams,
): Promise<Result<RoommateMatchResult[]>> {
  return runQuery('Find roommates', () =>
    supabase.rpc('search_roommates', {
      p_query: params.query ?? null,
      p_city: params.city ?? null,
      p_min_budget: params.minBudget ?? null,
      p_max_budget: params.maxBudget ?? null,
      p_move_in_before: params.moveInBefore ?? null,
      p_user_id: params.userId ?? null,
      p_limit: params.limit ?? 30,
      p_offset: params.offset ?? 0,
    }),
  );
}

export const roommateService = {
  async search(_params: RoommateSearchParams): Promise<Result<RoommateMatchResult[]>> {
    if (DEMO_MODE) return ok(DEMO_ROOMMATES);
    return searchRoommates(_params);
  },

  async getMatchByUserId(candidateId: string): Promise<Result<RoommateMatchResult | null>> {
    if (DEMO_MODE) return ok(DEMO_ROOMMATES.find((r) => r.user_id === candidateId) ?? null);
    const result = await searchRoommates({ userId: candidateId, limit: 1 });
    if (!result.ok) return result;
    return ok(result.data[0] ?? null);
  },

  async getMyProfile(userId: string): Promise<Result<RoommateProfileRow | null>> {
    if (DEMO_MODE) return ok(null);
    return runOptionalQuery('Load roommate profile', () =>
      supabase.from('roommate_profiles').select('*').eq('user_id', userId).maybeSingle(),
    );
  },

  async upsertProfile(
    userId: string,
    values: Omit<RoommateProfileInsert, 'user_id'>,
  ): Promise<Result<RoommateProfileRow>> {
    if (DEMO_MODE) return fail('Demo mode: profile changes are not saved.', 'demo');
    return runQuery('Save roommate profile', () =>
      supabase
        .from('roommate_profiles')
        .upsert({ user_id: userId, ...values }, { onConflict: 'user_id' })
        .select('*')
        .single(),
    );
  },

  async deleteProfile(userId: string): Promise<Result<true>> {
    if (DEMO_MODE) return ok(true);
    const result = await runQuery('Delete roommate profile', () =>
      supabase.from('roommate_profiles').delete().eq('user_id', userId).select('user_id'),
    );
    if (!result.ok) return result;
    return ok(true);
  },

  async sendRequest(
    senderId: string,
    receiverId: string,
    message?: string | undefined,
  ): Promise<Result<RoommateRequestRow>> {
    if (DEMO_MODE) {
      if (senderId === receiverId) {
        return fail('You cannot send a roommate request to yourself.', 'self_request');
      }

      const id = `roommate-req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();

      const request: RoommateRequestRow = {
        id,
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending',
        message: message?.trim() ? message.trim() : null,
        responded_at: null,
        created_at: now,
        updated_at: now,
      };

      await addRoommateRequest(request);
      return ok(request);
    }

    if (senderId === receiverId) {
      return fail('You cannot send a roommate request to yourself.', 'self_request');
    }

    const target = await runOptionalQuery('Load candidate', () =>
      supabase
        .from('roommate_profiles')
        .select('id, is_active, discoverable')
        .eq('user_id', receiverId)
        .maybeSingle(),
    );

    if (!target.ok) return target;
    if (!target.data) return fail('That person is no longer looking for a roommate.', 'not_discoverable');
    if (!target.data.is_active || !target.data.discoverable) {
      return fail('That person is not accepting roommate requests right now.', 'not_discoverable');
    }

    return runQuery('Send roommate request', () =>
      supabase
        .from('roommate_requests')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          message: message?.trim() ? message.trim() : null,
        })
        .select('*')
        .single(),
    );
  },

  async respondToRequest(
    requestId: string,
    userId: string,
    status: Extract<RoommateRequestStatus, 'accepted' | 'declined'>,
  ): Promise<Result<RoommateRequestRow>> {
    if (DEMO_MODE) {
      const requests = await getRoommateRequests();
      const request = requests.find((r) => r.id === requestId);
      
      if (!request) return fail('That request no longer exists.', 'not_found');
      if (request.receiver_id !== userId) {
        return fail('You can only respond to requests sent to you.', 'forbidden');
      }
      if (request.status !== 'pending') {
        return fail('This request has already been answered.', 'already_answered');
      }

      const updated = await updateRoommateRequest(requestId, {
        status,
        responded_at: new Date().toISOString(),
      });
      if (!updated) return fail('That request no longer exists.', 'not_found');
      return ok(updated);
    }

    const request = await runOptionalQuery('Load request', () =>
      supabase.from('roommate_requests').select('*').eq('id', requestId).maybeSingle(),
    );
    if (!request.ok) return request;
    if (!request.data) return fail('That request no longer exists.', 'not_found');
    if (request.data.receiver_id !== userId) {
      return fail('You can only respond to requests sent to you.', 'forbidden');
    }
    if (request.data.status !== 'pending') {
      return fail('This request has already been answered.', 'already_answered');
    }

    return runQuery('Update request', () =>
      supabase
        .from('roommate_requests')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', requestId)
        .select('*')
        .single(),
    );
  },

  async withdrawRequest(
    requestId: string,
    userId: string,
  ): Promise<Result<RoommateRequestRow>> {
    if (DEMO_MODE) {
      const requests = await getRoommateRequests();
      const request = requests.find((r) => r.id === requestId);
      
      if (!request) return fail('That request no longer exists.', 'not_found');
      if (request.sender_id !== userId) {
        return fail('You can only withdraw requests you sent.', 'forbidden');
      }

      const updated = await updateRoommateRequest(requestId, {
        status: 'cancelled',
        responded_at: new Date().toISOString(),
      });
      if (!updated) return fail('That request no longer exists.', 'not_found');
      return ok(updated);
    }

    const request = await runOptionalQuery('Load request', () =>
      supabase.from('roommate_requests').select('*').eq('id', requestId).maybeSingle(),
    );
    if (!request.ok) return request;
    if (!request.data) return fail('That request no longer exists.', 'not_found');
    if (request.data.sender_id !== userId) {
      return fail('You can only withdraw requests you sent.', 'forbidden');
    }

    return runQuery('Withdraw request', () =>
      supabase
        .from('roommate_requests')
        .update({ status: 'cancelled', responded_at: new Date().toISOString() })
        .eq('id', requestId)
        .select('*')
        .single(),
    );
  },

  async listRequests(userId: string): Promise<Result<RoommateRequestWithPerson[]>> {
    if (DEMO_MODE) {
      const requests = await getRoommateRequests();
      const userRequests = requests.filter(
        (r) => r.sender_id === userId || r.receiver_id === userId
      );
      // Return basic format without hydrating people in demo mode
      return ok(
        userRequests.map((r) => ({ ...r, sender: null, receiver: null }))
      );
    }

    const requests = await runQuery('Load roommate requests', () =>
      supabase
        .from('roommate_requests')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false }),
    );
    if (!requests.ok) return requests;

    const rows = requests.data ?? [];
    if (rows.length === 0) return ok([]);

    const ids = [...new Set(rows.flatMap((r) => [r.sender_id, r.receiver_id]))];
    const people = await runQuery('Load people', () =>
      supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids),
    );
    if (!people.ok) return people;

    const byId = new Map((people.data ?? []).map((p) => [p.id, p]));
    return ok(
      rows.map((row) => ({
        ...row,
        sender: byId.get(row.sender_id) ?? null,
        receiver: byId.get(row.receiver_id) ?? null,
      })),
    );
  },

  async countIncoming(userId: string): Promise<Result<number>> {
    if (DEMO_MODE) {
      const requests = await getRoommateRequests();
      const count = requests.filter(
        (r) => r.receiver_id === userId && r.status === 'pending'
      ).length;
      return ok(count);
    }
    return runCount('Count roommate requests', () =>
      supabase
        .from('roommate_requests')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('status', 'pending'),
    );
  },
};
