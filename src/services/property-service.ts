import { DEMO_MODE } from '@/lib/config';
import { DEMO_AMENITIES, DEMO_DASHBOARD_STATS, DEMO_PROPERTIES } from '@/lib/demo-data';
import { AppError, ok, runOptionalQuery, runQuery, type Result } from '@/lib/errors';
import { supabase, storageBuckets } from '@/lib/supabase';
import type {
  AmenityRow,
  LandlordDashboardStats,
  PropertyImageRow,
  PropertyInsert,
  PropertyRow,
  PropertySearchArgs,
  PropertySearchResult,
  PropertyType,
  PropertyUpdate,
} from '@/lib/database.types';

export interface PropertyDetail {
  property: PropertyRow;
  images: PropertyImageRow[];
  amenities: AmenityRow[];
  landlord: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    business_name: string | null;
    verification_status: 'pending' | 'verified' | 'rejected';
    verified_at: string | null;
    public_phone: string | null;
    public_email: string | null;
  } | null;
}

export interface SearchParams {
  search?: string | null;
  city?: string | null;
  barangay?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  propertyTypes?: PropertyType[] | null;
  amenityIds?: number[] | null;
  availableOnly?: boolean | null;
  nearLatitude?: number | null;
  nearLongitude?: number | null;
  nearName?: string | null;
  maxDistanceKm?: number | null;
  landlordId?: string | null;
  includeDrafts?: boolean | null;
  sort?: PropertySearchArgs['p_sort'];
  limit?: number;
  offset?: number;
}

export interface PropertyPage {
  items: PropertySearchResult[];
  hasMore: boolean;
}

function toRpcArgs(params: SearchParams): PropertySearchArgs {
  return {
    p_search: params.search ?? null,
    p_city: params.city ?? null,
    p_barangay: params.barangay ?? null,
    p_min_price: params.minPrice ?? null,
    p_max_price: params.maxPrice ?? null,
    p_property_types: params.propertyTypes?.length ? params.propertyTypes : null,
    p_amenity_ids: params.amenityIds?.length ? params.amenityIds : null,
    p_available_only: params.availableOnly ?? true,
    p_near_latitude: params.nearLatitude ?? null,
    p_near_longitude: params.nearLongitude ?? null,
    p_near_name: params.nearName ?? null,
    p_max_distance_km: params.maxDistanceKm ?? null,
    p_landlord_id: params.landlordId ?? null,
    p_include_drafts: params.includeDrafts ?? false,
    p_sort: params.sort ?? 'recent',
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
  };
}

function searchProperties(params: SearchParams): Promise<Result<PropertySearchResult[]>> {
  return runQuery('Search properties', () => supabase.rpc('search_properties', toRpcArgs(params)));
}

function updateProperty(propertyId: string, values: PropertyUpdate): Promise<Result<PropertyRow>> {
  return runQuery('Update listing', () =>
    supabase.from('properties').update(values).eq('id', propertyId).select('*').single(),
  );
}

const DEMO_ERROR = new AppError('Demo mode: changes are not saved.', 'demo');

