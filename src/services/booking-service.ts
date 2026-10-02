import { DEMO_MODE } from '@/lib/config';
import { DEMO_BOOKINGS } from '@/lib/demo-data';
import { AppError, fail, ok, runCount, runOptionalQuery, runQuery, type Result } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type {
  BookingInsert,
  BookingRow,
  BookingStatus,
  PropertyType,
} from '@/lib/database.types';
import { getBookings, addBooking, updateBooking } from '@/lib/async-storage';

export interface BookingPropertySummary {
  id: string;
  title: string;
  city: string;
  barangay: string;
  monthly_rent: number;
  property_type: PropertyType;
  cover_image_path: string | null;
  cover_is_uploaded: boolean;
}

export interface BookingWithProperty {
  booking: BookingRow;
  property: BookingPropertySummary | null;
  landlord: {
    id: string;
    full_name: string;
    public_phone: string | null;
    public_email: string | null;
    verification_status: 'pending' | 'verified' | 'rejected';
  } | null;
  requester: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

const PROPERTY_FIELDS =
  'id, title, city, barangay, monthly_rent, property_type, landlord_id';

async function coverImages(
  propertyIds: string[],
): Promise<Map<string, { storage_path: string; is_uploaded: boolean }>> {
  const map = new Map<string, { storage_path: string; is_uploaded: boolean }>();
  if (propertyIds.length === 0) return map;

  const result = await runQuery('Load photos', () =>
    supabase
      .from('property_images')
      .select('property_id, storage_path, is_uploaded')
      .in('property_id', propertyIds)
      .order('sort_order', { ascending: true }),
  );

  if (!result.ok) return map;

  for (const row of result.data) {
    if (!map.has(row.property_id)) {
      map.set(row.property_id, {
        storage_path: row.storage_path,
        is_uploaded: row.is_uploaded,
      });
    }
  }
  return map;
}

async function hydrate(rows: BookingRow[]): Promise<Result<BookingWithProperty[]>> {
  if (rows.length === 0) return ok([]);

  const propertyIds = [...new Set(rows.map((r) => r.property_id))];
  const landlordIds = [...new Set(rows.map((r) => r.landlord_id))];
  const requesterIds = [...new Set(rows.map((r) => r.requester_id))];

  const [properties, landlords, requesters] = await Promise.all([
    supabase.from('properties').select(PROPERTY_FIELDS).in('id', propertyIds),
    supabase
      .from('profiles')
      .select('id, full_name, public_phone, public_email, verification_status')
      .in('id', landlordIds),
    supabase.from('profiles').select('id, full_name, avatar_url').in('id', requesterIds),
  ]);

  if (properties.error || landlords.error || requesters.error) {
    const reason = properties.error ?? landlords.error ?? requesters.error;
    return fail(
      'Your requests loaded but some details could not be read. Pull to refresh to try again.',
      reason?.code ?? 'partial_failure',
    );
  }

  const propertyById = new Map((properties.data ?? []).map((p) => [p.id, p]));
  const landlordById = new Map((landlords.data ?? []).map((p) => [p.id, p]));
  const requesterById = new Map((requesters.data ?? []).map((p) => [p.id, p]));
  const covers = await coverImages(propertyIds);

  const hydrated = rows.map((booking) => {
    const property = propertyById.get(booking.property_id) ?? null;
    const cover = covers.get(booking.property_id) ?? null;
    return {
      booking,
      property: property
        ? {
            id: property.id,
            title: property.title,
            city: property.city,
            barangay: property.barangay,
            monthly_rent: property.monthly_rent,
            property_type: property.property_type,
            cover_image_path: cover?.storage_path ?? null,
            cover_is_uploaded: cover?.is_uploaded ?? false,
          }
        : null,
      landlord: landlordById.get(booking.landlord_id) ?? null,
      requester: requesterById.get(booking.requester_id) ?? null,
    } satisfies BookingWithProperty;
  });

  return ok(hydrated);
}

async function setBookingStatusInStorage(
  bookingId: string,
  status: BookingStatus,
  reason?: string | undefined,
): Promise<Result<BookingRow>> {
  const updates: Partial<BookingRow> = { status };
  if (status === 'approved' || status === 'rejected') {
    updates.decided_at = new Date().toISOString();
  }
  if (reason) {
    updates.rejection_reason = reason;
  }
  const updated = await updateBooking(bookingId, updates);
  if (!updated) return fail('Booking not found.', 'not_found');
  return ok(updated);
}

function setBookingStatus(
  bookingId: string,
  status: BookingStatus,
  reason?: string | undefined,
): Promise<Result<BookingRow>> {
  if (DEMO_MODE) {
    return setBookingStatusInStorage(bookingId, status, reason);
  }
  return runQuery('Update request', () =>
    supabase.rpc('set_booking_status', {
      p_booking_id: bookingId,
      p_status: status,
      p_reason: reason ?? null,
    }),
  );
}

const DEMO_ERROR = new AppError('Demo mode: bookings are not saved.', 'demo');

export const bookingService = {
  async create(input: {
    propertyId: string;
    requesterId: string;
    kind: 'visit' | 'application';
    scheduledDate: string;
    scheduledTime: string;
    contactName: string;
    contactPhone: string;
    contactEmail?: string | undefined;
    note?: string | undefined;
    moveInDate?: string | undefined;
    occupants?: number | undefined;
  }): Promise<Result<BookingRow>> {
    if (DEMO_MODE) {
      // Generate a unique ID for the booking
      const id = `booking-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();
      
      const isVisit = input.kind === 'visit';
      const booking: BookingRow = {
        id,
        property_id: input.propertyId,
        requester_id: input.requesterId,
        landlord_id: 'demo-landlord',
        kind: input.kind,
        status: 'pending',
        scheduled_date: isVisit ? input.scheduledDate : input.moveInDate ?? input.scheduledDate,
        scheduled_time: isVisit ? input.scheduledTime : '12:00:00',
        reschedule_date: null,
        reschedule_time: null,
        contact_name: input.contactName || 'Carl Louise',
        contact_phone: input.contactPhone,
        contact_email: input.contactEmail ?? null,
        note: input.note?.trim() ? input.note.trim() : null,
        move_in_date: input.moveInDate ?? null,
        occupants: input.occupants ?? null,
        rejection_reason: null,
        decided_at: null,
        cancelled_at: null,
        created_at: now,
        updated_at: now,
      };
      
      await addBooking(booking);
      return ok(booking);
    }

    const property = await runQuery('Load property', () =>
      supabase
        .from('properties')
        .select('id, landlord_id, status, total_units, occupied_units')
        .eq('id', input.propertyId)
        .single(),
    );

    if (!property.ok) return property;
    if (property.data.status !== 'published') {
      return fail('This listing is not currently accepting requests.', 'listing_unavailable');
    }
    if (property.data.total_units <= property.data.occupied_units) {
      return fail('This property has no vacant units right now.', 'no_vacancy');
    }

    const isVisit = input.kind === 'visit';
    const payload: BookingInsert = {
      property_id: input.propertyId,
      requester_id: input.requesterId,
      landlord_id: property.data.landlord_id,
      kind: input.kind,
      scheduled_date: isVisit ? input.scheduledDate : input.moveInDate ?? input.scheduledDate,
      scheduled_time: isVisit ? input.scheduledTime : '12:00:00',
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      contact_email: input.contactEmail ?? null,
      note: input.note?.trim() ? input.note.trim() : null,
      move_in_date: input.moveInDate ?? null,
      occupants: input.occupants ?? null,
    };

    return runQuery('Send request', () =>
      supabase.from('bookings').insert(payload).select('*').single(),
    );
  },

  async listForUser(userId: string): Promise<Result<BookingWithProperty[]>> {
    if (DEMO_MODE) {
      const bookings = await getBookings();
      const userBookings = bookings.filter((b) => b.requester_id === userId);
      return ok(
        userBookings.map((b) => ({ booking: b, property: null, landlord: null, requester: null })),
      );
    }
    const bookings = await runQuery('Load bookings', () =>
      supabase
        .from('bookings')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false }),
    );
    if (!bookings.ok) return bookings;
    return hydrate(bookings.data);
  },

  async listForLandlord(landlordId: string): Promise<Result<BookingWithProperty[]>> {
    if (DEMO_MODE) {
      const bookings = await getBookings();
      const landlordBookings = bookings.filter((b) => b.landlord_id === landlordId);
      return ok(
        landlordBookings.map((b) => ({ booking: b, property: null, landlord: null, requester: null })),
      );
    }
    const bookings = await runQuery('Load requests', () =>
      supabase
        .from('bookings')
        .select('*')
        .eq('landlord_id', landlordId)
        .order('created_at', { ascending: false }),
    );
    if (!bookings.ok) return bookings;
    return hydrate(bookings.data);
  },

  async getById(bookingId: string, viewerId: string): Promise<Result<BookingWithProperty>> {
    if (DEMO_MODE) {
      const bookings = await getBookings();
      const b = bookings.find((x) => x.id === bookingId);
      if (!b) return fail('Booking not found.', 'not_found');
      return ok({ booking: b, property: null, landlord: null, requester: null });
    }

    const booking = await runOptionalQuery('Load booking', () =>
      supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle(),
    );
    if (!booking.ok) return booking;
    if (!booking.data) return fail('That request no longer exists.', 'not_found');

    if (booking.data.requester_id !== viewerId && booking.data.landlord_id !== viewerId) {
      return fail('You do not have access to this request.', 'forbidden');
    }

    const hydrated = await hydrate([booking.data]);
    if (!hydrated.ok) return hydrated;
    const first = hydrated.data[0];
    if (!first) return fail('That request no longer exists.', 'not_found');
    return ok(first);
  },

  setStatus: setBookingStatus,

  async cancel(bookingId: string): Promise<Result<BookingRow>> {
    if (DEMO_MODE) {
      const updated = await updateBooking(bookingId, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      });
      if (!updated) return fail('Booking not found.', 'not_found');
      return ok(updated);
    }
    return setBookingStatus(bookingId, 'cancelled');
  },

  async proposeReschedule(
    bookingId: string,
    date: string,
    time: string,
  ): Promise<Result<BookingRow>> {
    if (DEMO_MODE) {
      const updated = await updateBooking(bookingId, {
        reschedule_date: date,
        reschedule_time: time,
        status: 'pending',
      });
      if (!updated) return fail('Booking not found.', 'not_found');
      return ok(updated);
    }
    return runQuery('Propose new time', () =>
      supabase
        .from('bookings')
        .update({ reschedule_date: date, reschedule_time: time, status: 'pending' })
        .eq('id', bookingId)
        .select('*')
        .single(),
    );
  },

  async confirmReschedule(bookingId: string): Promise<Result<BookingRow>> {
    if (DEMO_MODE) {
      const bookings = await getBookings();
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return fail('Booking not found.', 'not_found');
      
      const date = booking.reschedule_date;
      const time = booking.reschedule_time;
      if (!date || !time) return fail('There is no proposed new time to accept.', 'no_reschedule');
      
      const updated = await updateBooking(bookingId, {
        scheduled_date: date,
        scheduled_time: time,
        reschedule_date: null,
        reschedule_time: null,
      });
      if (!updated) return fail('Booking not found.', 'not_found');
      return ok(updated);
    }
    const booking = await runQuery('Load booking', () =>
      supabase.from('bookings').select('*').eq('id', bookingId).single(),
    );
    if (!booking.ok) return booking;

    const date = booking.data.reschedule_date;
    const time = booking.data.reschedule_time;
    if (!date || !time) return fail('There is no proposed new time to accept.', 'no_reschedule');

    return runQuery('Confirm new time', () =>
      supabase
        .from('bookings')
        .update({
          scheduled_date: date,
          scheduled_time: time,
          reschedule_date: null,
          reschedule_time: null,
        })
        .eq('id', bookingId)
        .select('*')
        .single(),
    );
  },

  async hasActiveRequest(
    userId: string,
    propertyId: string,
  ): Promise<Result<BookingRow | null>> {
    if (DEMO_MODE) {
      const bookings = await getBookings();
      const active = bookings.find(
        (b) =>
          b.requester_id === userId &&
          b.property_id === propertyId &&
          (b.status === 'pending' || b.status === 'approved')
      );
      return ok(active ?? null);
    }
    return runOptionalQuery('Check existing request', () =>
      supabase
        .from('bookings')
        .select('*')
        .eq('requester_id', userId)
        .eq('property_id', propertyId)
        .in('status', ['pending', 'approved'])
        .maybeSingle(),
    );
  },

  async countForLandlord(landlordId: string): Promise<Result<number>> {
    if (DEMO_MODE) {
      const bookings = await getBookings();
      const count = bookings.filter(
        (b) => b.landlord_id === landlordId && b.status === 'pending'
      ).length;
      return ok(count);
    }
    return runCount('Count requests', () =>
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('landlord_id', landlordId)
        .eq('status', 'pending'),
    );
  },
};
