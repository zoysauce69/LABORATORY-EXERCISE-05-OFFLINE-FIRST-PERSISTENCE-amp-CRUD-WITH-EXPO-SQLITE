-- =============================================================================
-- RoomLink 0001 — core schema
--
-- Creates enums, tables, indexes, triggers and storage buckets.
-- RLS policies live in 0002. RPC functions live in 0003.
--
-- Run with:  supabase db push      (or paste into the SQL editor in order)
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('student', 'landlord');
create type public.property_type as enum ('boarding_house', 'apartment', 'studio', 'shared_room');
create type public.property_status as enum ('draft', 'published', 'unpublished', 'occupied');
create type public.booking_kind as enum ('visit', 'application');
create type public.booking_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.roommate_request_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.notification_type as enum (
  'booking_update',
  'roommate_request',
  'roommate_response',
  'listing_update',
  'verification_update',
  'system'
);

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles
--
-- Split in two tables on purpose:
--   * profiles                 -> every column here is safe to read publicly
--                                 (RLS still limits *which rows* are visible)
--   * profile_private_details  -> PII, readable only by the owner
--
-- This split is what lets us grant column-level read access without leaking a
-- user's phone number or email to anyone browsing listings.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'student',

  full_name text not null check (char_length(full_name) between 2 and 80),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 500),

  -- Landlord opted into being publicly listed.
  is_public boolean not null default false,
  public_phone text,
  public_email text,
  business_name text,

  -- Admin controlled. A client can never set these (see 0002 guard trigger).
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,

  notify_booking_updates boolean not null default true,
  notify_roommate_requests boolean not null default true,
  notify_listing_updates boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint public_phone_or_email_required check (
    is_public = false or public_phone is not null or public_email is not null
  )
);

create table public.profile_private_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text,
  phone text,
  address_line text,
  city text,
  barangay text,

  -- Anchor used by the "distance from school / workplace" filter.
  institution_name text,
  institution_kind text check (institution_kind is null or institution_kind in ('school', 'workplace')),
  institution_latitude double precision,
  institution_longitude double precision,

  emergency_contact_name text,
  emergency_contact_phone text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint institution_coords_pair check (
    (institution_latitude is null) = (institution_longitude is null)
  ),
  constraint latitude_range check (
    institution_latitude is null or institution_latitude between -90 and 90
  ),
  constraint longitude_range check (
    institution_longitude is null or institution_longitude between -180 and 180
  )
);

