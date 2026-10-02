-- =============================================================================
-- RoomLink 0003 — triggers and RPC functions
--
-- Contains:
--   * handle_new_user            — profile provisioning on signup
--   * haversine_km               — straight-line distance
--   * search_properties          — the single query behind Home and Search
--   * record_property_view       — view tracking
--   * landlord_dashboard_stats   — landlord dashboard numbers
--   * roommate_match_reasons     — consent-aware compatibility explanation
--   * search_roommates           — consent-gated roommate browse
--   * saved_roommate_profiles    — saved roommate profiles
--   * notify / set_booking_status— status changes fan out to notifications
--   * admin_review_verification  — the only path to a Verified badge
--   * delete_my_account          — account deletion
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Provision a profile the moment a user signs up.
-- The role comes from signup metadata and is validated here; it can never be
-- changed afterwards (see guard_profile_privileged_columns in 0002).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  resolved_role public.user_role;
  resolved_name text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'student');
  resolved_role := case when requested_role = 'landlord' then 'landlord'::public.user_role
                        else 'student'::public.user_role end;

  resolved_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1),
    'RoomLink user'
  );

  insert into public.profiles (id, role, full_name)
  values (new.id, resolved_role, left(resolved_name, 80))
  on conflict (id) do nothing;

  insert into public.profile_private_details (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Straight-line distance. Straight line is not a driving or walking route; the
-- UI labels it "approx." and never claims GPS verification.
-- -----------------------------------------------------------------------------
create or replace function public.haversine_km(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
)
returns double precision
language sql
immutable
as $$
  select 2 * 6371.0088 * asin(
    least(1.0, sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2))
      * power(sin(radians(lon2 - lon1) / 2), 2)
    ))
  );
$$;

-- -----------------------------------------------------------------------------
-- Bookings: keep landlord_id consistent and block double-booked viewings.
-- -----------------------------------------------------------------------------
create or replace function public.guard_booking_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actual_landlord uuid;
  conflicting uuid;
begin
  select landlord_id into actual_landlord
  from public.properties where id = new.property_id;

  if actual_landlord is null then
    raise exception 'Property does not exist.' using errcode = '23503';
  end if;

  if new.landlord_id is distinct from actual_landlord then
    raise exception 'landlord_id must match the property owner.' using errcode = '42501';
  end if;

  if new.requester_id = actual_landlord then
    raise exception 'You cannot book your own property.' using errcode = '42501';
  end if;

  -- One live visit per property per slot.
  if new.kind = 'visit' and new.status in ('pending', 'approved') then
    select b.id into conflicting
    from public.bookings b
    where b.property_id = new.property_id
      and b.kind = 'visit'
      and b.status in ('pending', 'approved')
      and b.scheduled_date = new.scheduled_date
      and b.scheduled_time = new.scheduled_time
      and (tg_op = 'INSERT' or b.id <> new.id)
    limit 1;

    if conflicting is not null then
      raise exception 'This property already has a viewing scheduled at that date and time.'
        using errcode = '23P01';
    end if;
  end if;

  return new;
end;
$$;

create trigger bookings_guard_consistency
  before insert or update on public.bookings
  for each row execute function public.guard_booking_consistency();

-- A visit cannot be booked in the past.
create or replace function public.guard_booking_schedule()
returns trigger
language plpgsql
as $$
begin
  if new.scheduled_date < current_date then
    raise exception 'Choose a date that is today or later.' using errcode = '22007';
  end if;
  return new;
end;
$$;

create trigger bookings_guard_schedule
  before insert or update on public.bookings
  for each row execute function public.guard_booking_schedule();