export const propertyService = {
  search: searchProperties,

  async searchPage(params: SearchParams): Promise<Result<PropertyPage>> {
    if (DEMO_MODE) {
      let items = DEMO_PROPERTIES;
      if (params.city) items = items.filter((p) => p.city === params.city);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (p) => p.title.toLowerCase().includes(q) || p.barangay.toLowerCase().includes(q),
        );
      }
      return ok({ items, hasMore: false });
    }
    const limit = params.limit ?? 20;
    const result = await searchProperties({ ...params, limit: limit + 1, offset: params.offset ?? 0 });
    if (!result.ok) return result;
    const items = result.data.slice(0, limit);
    return ok({ items, hasMore: result.data.length > limit });
  },

  async getById(propertyId: string): Promise<Result<PropertyDetail>> {
    if (DEMO_MODE) {
      const p = DEMO_PROPERTIES.find((x) => x.id === propertyId);
      if (!p) return { ok: false, error: new AppError('Listing not found.', 'not_found') };
      return ok({
        property: {
          id: p.id, landlord_id: p.landlord_id, title: p.title,
          description: 'This is a demo listing. No real data is stored.',
          property_type: p.property_type, monthly_rent: p.monthly_rent,
          advance_amount: p.advance_amount, other_fees: [], city: p.city,
          barangay: p.barangay, address_line: null, landmark: p.landmark,
          latitude: p.latitude, longitude: p.longitude,
          nearby_schools: [], nearby_workplaces: [],
          total_units: p.total_units, occupied_units: p.occupied_units,
          gender_preference: 'any', available_from: null,
          status: 'published', is_featured: p.is_featured,
          virtual_tour_url: null, view_count: p.view_count,
          created_at: p.created_at, updated_at: p.created_at,
        },
        images: [],
        amenities: DEMO_AMENITIES.filter((a) => p.amenity_ids.includes(a.id)),
        landlord: {
          id: p.landlord_id, full_name: p.landlord_name, avatar_url: null,
          bio: null, business_name: 'Demo Properties',
          verification_status: 'verified', verified_at: p.created_at,
          public_phone: null, public_email: null,
        },
      });
    }

    const propertyResult = await runOptionalQuery('Load property', () =>
      supabase.from('properties').select('*').eq('id', propertyId).maybeSingle(),
    );
    if (!propertyResult.ok) return propertyResult;
    if (!propertyResult.data) {
      return { ok: false, error: new AppError('This listing is no longer available.', 'not_found') };
    }

    const property = propertyResult.data;
    const [images, amenityRows, landlord] = await Promise.all([
      supabase.from('property_images').select('*').eq('property_id', propertyId).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('property_amenities').select('amenity_id').eq('property_id', propertyId),
      supabase.from('profiles').select('id, full_name, avatar_url, bio, business_name, verification_status, verified_at, public_phone, public_email').eq('id', property.landlord_id).maybeSingle(),
    ]);

    if (images.error || amenityRows.error || landlord.error) {
      const reason = images.error ?? amenityRows.error ?? landlord.error;
      return { ok: false, error: new AppError('This listing could not be loaded completely.', reason?.code ?? 'partial_failure', { details: reason }) };
    }

    const ids = (amenityRows.data ?? []).map((row) => row.amenity_id);
    let amenities: AmenityRow[] = [];
    if (ids.length > 0) {
      const amenityResult = await runQuery('Load amenities', () =>
        supabase.from('amenities').select('*').in('id', ids).order('sort_order', { ascending: true }),
      );
      if (amenityResult.ok) amenities = amenityResult.data;
    }

    return ok({ property, images: images.data ?? [], amenities, landlord: landlord.data ?? null });
  },

  async recordView(propertyId: string): Promise<void> {
    if (DEMO_MODE) return;
    try { await supabase.rpc('record_property_view', { p_property_id: propertyId }); } catch { /* ignored */ }
  },

  async create(input: PropertyInsert): Promise<Result<PropertyRow>> {
    if (DEMO_MODE) return { ok: false, error: DEMO_ERROR };
    return runQuery('Create listing', () =>
      supabase.from('properties').insert(input).select('*').single(),
    );
  },

  update: updateProperty,

  async remove(propertyId: string): Promise<Result<true>> {
    if (DEMO_MODE) return { ok: false, error: DEMO_ERROR };
    const result = await runQuery('Delete listing', () =>
      supabase.from('properties').delete().eq('id', propertyId).select('id').single(),
    );
    if (!result.ok) return result;
    return ok(true);
  },

  async setStatus(propertyId: string, status: PropertyRow['status']): Promise<Result<PropertyRow>> {
    if (DEMO_MODE) return { ok: false, error: DEMO_ERROR };
    return updateProperty(propertyId, { status });
  },

  async listByLandlord(landlordId: string): Promise<Result<PropertySearchResult[]>> {
    if (DEMO_MODE) return ok(DEMO_PROPERTIES);
    return searchProperties({ landlordId, includeDrafts: true, availableOnly: false, sort: 'recent', limit: 100 });
  },

  async setAmenities(propertyId: string, amenityIds: number[]): Promise<Result<true>> {
    if (DEMO_MODE) return ok(true);
    const deleteResult = await runQuery('Clear amenities', () =>
      supabase.from('property_amenities').delete().eq('property_id', propertyId).select('property_id'),
    );
    if (!deleteResult.ok) return deleteResult;
    if (amenityIds.length > 0) {
      const insertResult = await runQuery('Save amenities', () =>
        supabase.from('property_amenities').insert(amenityIds.map((amenityId) => ({ property_id: propertyId, amenity_id: amenityId }))).select('property_id'),
      );
      if (!insertResult.ok) return insertResult;
    }
    return ok(true);
  },

  async listAmenities(): Promise<Result<AmenityRow[]>> {
    if (DEMO_MODE) return ok(DEMO_AMENITIES);
    return runQuery('Load amenities', () =>
      supabase.from('amenities').select('*').order('sort_order', { ascending: true }),
    );
  },

  async listImages(propertyId: string): Promise<Result<PropertyImageRow[]>> {
    if (DEMO_MODE) return ok([]);
    return runQuery('Load photos', () =>
      supabase.from('property_images').select('*').eq('property_id', propertyId).order('sort_order', { ascending: true }),
    );
  },

  async addImages(propertyId: string, paths: string[]): Promise<Result<PropertyImageRow[]>> {
    if (DEMO_MODE) return ok([]);
    if (paths.length === 0) return ok([]);
    return runQuery('Save photos', () =>
      supabase.from('property_images').insert(
        paths.map((storagePath, index) => ({ property_id: propertyId, storage_path: storagePath, is_uploaded: true, sort_order: index })),
      ).select('*'),
    );
  },

  async removeImage(imageId: string, storagePath: string | null): Promise<Result<true>> {
    if (DEMO_MODE) return ok(true);
    const result = await runQuery('Delete photo', () =>
      supabase.from('property_images').delete().eq('id', imageId).select('id').single(),
    );
    if (!result.ok) return result;
    if (storagePath) {
      const { error } = await supabase.storage.from(storageBuckets.propertyImages).remove([storagePath]);
      if (error) {
        return { ok: false, error: new AppError('The photo was removed from the listing but could not be deleted from storage.', 'storage_cleanup_failed', { details: error }) };
      }
    }
    return ok(true);
  },

  async dashboardStats(): Promise<Result<LandlordDashboardStats>> {
    if (DEMO_MODE) return ok(DEMO_DASHBOARD_STATS);
    return runQuery('Load dashboard', () => supabase.rpc('landlord_dashboard_stats'));
  },
};