-- -----------------------------------------------------------------------------
-- admin_users
--
-- Verification is decided here. RLS is enabled with no policies, so only the
-- table owner (and therefore the SECURITY DEFINER helpers) can read it.
-- -----------------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- properties
-- -----------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles (id) on delete cascade,

  title text not null check (char_length(title) between 4 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  property_type public.property_type not null,

  monthly_rent numeric(10, 2) not null check (monthly_rent > 0),
  advance_amount numeric(10, 2) not null default 0 check (advance_amount >= 0),
  -- [{ "label": "Water", "amount": 150, "recurring": true, "note": null }]
  other_fees jsonb not null default '[]'::jsonb
    check (jsonb_typeof(other_fees) = 'array'),

  city text not null check (char_length(city) between 2 and 80),
  barangay text not null check (char_length(barangay) between 2 and 80),
  address_line text,
  landmark text,

  latitude double precision,
  longitude double precision,
  -- [{ "name": "UP Diliman", "latitude": 14.653, "longitude": 121.035 }]
  nearby_schools jsonb not null default '[]'::jsonb
    check (jsonb_typeof(nearby_schools) = 'array'),
  nearby_workplaces jsonb not null default '[]'::jsonb
    check (jsonb_typeof(nearby_workplaces) = 'array'),

  total_units integer not null default 1 check (total_units > 0 and total_units <= 500),
  occupied_units integer not null default 0 check (occupied_units >= 0),

  gender_preference text not null default 'any'
    check (gender_preference in ('any', 'female_only', 'male_only')),

  available_from date,
  status public.property_status not null default 'draft',
  is_featured boolean not null default false,
  virtual_tour_url text,

  view_count integer not null default 0 check (view_count >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint occupied_not_exceeding_total check (occupied_units <= total_units),
  constraint coords_pair check ((latitude is null) = (longitude is null)),
  constraint latitude_range check (latitude is null or latitude between -90 and 90),
  constraint longitude_range check (longitude is null or longitude between -180 and 180),
  -- A published listing needs enough content to be judged fairly.
  constraint published_needs_detail check (
    status <> 'published'
    or (
      char_length(description) >= 20
      and (landmark is not null or address_line is not null)
      and total_units > occupied_units
    )
  )
);

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  -- Object key inside the `property-images` bucket.
  storage_path text not null,
  -- False for seeded demo URLs, which live outside Supabase storage.
  is_uploaded boolean not null default true,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.amenities (
  id integer generated always as identity primary key,
  slug text not null unique,
  label text not null,
  icon text not null,
  sort_order integer not null default 0
);

create table public.property_amenities (
  property_id uuid not null references public.properties (id) on delete cascade,
  amenity_id integer not null references public.amenities (id) on delete cascade,
  primary key (property_id, amenity_id)
);

create table public.saved_properties (
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  -- Denormalised so RLS can authorise the landlord without a join.
  landlord_id uuid not null references public.profiles (id) on delete cascade,

  kind public.booking_kind not null,
  status public.booking_status not null default 'pending',

  scheduled_date date not null,
  scheduled_time time not null,
  -- Proposed by the landlord, awaiting the requester.
  reschedule_date date,
  reschedule_time time,

  contact_name text not null check (char_length(contact_name) between 2 and 80),
  contact_phone text not null check (char_length(contact_phone) between 6 and 32),
  contact_email text,

  -- A one-shot note captured on the form. Deliberately not a message thread.
  note text check (note is null or char_length(note) <= 1000),

  move_in_date date,
  occupants integer check (occupants is null or occupants between 1 and 20),

  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  decided_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reschedule_needs_both check (
    (reschedule_date is null and reschedule_time is null)
    or (reschedule_date is not null and reschedule_time is not null)
  ),
  constraint decided_bookings_have_timestamp check (
    status not in ('approved', 'rejected') or decided_at is not null
  ),
  constraint cancelled_bookings_have_timestamp check (
    status <> 'cancelled' or cancelled_at is not null
  ),
  constraint rejection_needs_reason check (
    status <> 'rejected' or (rejection_reason is not null and char_length(rejection_reason) > 0)
  )
);

create table public.roommate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,

  headline text check (headline is null or char_length(headline) <= 120),
  about text check (about is null or char_length(about) <= 800),
  occupation text check (occupation is null or char_length(occupation) <= 120),

  budget_min integer check (budget_min is null or budget_min >= 0),
  budget_max integer check (budget_max is null or budget_max >= 0),
  preferred_city text,
  preferred_barangay text,
  move_in_date date,

  -- 1 = spotless, 5 = relaxed
  cleanliness smallint not null default 3 check (cleanliness between 1 and 5),
  smoking_preference text not null default 'no_preference'
    check (smoking_preference in ('non_smoker', 'smoker', 'no_preference')),
  drinking_preference text not null default 'no_preference'
    check (drinking_preference in ('non_drinker', 'social', 'no_preference')),
  pets_preference text not null default 'no_preference'
    check (pets_preference in ('love_pets', 'no_pets', 'no_preference')),
  guests_preference text not null default 'no_preference'
    check (guests_preference in ('few_guests', 'no_guests', 'no_preference')),
  study_habits text not null default 'no_preference'
    check (study_habits in ('quiet_study', 'study_together', 'no_preference')),
  sleep_schedule text not null default 'flexible'
    check (sleep_schedule in ('early_bird', 'night_owl', 'flexible')),

  is_active boolean not null default true,
  -- Master switch for appearing in other people's results.
  discoverable boolean not null default true,

  -- Per-field consent. Only consented fields are ever returned to others.
  share_budget boolean not null default true,
  share_location boolean not null default true,
  share_move_in_date boolean not null default true,
  share_lifestyle boolean not null default true,
  share_occupation boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_range check (budget_max is null or budget_min is null or budget_max >= budget_min)
);

create table public.roommate_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,

  status public.roommate_request_status not null default 'pending',
  -- Short intro sent with the request. Not a conversation.
  message text check (message is null or char_length(message) <= 600),
  responded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint not_self_request check (sender_id <> receiver_id),
  constraint responded_has_timestamp check (
    status = 'pending' or responded_at is not null
  )
);