-- -----------------------------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------------------------
create or replace function public.notify(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  prefs public.profiles%rowtype;
begin
  if p_user_id is null or auth.uid() is null then
    return;
  end if;

  -- A user must be allowed to receive this category, and must not be notifying
  -- themselves.
  select * into prefs from public.profiles where id = p_user_id;

  if prefs.id is null or prefs.id = auth.uid() then
    return;
  end if;

  if p_type = 'booking_update' and not prefs.notify_booking_updates then return; end if;
  if p_type in ('roommate_request', 'roommate_response') and not prefs.notify_roommate_requests then return; end if;
  if p_type = 'listing_update' and not prefs.notify_listing_updates then return; end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (p_user_id, p_type, left(p_title, 120), left(p_body, 500), coalesce(p_data, '{}'::jsonb));
end;
$$;

grant execute on function public.notify(uuid, public.notification_type, text, text, jsonb)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Search
--
-- One function backs Home, Search and Saved. Rows are limited by RLS, so an
-- anonymous caller only ever sees published listings.
-- -----------------------------------------------------------------------------
create or replace function public.search_properties(
  p_search text default null,
  p_city text default null,
  p_barangay text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_property_types public.property_type[] default null,
  p_amenity_ids integer[] default null,
  p_available_only boolean default true,
  p_near_latitude double precision default null,
  p_near_longitude double precision default null,
  p_near_name text default null,
  p_max_distance_km double precision default null,
  p_landlord_id uuid default null,
  p_include_drafts boolean default false,
  p_sort text default 'recent',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  property_type public.property_type,
  monthly_rent numeric,
  advance_amount numeric,
  city text,
  barangay text,
  landmark text,
  latitude double precision,
  longitude double precision,
  total_units integer,
  occupied_units integer,
  status public.property_status,
  is_featured boolean,
  view_count integer,
  created_at timestamptz,
  landlord_id uuid,
  landlord_name text,
  landlord_verified boolean,
  landlord_avatar_url text,
  cover_image_path text,
  cover_is_uploaded boolean,
  amenity_ids integer[],
  amenities jsonb,
  distance_km double precision,
  distance_source text,
  available_units integer
)
language sql
stable
as $$
with base as (
  select
    p.*,
    prof.full_name as landlord_name,
    (prof.verification_status = 'verified') as landlord_verified,
    prof.avatar_url as landlord_avatar_url,
    public.haversine_km(p.latitude, p.longitude, p_near_latitude, p_near_longitude) as distance_km
  from public.properties p
  join public.profiles prof on prof.id = p.landlord_id
  where
    -- text match across the fields a person would actually search by
    (p_search is null or p_search = '' or
      p.title ilike '%' || p_search || '%'
      or p.city ilike '%' || p_search || '%'
      or p.barangay ilike '%' || p_search || '%'
      or p.landmark ilike '%' || p_search || '%'
      or p.description ilike '%' || p_search || '%'
      or exists (
        select 1 from jsonb_array_elements(p.nearby_schools) s
        where s ->> 'name' ilike '%' || p_search || '%'
      )
      or exists (
        select 1 from jsonb_array_elements(p.nearby_workplaces) w
        where w ->> 'name' ilike '%' || p_search || '%'
      )
    )
    and (p_city is null or lower(p.city) = lower(p_city))
    and (p_barangay is null or lower(p.barangay) = lower(p_barangay))
    and (p_min_price is null or p.monthly_rent >= p_min_price)
    and (p_max_price is null or p.monthly_rent <= p_max_price)
    and (
      p_property_types is null
      or cardinality(p_property_types) = 0
      or p.property_type = any(p_property_types)
    )
    and (not coalesce(p_available_only, true) or p.total_units > p.occupied_units)
    and (
      p_near_latitude is null or p_near_longitude is null
      or (p.latitude is not null and p.longitude is not null)
    )
    and (
      p_max_distance_km is null
      or (p.latitude is null or p.longitude is null)
      or public.haversine_km(p.latitude, p.longitude, p_near_latitude, p_near_longitude) <= p_max_distance_km
    )
    and (p_landlord_id is null or p.landlord_id = p_landlord_id)
    and (
      not coalesce(p_include_drafts, false)
      or p.landlord_id = auth.uid()
      or public.is_admin(auth.uid())
    )
    -- ALL requested amenities must be present.
    and (
      p_amenity_ids is null
      or cardinality(p_amenity_ids) = 0
      or not exists (
        select 1
        from unnest(p_amenity_ids) as required(amenity_id)
        where not exists (
          select 1 from public.property_amenities pa
          where pa.property_id = p.id and pa.amenity_id = required.amenity_id
        )
      )
    )
)
select
  b.id,
  b.title,
  b.property_type,
  b.monthly_rent,
  b.advance_amount,
  b.city,
  b.barangay,
  b.landmark,
  b.latitude,
  b.longitude,
  b.total_units,
  b.occupied_units,
  b.status,
  b.is_featured,
  b.view_count,
  b.created_at,
  b.landlord_id,
  b.landlord_name,
  b.landlord_verified,
  b.landlord_avatar_url,
  cover.storage_path,
  cover.is_uploaded,
  coalesce(am.amenity_ids, '{}'::integer[]),
  coalesce(am.amenities, '[]'::jsonb),
  -- Only report a distance when the caller gave us a reference point AND the
  -- property has coordinates. Otherwise null, never a made-up number.
  case
    when p_near_latitude is not null and p_near_longitude is not null
      and b.latitude is not null and b.longitude is not null
    then round(b.distance_km::numeric, 3)::double precision
    else null
  end as distance_km,
  case
    when p_near_latitude is not null and p_near_longitude is not null
      and b.latitude is not null and b.longitude is not null
    then 'straightline'
    else null
  end as distance_source,
  (b.total_units - b.occupied_units) as available_units
from base b
left join lateral (
  select pi.storage_path, pi.is_uploaded
  from public.property_images pi
  where pi.property_id = b.id
  order by pi.sort_order asc, pi.created_at asc
  limit 1
) cover on true
left join lateral (
  select
    array_agg(a.id order by a.sort_order, a.id) as amenity_ids,
    jsonb_agg(jsonb_build_object('id', a.id, 'slug', a.slug, 'label', a.label, 'icon', a.icon)) as amenities
  from public.property_amenities pa
  join public.amenities a on a.id = pa.amenity_id
  where pa.property_id = b.id
) am on true
order by
  case when p_sort = 'price_asc' then b.monthly_rent end asc nulls last,
  case when p_sort = 'price_desc' then b.monthly_rent end desc nulls last,
  case when p_sort = 'distance' then b.distance_km end asc nulls last,
  b.is_featured desc,
  b.created_at desc,
  b.id
limit greatest(1, least(coalesce(p_limit, 20), 100))
offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.search_properties(
  text, text, text, numeric, numeric, public.property_type[], integer[], boolean,
  double precision, double precision, text, double precision, uuid, boolean, text, integer, integer
) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- View tracking
-- -----------------------------------------------------------------------------
create or replace function public.record_property_view(p_property_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.property_views (property_id, viewer_id)
    values (p_property_id, auth.uid())
    returning 1
  )
  update public.properties p
  set view_count = p.view_count + 1
  where p.id = p_property_id
  returning p.view_count;
$$;

grant execute on function public.record_property_view(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Landlord dashboard
-- -----------------------------------------------------------------------------
create or replace function public.landlord_dashboard_stats()
returns table (
  total_listings integer,
  published_listings integer,
  draft_listings integer,
  occupied_listings integer,
  total_units integer,
  available_units integer,
  occupied_units integer,
  pending_bookings integer,
  approved_bookings integer,
  rejected_bookings integer,
  cancelled_bookings integer,
  total_views integer,
  pending_verification boolean,
  verification_status public.verification_status
)
language sql
stable
security definer
set search_path = public
as $$
with listings as (
  select
    count(*)::int as total,
    count(*) filter (where status = 'published')::int as published,
    count(*) filter (where status = 'draft')::int as drafts,
    count(*) filter (where status = 'occupied')::int as occupied,
    coalesce(sum(total_units), 0)::int as units,
    coalesce(sum(total_units - occupied_units), 0)::int as available,
    coalesce(sum(occupied_units), 0)::int as taken,
    coalesce(sum(view_count), 0)::int as views
  from public.properties
  where landlord_id = auth.uid()
),
bookings as (
  select
    count(*) filter (where status = 'pending')::int as pending,
    count(*) filter (where status = 'approved')::int as approved,
    count(*) filter (where status = 'rejected')::int as rejected,
    count(*) filter (where status = 'cancelled')::int as cancelled
  from public.bookings
  where landlord_id = auth.uid()
),
verification as (
  select
    coalesce(bool_or(v.status = 'pending'), false) as has_pending,
    coalesce(
      (select p.verification_status from public.profiles p where p.id = auth.uid()),
      'pending'::public.verification_status
    ) as status
  from public.landlord_verification_requests v
  where v.landlord_id = auth.uid()
)
select
  l.total, l.published, l.drafts, l.occupied,
  l.units, l.available, l.taken,
  b.pending, b.approved, b.rejected, b.cancelled,
  l.views,
  v.has_pending,
  v.status
from listings l, bookings b, verification v;
$$;

grant execute on function public.landlord_dashboard_stats() to authenticated;

-- -----------------------------------------------------------------------------
-- Roommate matching
--
-- A field is only ever returned when the OWNER of that roommate profile
-- consented to share it. `viewer` consent is irrelevant: you cannot opt into
-- seeing what someone else kept private.
-- -----------------------------------------------------------------------------
create or replace function public.roommate_match_reasons(
  mine public.roommate_profiles,
  theirs public.roommate_profiles
)
returns jsonb
language plpgsql
stable
as $$
declare
  reasons jsonb := '[]'::jsonb;
  their_city text;
  their_move_in date;
begin
  -- Budget
  if theirs.share_budget and mine.budget_max is not null and theirs.budget_max is not null then
    if theirs.budget_max >= mine.budget_min and theirs.budget_min <= mine.budget_max then
      reasons := reasons || jsonb_build_array(jsonb_build_object(
        'label', 'Budget overlap',
        'detail', 'Your ranges both include a shared monthly rent.',
        'kind', 'match'
      ));
    else
      reasons := reasons || jsonb_build_array(jsonb_build_object(
        'label', 'Different budgets',
        'detail', 'Your budget ranges do not overlap.',
        'kind', 'difference'
      ));
    end if;
  end if;

  -- Location
  if theirs.share_location then
    their_city := theirs.preferred_city;
    if their_city is not null and lower(their_city) = lower(coalesce(mine.preferred_city, '')) then
      reasons := reasons || jsonb_build_array(jsonb_build_object(
        'label', 'Same city',
        'detail', format('Both looking around %s.', their_city),
        'kind', 'match'
      ));
    end if;
  end if;

  -- Move-in date
  if theirs.share_move_in_date then
    their_move_in := theirs.move_in_date;
    if their_move_in is not null and mine.move_in_date is not null then
      if abs(their_move_in - mine.move_in_date) <= 30 then
        reasons := reasons || jsonb_build_array(jsonb_build_object(
          'label', 'Similar move-in date',
          'detail', 'Within a month of each other.',
          'kind', 'match'
        ));
      elsif abs(their_move_in - mine.move_in_date) <= 90 then
        reasons := reasons || jsonb_build_array(jsonb_build_object(
          'label', 'Move-in dates are close',
          'detail', 'Within three months of each other.',
          'kind', 'near'
        ));
      end if;
    end if;
  end if;

  -- Lifestyle
  if theirs.share_lifestyle then
    if mine.smoking_preference = 'non_smoker' and theirs.smoking_preference = 'smoker' then
      reasons := reasons || jsonb_build_array(jsonb_build_object(
        'label', 'Smoking mismatch',
        'detail', 'You need a non-smoker household.',
        'kind', 'difference'
      ));
    elsif mine.smoking_preference <> 'no_preference' and theirs.smoking_preference <> 'no_preference' then
      reasons := reasons || jsonb_build_array(jsonb_build_object(
        'label', 'Smoking preference aligns',
        'detail', 'Your smoking preferences are compatible.',
        'kind', 'match'
      ));
    end if;

    if abs(mine.cleanliness - theirs.cleanliness) <= 1 then
      reasons := reasons || jsonb_build_array(jsonb_build_object(
        'label', 'Similar tidiness',
        'detail', 'Your cleanliness expectations line up.',
        'kind', 'match'
      ));
    elsif abs(mine.cleanliness - theirs.cleanliness) >= 3 then
      reasons := reasons || jsonb_build_array(jsonb_build_object(
        'label', 'Different tidiness',
        'detail', 'Expectations about cleaning are far apart.',
        'kind', 'difference'
      ));
    end if;

    if mine.sleep_schedule = theirs.sleep_schedule then
      reasons := reasons || jsonb_build_array(jsonb_build_object(
        'label', 'Same sleep schedule',
        'detail', 'You are on a similar daily routine.',
        'kind', 'match'
      ));
    end if;

    if mine.pets_preference = 'no_pets' and theirs.pets_preference = 'love_pets' then
      reasons := reasons || jsonb_build_array(jsonb_build_object(
        'label', 'Pets mismatch',
        'detail', 'You prefer no pets and they have or want pets.',
        'kind', 'difference'
      ));
    end if;

    if mine.guests_preference = 'no_guests' and theirs.guests_preference = 'few_guests' then
      reasons := reasons || jsonb_build_array(jsonb_build_object(
        'label', 'Guest expectations differ',
        'detail', 'They expect occasional guests.',
        'kind', 'difference'
      ));
    end if;

    if mine.study_habits <> 'no_preference' and mine.study_habits = theirs.study_habits then
      reasons := reasons || jsonb_build_array(jsonb_build_object(
        'label', 'Study habits align',
        'detail', 'You both prefer studying the same way.',
        'kind', 'match'
      ));
    end if;
  end if;

  return reasons;
end;
$$;

-- -----------------------------------------------------------------------------
-- Consent-gated roommate browse
-- -----------------------------------------------------------------------------
create or replace function public.search_roommates(
  p_query text default null,
  p_city text default null,
  p_min_budget integer default null,
  p_max_budget integer default null,
  p_move_in_before date default null,
  p_user_id uuid default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  roommate_profile_id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  headline text,
  about text,
  occupation text,
  budget_min integer,
  budget_max integer,
  preferred_city text,
  preferred_barangay text,
  move_in_date date,
  cleanliness smallint,
  smoking_preference text,
  drinking_preference text,
  pets_preference text,
  guests_preference text,
  study_habits text,
  sleep_schedule text,
  compatibility_score integer,
  match_reasons jsonb,
  request_status public.roommate_request_status,
  is_saved boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  mine public.roommate_profiles%rowtype;
  row_result record;
begin
  if auth.uid() is null then
    return;
  end if;

  select * into mine from public.roommate_profiles where user_id = auth.uid();
  if mine.id is null or not mine.is_active then
    return;
  end if;

  for row_result in
    select
      rp.id as profile_id,
      rp.user_id as uid,
      p.full_name,
      p.avatar_url,
      rp.headline,
      rp.about,
      case when rp.share_occupation then rp.occupation else null end as occupation,
      case when rp.share_budget then rp.budget_min else null end as budget_min,
      case when rp.share_budget then rp.budget_max else null end as budget_max,
      case when rp.share_location then rp.preferred_city else null end as preferred_city,
      case when rp.share_location then rp.preferred_barangay else null end as preferred_barangay,
      case when rp.share_move_in_date then rp.move_in_date else null end as move_in_date,
      case when rp.share_lifestyle then rp.cleanliness else null end as cleanliness,
      case when rp.share_lifestyle then rp.smoking_preference else null end as smoking_preference,
      case when rp.share_lifestyle then rp.drinking_preference else null end as drinking_preference,
      case when rp.share_lifestyle then rp.pets_preference else null end as pets_preference,
      case when rp.share_lifestyle then rp.guests_preference else null end as guests_preference,
      case when rp.share_lifestyle then rp.study_habits else null end as study_habits,
      case when rp.share_lifestyle then rp.sleep_schedule else null end as sleep_schedule,
      public.roommate_match_reasons(mine, rp) as reasons,
      (
        select rr.status from public.roommate_requests rr
        where (rr.sender_id = auth.uid() and rr.receiver_id = rp.user_id)
           or (rr.receiver_id = auth.uid() and rr.sender_id = rp.user_id)
        order by rr.created_at desc
        limit 1
      ) as req_status,
      exists (
        select 1 from public.saved_roommate_profiles srp
        where srp.user_id = auth.uid() and srp.roommate_profile_id = rp.id
      ) as saved
    from public.roommate_profiles rp
    join public.profiles p on p.id = rp.user_id
    where rp.user_id <> auth.uid()
      and rp.is_active
      and rp.discoverable
      and (p_query is null or p_query = ''
           or p.full_name ilike '%' || p_query || '%'
           or rp.headline ilike '%' || p_query || '%'
           or rp.about ilike '%' || p_query || '%')
      and (p_city is null or rp.preferred_city is null or lower(rp.preferred_city) = lower(p_city))
      and (p_max_budget is null or rp.budget_max is null or rp.budget_max <= p_max_budget)
      and (p_min_budget is null or rp.budget_min is null or rp.budget_min >= p_min_budget)
      and (p_move_in_before is null or rp.move_in_date is null or rp.move_in_date <= p_move_in_before)
      -- Single-person lookup for the detail screen. It still runs through the
      -- same consent projection, so there is no wider read path behind it.
      and (p_user_id is null or rp.user_id = p_user_id)
    order by
      case
        when mine.preferred_city is not null and lower(rp.preferred_city) = lower(mine.preferred_city) then 0
        else 1
      end,
      abs(coalesce(rp.budget_max, 0) - coalesce(mine.budget_max, 0)),
      rp.created_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    offset greatest(0, coalesce(p_offset, 0))
  loop
    roommate_profile_id := row_result.profile_id;
    user_id := row_result.uid;
    full_name := row_result.full_name;
    avatar_url := row_result.avatar_url;
    headline := row_result.headline;
    about := row_result.about;
    occupation := row_result.occupation;
    budget_min := row_result.budget_min;
    budget_max := row_result.budget_max;
    preferred_city := row_result.preferred_city;
    preferred_barangay := row_result.preferred_barangay;
    move_in_date := row_result.move_in_date;
    cleanliness := row_result.cleanliness;
    smoking_preference := row_result.smoking_preference;
    drinking_preference := row_result.drinking_preference;
    pets_preference := row_result.pets_preference;
    guests_preference := row_result.guests_preference;
    study_habits := row_result.study_habits;
    sleep_schedule := row_result.sleep_schedule;
    match_reasons := row_result.reasons;
    request_status := row_result.req_status;
    is_saved := row_result.saved;

    -- 0-100 score derived only from the reasons above.
    compatibility_score := least(100,
      100
      - (select count(*) from jsonb_array_elements(coalesce(row_result.reasons, '[]'::jsonb)) e
         where (e ->> 'kind') = 'difference') * 20
      + (select least(count(*), 5) from jsonb_array_elements(coalesce(row_result.reasons, '[]'::jsonb)) e
         where (e ->> 'kind') = 'match') * 5
    );

    return next;
  end loop;
end;
$$;

grant execute on function public.search_roommates(text, text, integer, integer, date, uuid, integer, integer)
  to authenticated;

-- -----------------------------------------------------------------------------
-- Saved roommate profiles
--
-- Reuses the same consent projection as search_roommates, then narrows it to the
-- rows the viewer has actually saved.
-- -----------------------------------------------------------------------------
create or replace function public.saved_roommate_profiles()
returns table (
  roommate_profile_id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  headline text,
  about text,
  occupation text,
  budget_min integer,
  budget_max integer,
  preferred_city text,
  preferred_barangay text,
  move_in_date date,
  cleanliness smallint,
  smoking_preference text,
  drinking_preference text,
  pets_preference text,
  guests_preference text,
  study_habits text,
  sleep_schedule text,
  compatibility_score integer,
  match_reasons jsonb,
  request_status public.roommate_request_status,
  is_saved boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with saved as (
    select srp.roommate_profile_id
    from public.saved_roommate_profiles srp
    where srp.user_id = auth.uid()
  ),
  matches as (
    select * from public.search_roommates(null, null, null, null, null, null, 100, 0)
  )
  select
    m.roommate_profile_id,
    m.user_id,
    m.full_name,
    m.avatar_url,
    m.headline,
    m.about,
    m.occupation,
    m.budget_min,
    m.budget_max,
    m.preferred_city,
    m.preferred_barangay,
    m.move_in_date,
    m.cleanliness,
    m.smoking_preference,
    m.drinking_preference,
    m.pets_preference,
    m.guests_preference,
    m.study_habits,
    m.sleep_schedule,
    m.compatibility_score,
    m.match_reasons,
    m.request_status,
    true as is_saved
  from matches m
  join saved s on s.roommate_profile_id = m.roommate_profile_id
  order by m.compatibility_score desc, m.full_name asc;
$$;

grant execute on function public.saved_roommate_profiles() to authenticated;

-- -----------------------------------------------------------------------------
-- Booking status transitions
--
-- Centralised so status, timestamps, notifications and the rejection-reason
-- requirement can never drift apart.
-- -----------------------------------------------------------------------------
create or replace function public.set_booking_status(
  p_booking_id uuid,
  p_status public.booking_status,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  current public.bookings%rowtype;
  updated public.bookings%rowtype;
  property_title text;
  requester_name text;
begin
  select * into current from public.bookings where id = p_booking_id for update;
  if current.id is null then
    raise exception 'Booking not found.' using errcode = 'PGRST116';
  end if;

  if auth.uid() is not distinct from current.requester_id
     and auth.uid() is not distinct from current.landlord_id then
    raise exception 'You cannot manage this booking.' using errcode = '42501';
  end if;

  if auth.uid() is distinct from current.landlord_id
     and auth.uid() is distinct from current.requester_id then
    raise exception 'You do not have access to this booking.' using errcode = '42501';
  end if;

  -- Only a landlord may approve or reject.
  if p_status in ('approved', 'rejected') and auth.uid() is distinct from current.landlord_id then
    raise exception 'Only the landlord can decide this request.' using errcode = '42501';
  end if;

  if p_status = 'rejected' and (p_reason is null or char_length(trim(p_reason)) = 0) then
    raise exception 'Please give a reason so the applicant understands.' using errcode = '22023';
  end if;

  -- Cancellation windows: a request can be withdrawn while it is still pending.
  if p_status = 'cancelled' and current.status <> 'pending' then
    raise exception 'Only a pending request can be cancelled.' using errcode = '22023';
  end if;

  if current.status in ('cancelled', 'rejected') and p_status <> 'cancelled' then
    raise exception 'This request is already closed.' using errcode = '22023';
  end if;

  update public.bookings
  set status = p_status,
      rejection_reason = case when p_status = 'rejected' then left(p_reason, 500) else rejection_reason end,
      decided_at = case when p_status in ('approved', 'rejected') then now() else decided_at end,
      cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
  where id = p_booking_id
  returning * into updated;

  select title into property_title from public.properties where id = updated.property_id;
  select full_name into requester_name from public.profiles where id = updated.requester_id;

  if p_status = 'approved' then
    perform public.notify(updated.requester_id, 'booking_update',
      'Request approved',
      format('Your request for %s was approved.', property_title),
      jsonb_build_object('booking_id', updated.id, 'property_id', updated.property_id));

    perform public.notify(updated.landlord_id, 'booking_update',
      'New approved booking',
      format('%s was approved for %s.', requester_name, property_title),
      jsonb_build_object('booking_id', updated.id, 'property_id', updated.property_id));

  elsif p_status = 'rejected' then
    perform public.notify(updated.requester_id, 'booking_update',
      'Request not accepted',
      format('Your request for %s was declined: %s', property_title, left(p_reason, 200)),
      jsonb_build_object('booking_id', updated.id, 'property_id', updated.property_id));

    perform public.notify(updated.landlord_id, 'booking_update',
      'Request declined',
      format('You declined the request from %s for %s.', requester_name, property_title),
      jsonb_build_object('booking_id', updated.id, 'property_id', updated.property_id));

  elsif p_status = 'cancelled' then
    perform public.notify(updated.landlord_id, 'booking_update',
      'Booking cancelled',
      format('%s cancelled their request for %s.', requester_name, property_title),
      jsonb_build_object('booking_id', updated.id, 'property_id', updated.property_id));

    perform public.notify(updated.requester_id, 'booking_update',
      'Booking cancelled',
      format('Your request for %s was cancelled.', property_title),
      jsonb_build_object('booking_id', updated.id, 'property_id', updated.property_id));
  end if;

  return updated;
end;
$$;

grant execute on function public.set_booking_status(uuid, public.booking_status, text)
  to authenticated;

-- -----------------------------------------------------------------------------
-- Notification triggers
--
-- set_booking_status() covers decisions. These cover the paths where a row is
-- inserted directly, so the landlord and the applicant are always informed.
-- -----------------------------------------------------------------------------
create or replace function public.on_booking_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  property_title text;
  requester_name text;
  scheduled text;
begin
  select title into property_title from public.properties where id = new.property_id;
  select full_name into requester_name from public.profiles where id = new.requester_id;
  scheduled := to_char(new.scheduled_date, 'DD Mon YYYY') || ' at '
               || to_char(new.scheduled_time, 'HH12:MI AM');

  perform public.notify(new.landlord_id, 'booking_update',
    case when new.kind = 'visit' then 'New viewing request'
         else 'New rental application' end,
    format('%s requested %s for %s on %s.',
      requester_name,
      case when new.kind = 'visit' then 'a visit' else 'a room' end,
      property_title, scheduled),
    jsonb_build_object('booking_id', new.id, 'property_id', new.property_id));

  return new;
end;
$$;

create trigger bookings_notify_on_create
  after insert on public.bookings
  for each row execute function public.on_booking_created();

create or replace function public.on_roommate_request_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  select full_name into sender_name from public.profiles where id = new.sender_id;

  perform public.notify(new.receiver_id, 'roommate_request',
    'New roommate request',
    format('%s would like to be your roommate.', sender_name),
    jsonb_build_object('request_id', new.id, 'sender_id', new.sender_id));

  return new;
end;
$$;

create trigger roommate_requests_notify_on_create
  after insert on public.roommate_requests
  for each row execute function public.on_roommate_request_created();

create or replace function public.on_roommate_request_responded()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  receiver_name text;
begin
  if new.status = 'pending' then
    return new;
  end if;

  select full_name into receiver_name from public.profiles where id = new.receiver_id;

  perform public.notify(new.sender_id, 'roommate_response',
    case when new.status = 'accepted' then 'Roommate request accepted'
         when new.status = 'declined' then 'Roommate request declined'
         else 'Roommate request withdrawn' end,
    format('%s %s your roommate request.',
      receiver_name,
      case when new.status = 'accepted' then 'accepted'
           when new.status = 'declined' then 'declined'
           else 'withdrew' end),
    jsonb_build_object('request_id', new.id, 'status', new.status));

  return new;
end;
$$;

create trigger roommate_requests_notify_on_respond
  after update on public.roommate_requests
  for each row execute function public.on_roommate_request_responded();

-- -----------------------------------------------------------------------------
-- Verification status writer.
--
-- Defined before the review function that calls it so there is no forward
-- reference. SECURITY DEFINER because `verification_status` and `verified_at`
-- are admin-only columns guarded by the trigger in 0002.
-- -----------------------------------------------------------------------------
create or replace function public.set_verification_status(
  p_landlord_id uuid,
  p_status public.verification_status,
  p_reviewer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(p_reviewer_id) then
    raise exception 'Only an administrator can set verification status.' using errcode = '42501';
  end if;

  update public.profiles
  set verification_status = p_status,
      verified_at = case when p_status = 'verified' then now() else null end
  where id = p_landlord_id and role = 'landlord';
end;
$$;

revoke all on function public.set_verification_status(uuid, public.verification_status, uuid) from public;
grant execute on function public.set_verification_status(uuid, public.verification_status, uuid)
  to service_role;

-- -----------------------------------------------------------------------------
-- Verification review — the only path to a Verified badge.
-- -----------------------------------------------------------------------------
create or replace function public.admin_review_verification(
  p_request_id uuid,
  p_decision public.verification_status,
  p_notes text default null
)
returns public.landlord_verification_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.landlord_verification_requests%rowtype;
  updated_row public.landlord_verification_requests%rowtype;
begin
  if p_decision not in ('verified', 'rejected') then
    raise exception 'Decision must be verified or rejected.' using errcode = '22023';
  end if;

  if not public.is_admin(auth.uid()) then
    raise exception 'Only an administrator can review verification requests.'
      using errcode = '42501';
  end if;

  select * into target from public.landlord_verification_requests where id = p_request_id for update;
  if target.id is null then
    raise exception 'Verification request not found.' using errcode = 'PGRST116';
  end if;

  -- Self-approval is impossible even for an admin account.
  if target.landlord_id = auth.uid() then
    raise exception 'You cannot review your own verification request.' using errcode = '42501';
  end if;

  if target.status <> 'pending' then
    raise exception 'This request has already been reviewed.' using errcode = '22023';
  end if;

  update public.landlord_verification_requests
  set status = p_decision,
      reviewer_id = auth.uid(),
      review_notes = p_notes,
      reviewed_at = now()
  where id = p_request_id
  returning * into updated_row;

  -- Promote or demote the profile. The admin check inside the guard trigger in
  -- 0002 already allows this write because the caller is an administrator, and
  -- `set_verification_status` re-checks it as defence in depth.
  perform public.set_verification_status(target.landlord_id, p_decision, auth.uid());

  perform public.notify(target.landlord_id, 'verification_update',
    case when p_decision = 'verified' then 'You are verified'
         else 'Verification was not approved' end,
    case when p_decision = 'verified'
         then 'Your Verified Landlord badge is now visible on your listings.'
         else coalesce('Reviewer notes: ' || left(p_notes, 200), 'Please resubmit with correct details.') end,
    jsonb_build_object('request_id', updated_row.id, 'status', p_decision));

  return updated_row;
end;
$$;

grant execute on function public.admin_review_verification(uuid, public.verification_status, text)
  to authenticated;

-- -----------------------------------------------------------------------------
-- Account deletion
--
-- Removes storage objects then the auth user, which cascades through profiles,
-- properties, bookings and roommate data.
-- -----------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in.' using errcode = '42501';
  end if;

  delete from storage.objects
  where bucket_id in ('property-images', 'avatars', 'verification-documents')
    and (storage.foldername(name))[1] = uid::text;

  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;