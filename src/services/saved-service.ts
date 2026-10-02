import { DEMO_MODE } from '@/lib/config';
import { ok, runQuery, type Result } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { PropertySearchResult, RoommateMatchResult } from '@/lib/database.types';
import { roommateService } from '@/services/roommate-service';
import {
  getSavedProperties,
  addSavedProperty,
  removeSavedProperty,
  getSavedRoommates,
  addSavedRoommate,
  removeSavedRoommate,
} from '@/lib/async-storage';

export const savedPropertyService = {
  async list(userId: string): Promise<Result<PropertySearchResult[]>> {
    if (DEMO_MODE) {
      const { DEMO_PROPERTIES } = await import('@/lib/demo-data');
      const saved = await getSavedProperties();
      const userSaved = saved.filter((s) => s.user_id === userId);
      const savedIds = new Set(userSaved.map((s) => s.property_id));
      const properties = DEMO_PROPERTIES.filter((p) => savedIds.has(p.id));
      return ok(properties);
    }

    const ids = await runQuery('Load saved listings', () =>
      supabase.from('saved_properties').select('property_id').eq('user_id', userId),
    );
    if (!ids.ok) return ids;

    const propertyIds = (ids.data ?? []).map((row) => row.property_id);
    if (propertyIds.length === 0) return ok([]);

    const results = await runQuery('Load saved listings', () =>
      supabase.rpc('search_properties', {
        p_search: null, p_city: null, p_barangay: null, p_min_price: null,
        p_max_price: null, p_property_types: null, p_amenity_ids: null,
        p_available_only: false, p_near_latitude: null, p_near_longitude: null,
        p_near_name: null, p_max_distance_km: null, p_landlord_id: null,
        p_include_drafts: false, p_sort: 'recent', p_limit: 100, p_offset: 0,
      }).then((res) => ({ data: (res.data ?? []) as PropertySearchResult[], error: res.error })),
    );
    if (!results.ok) return results;

    const byId = new Map(results.data.map((row) => [row.id, row]));
    return ok(propertyIds.map((id) => byId.get(id)).filter((row): row is PropertySearchResult => Boolean(row)));
  },

  async isSaved(userId: string, propertyId: string): Promise<Result<boolean>> {
    if (DEMO_MODE) {
      const saved = await getSavedProperties();
      const exists = saved.some((s) => s.user_id === userId && s.property_id === propertyId);
      return ok(exists);
    }
    const result = await runQuery('Check saved', () =>
      supabase.from('saved_properties').select('property_id').eq('user_id', userId).eq('property_id', propertyId).maybeSingle(),
    );
    if (!result.ok) return result;
    return ok(Boolean(result.data));
  },

  async toggle(userId: string, propertyId: string): Promise<Result<boolean>> {
    if (DEMO_MODE) {
      const current = await this.isSaved(userId, propertyId);
      if (!current.ok) return current;

      if (current.data) {
        await removeSavedProperty(userId, propertyId);
        return ok(false);
      }

      await addSavedProperty(userId, propertyId);
      return ok(true);
    }
    const current = await this.isSaved(userId, propertyId);
    if (!current.ok) return current;

    if (current.data) {
      const removed = await runQuery('Remove from saved', () =>
        supabase.from('saved_properties').delete().eq('user_id', userId).eq('property_id', propertyId).select('property_id'),
      );
      if (!removed.ok) return removed;
      return ok(false);
    }

    const added = await runQuery('Save listing', () =>
      supabase.from('saved_properties').insert({ user_id: userId, property_id: propertyId }).select('property_id'),
    );
    if (!added.ok) return added;
    return ok(true);
  },

  async remove(userId: string, propertyId: string): Promise<Result<true>> {
    if (DEMO_MODE) {
      await removeSavedProperty(userId, propertyId);
      return ok(true);
    }
    const result = await runQuery('Remove from saved', () =>
      supabase.from('saved_properties').delete().eq('user_id', userId).eq('property_id', propertyId).select('property_id'),
    );
    if (!result.ok) return result;
    return ok(true);
  },

  async count(userId: string): Promise<Result<number>> {
    if (DEMO_MODE) {
      const saved = await getSavedProperties();
      const count = saved.filter((s) => s.user_id === userId).length;
      return ok(count);
    }
    const result = await runQuery('Count saved', () =>
      supabase.from('saved_properties').select('property_id', { count: 'exact', head: true }).eq('user_id', userId),
    );
    if (!result.ok) return result;
    return ok(result.data.length);
  },
};

export const savedRoommateService = {
  async list(userId: string): Promise<Result<RoommateMatchResult[]>> {
    if (DEMO_MODE) {
      const { DEMO_ROOMMATES } = await import('@/lib/demo-data');
      const saved = await getSavedRoommates();
      const userSaved = saved.filter((s) => s.user_id === userId);
      const savedIds = new Set(userSaved.map((s) => s.roommate_profile_id));
      const roommates = DEMO_ROOMMATES.filter((r) => savedIds.has(r.roommate_profile_id));
      return ok(roommates);
    }
    const ids = await runQuery('Load saved roommates', () =>
      supabase.from('saved_roommate_profiles').select('roommate_profile_id'),
    );
    if (!ids.ok) return ids;
    const profileIds = ids.data.map((r) => r.roommate_profile_id);
    if (profileIds.length === 0) return ok([]);
    return roommateService.search({ limit: 100 });
  },

  async toggle(userId: string, roommateProfileId: string): Promise<Result<boolean>> {
    if (DEMO_MODE) {
      const saved = await getSavedRoommates();
      const exists = saved.some((s) => s.user_id === userId && s.roommate_profile_id === roommateProfileId);

      if (exists) {
        await removeSavedRoommate(userId, roommateProfileId);
        return ok(false);
      }

      await addSavedRoommate(userId, roommateProfileId);
      return ok(true);
    }
    const existing = await runQuery('Check saved roommate', () =>
      supabase.from('saved_roommate_profiles').select('roommate_profile_id').eq('user_id', userId).eq('roommate_profile_id', roommateProfileId).maybeSingle(),
    );
    if (!existing.ok) return existing;

    if (existing.data) {
      const removed = await runQuery('Remove saved roommate', () =>
        supabase.from('saved_roommate_profiles').delete().eq('user_id', userId).eq('roommate_profile_id', roommateProfileId).select('roommate_profile_id'),
      );
      if (!removed.ok) return removed;
      return ok(false);
    }

    const added = await runQuery('Save roommate', () =>
      supabase.from('saved_roommate_profiles').insert({ user_id: userId, roommate_profile_id: roommateProfileId }).select('roommate_profile_id'),
    );
    if (!added.ok) return added;
    return ok(true);
  },
};