-- One outstanding request per direction between two people.
create unique index roommate_requests_pair_unique on public.roommate_requests (sender_id, receiver_id);
-- Receiving twice from the same person is not possible either.
create unique index roommate_requests_inbound_unique
  on public.roommate_requests (receiver_id, sender_id, status)
  where status in ('pending', 'accepted');

create table public.saved_roommate_profiles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  roommate_profile_id uuid not null references public.roommate_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, roommate_profile_id)
);

create table public.landlord_verification_requests (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles (id) on delete cascade,

  status public.verification_status not null default 'pending',

  full_legal_name text not null check (char_length(full_legal_name) between 2 and 120),
  address text not null check (char_length(address) between 4 and 300),
  id_type text not null check (id_type in ('philippine_id', 'passport', 'drivers_license', 'other')),
  -- Only the last four characters are stored. Full ID numbers must never be kept.
  id_number_last4 text not null check (char_length(id_number_last4) between 2 and 4),
  -- Lives in a private bucket with a signed-URL-only read policy.
  document_storage_path text,
  submitted_notes text check (submitted_notes is null or char_length(submitted_notes) <= 1000),

  reviewer_id uuid references public.profiles (id) on delete set null,
  review_notes text check (review_notes is null or char_length(review_notes) <= 1000),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A landlord can only have one request in review at a time.
create unique index verification_one_pending_per_landlord
  on public.landlord_verification_requests (landlord_id)
  where status = 'pending';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'unknown')),
  created_at timestamptz not null default now()
);

create table public.property_views (
  id bigint generated always as identity primary key,
  property_id uuid not null references public.properties (id) on delete cascade,
  viewer_id uuid references public.profiles (id) on delete set null,
  viewed_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index properties_landlord_idx on public.properties (landlord_id);
create index properties_status_created_idx on public.properties (status, created_at desc);
create index properties_type_idx on public.properties (property_type);
create index properties_rent_idx on public.properties (monthly_rent);
create index properties_city_idx on public.properties (lower(city));
create index properties_barangay_idx on public.properties (lower(barangay));
create index properties_featured_idx on public.properties (is_featured) where is_featured;

create index property_images_property_idx on public.property_images (property_id, sort_order);
create index property_amenities_amenity_idx on public.property_amenities (amenity_id);

create index saved_properties_user_idx on public.saved_properties (user_id, created_at desc);
create index saved_roommates_user_idx on public.saved_roommate_profiles (user_id, created_at desc);

create index bookings_requester_idx on public.bookings (requester_id, created_at desc);
create index bookings_landlord_idx on public.bookings (landlord_id, status, created_at desc);
create index bookings_property_idx on public.bookings (property_id);
create index bookings_scheduled_idx on public.bookings (property_id, scheduled_date, scheduled_time)
  where status in ('pending', 'approved');

-- A user cannot hold two live requests of the same kind on the same property.
create unique index bookings_no_active_duplicate
  on public.bookings (property_id, requester_id, kind)
  where status in ('pending', 'approved');

create index roommate_profiles_discoverable_idx
  on public.roommate_profiles (is_active, discoverable);
create index roommate_profiles_city_idx on public.roommate_profiles (preferred_city);
create index roommate_requests_receiver_idx
  on public.roommate_requests (receiver_id, status, created_at desc);
create index roommate_requests_sender_idx
  on public.roommate_requests (sender_id, status, created_at desc);

create index verification_landlord_idx on public.landlord_verification_requests (landlord_id, created_at desc);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index push_tokens_user_idx on public.push_tokens (user_id);
create index property_views_property_idx on public.property_views (property_id, viewed_at desc);

-- -----------------------------------------------------------------------------
-- Trigger wiring
-- -----------------------------------------------------------------------------
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger profile_private_details_set_updated_at before update on public.profile_private_details
  for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create trigger roommate_profiles_set_updated_at before update on public.roommate_profiles
  for each row execute function public.set_updated_at();
create trigger roommate_requests_set_updated_at before update on public.roommate_requests
  for each row execute function public.set_updated_at();
create trigger verification_set_updated_at before update on public.landlord_verification_requests
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Storage buckets
--   property-images         public read, landlord-scoped write
--   verification-documents  private: no public read, admins only via signed URL
--   avatars                 public read, owner write
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;