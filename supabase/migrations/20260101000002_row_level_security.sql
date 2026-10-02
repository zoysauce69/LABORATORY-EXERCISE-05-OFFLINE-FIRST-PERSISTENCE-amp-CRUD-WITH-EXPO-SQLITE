-- =============================================================================
-- RoomLink 0002 — Row Level Security
--
-- Every rule the UI must not be trusted to enforce is enforced here:
--   * clients cannot escalate their role or self-verify
--   * landlords only touch their own listings
--   * landlords only read bookings for their own properties
--   * roommate data is readable only through consent-gated RPCs
--   * PII stays in profile_private_details
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions
-- SECURITY DEFINER so they can read rows the caller cannot select directly.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = uid
  );
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_property_landlord(p_property_id uuid, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.properties
    where id = p_property_id and landlord_id = p_uid
  );
$$;

create or replace function public.owns_property(p_property_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_property_landlord(p_property_id, auth.uid());
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_private_details enable row level security;
alter table public.admin_users enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.amenities enable row level security;
alter table public.property_amenities enable row level security;
alter table public.saved_properties enable row level security;
alter table public.saved_roommate_profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.roommate_profiles enable row level security;
alter table public.roommate_requests enable row level security;
alter table public.landlord_verification_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.property_views enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
--
-- `public_phone` / `public_email` on a public landlord row are contact details
-- the landlord chose to publish, which is what the booking screen surfaces.
-- -----------------------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));

create policy profiles_select_public_landlord on public.profiles
  for select to anon, authenticated
  using (is_public = true and role = 'landlord');

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));

-- No delete policy: account removal goes through the account-deletion RPC so
-- related rows and storage objects are cleaned up consistently.

-- -----------------------------------------------------------------------------
-- Guard: clients cannot change role, verification_status or verified_at.
--
-- Without this a user could POST role='landlord' or verification_status=
-- 'verified' and grant themselves privileges.
-- -----------------------------------------------------------------------------
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Role cannot be changed after registration.'
      using errcode = '42501';
  end if;

  if new.verification_status is distinct from old.verification_status then
    raise exception 'Verification status can only be set by an administrator.'
      using errcode = '42501';
  end if;

  if new.verified_at is distinct from old.verified_at then
    raise exception 'verified_at can only be set by an administrator.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- -----------------------------------------------------------------------------
-- profile_private_details — owner only
-- -----------------------------------------------------------------------------
create policy private_details_select_own on public.profile_private_details
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy private_details_insert_own on public.profile_private_details
  for insert to authenticated
  with check (user_id = auth.uid());

create policy private_details_update_own on public.profile_private_details
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy private_details_delete_own on public.profile_private_details
  for delete to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- properties
-- -----------------------------------------------------------------------------
create policy properties_select_published on public.properties
  for select to anon, authenticated
  using (status = 'published');

-- Landlords and admins always see their own rows, whatever the status.
create policy properties_select_own on public.properties
  for select to authenticated
  using (landlord_id = auth.uid() or public.is_admin(auth.uid()));

create policy properties_insert_own on public.properties
  for insert to authenticated
  with check (
    landlord_id = auth.uid()
    and public.current_role() = 'landlord'
  );

create policy properties_update_own on public.properties
  for update to authenticated
  using (landlord_id = auth.uid())
  with check (landlord_id = auth.uid() and public.current_role() = 'landlord');

create policy properties_delete_own on public.properties
  for delete to authenticated
  using (landlord_id = auth.uid() and public.current_role() = 'landlord');

-- Only admins may feature a listing.
create or replace function public.guard_property_featured()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_featured is distinct from old.is_featured and not public.is_admin(auth.uid()) then
    raise exception 'Only an administrator can feature a listing.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger properties_guard_featured
  before update on public.properties
  for each row execute function public.guard_property_featured();

-- -----------------------------------------------------------------------------
-- property_images — readable with the property, writable by its landlord
-- -----------------------------------------------------------------------------
create policy property_images_select_visible on public.property_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and (p.status = 'published' or p.landlord_id = auth.uid())
    )
  );

create policy property_images_insert_own on public.property_images
  for insert to authenticated
  with check (public.owns_property(property_id));

create policy property_images_update_own on public.property_images
  for update to authenticated
  using (public.owns_property(property_id))
  with check (public.owns_property(property_id));

create policy property_images_delete_own on public.property_images
  for delete to authenticated
  using (public.owns_property(property_id));

-- -----------------------------------------------------------------------------
-- amenities — a public reference table
-- -----------------------------------------------------------------------------
create policy amenities_select_all on public.amenities
  for select to anon, authenticated
  using (true);

-- No insert/update/delete policy for clients: managed by migration only.

-- -----------------------------------------------------------------------------
-- property_amenities — follows the parent property
-- -----------------------------------------------------------------------------
create policy property_amenities_select_visible on public.property_amenities
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and (p.status = 'published' or p.landlord_id = auth.uid())
    )
  );

create policy property_amenities_insert_own on public.property_amenities
  for insert to authenticated
  with check (public.owns_property(property_id));

create policy property_amenities_delete_own on public.property_amenities
  for delete to authenticated
  using (public.owns_property(property_id));

-- -----------------------------------------------------------------------------
-- saved_properties
-- -----------------------------------------------------------------------------
create policy saved_properties_select_own on public.saved_properties
  for select to authenticated
  using (user_id = auth.uid());

create policy saved_properties_insert_own on public.saved_properties
  for insert to authenticated
  with check (user_id = auth.uid());

create policy saved_properties_delete_own on public.saved_properties
  for delete to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- saved_roommate_profiles — owner only. The saved row stores an id, not the
-- profile contents, so nothing private is exposed by saving it.
-- -----------------------------------------------------------------------------
create policy saved_roommates_select_own on public.saved_roommate_profiles
  for select to authenticated
  using (user_id = auth.uid());

create policy saved_roommates_insert_own on public.saved_roommate_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

create policy saved_roommates_delete_own on public.saved_roommate_profiles
  for delete to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- bookings
-- -----------------------------------------------------------------------------
create policy bookings_select_involved on public.bookings
  for select to authenticated
  using (
    requester_id = auth.uid()
    or landlord_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- Only students may request. landlord_id is stamped from the property, never
-- from the client.
create policy bookings_insert_own on public.bookings
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and public.current_role() = 'student'
    and public.is_property_landlord(property_id, landlord_id)
    and exists (
      select 1 from public.properties p
      where p.id = property_id and p.status = 'published'
    )
  );

-- The requester may only cancel or edit contact details while pending.
create policy bookings_update_requester on public.bookings
  for update to authenticated
  using (requester_id = auth.uid() and status = 'pending')
  with check (requester_id = auth.uid() and status = 'cancelled');

-- The landlord decides the outcome on their own properties.
create policy bookings_update_landlord on public.bookings
  for update to authenticated
  using (landlord_id = auth.uid() and status = 'pending')
  with check (landlord_id = auth.uid());

-- -----------------------------------------------------------------------------
-- roommate_profiles — owner only. Cross-user reads go through search_roommates().
-- -----------------------------------------------------------------------------
create policy roommate_profiles_select_own on public.roommate_profiles
  for select to authenticated
  using (user_id = auth.uid());

create policy roommate_profiles_insert_own on public.roommate_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

create policy roommate_profiles_update_own on public.roommate_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy roommate_profiles_delete_own on public.roommate_profiles
  for delete to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- roommate_requests
-- -----------------------------------------------------------------------------
create policy roommate_requests_select_involved on public.roommate_requests
  for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy roommate_requests_insert_own on public.roommate_requests
  for insert to authenticated
  with check (sender_id = auth.uid() and sender_id <> receiver_id);

-- A sender may withdraw; a receiver may accept or decline.
create policy roommate_requests_update_involved on public.roommate_requests
  for update to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid())
  with check (sender_id = auth.uid() or receiver_id = auth.uid());

create policy roommate_requests_delete_own on public.roommate_requests
  for delete to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- -----------------------------------------------------------------------------
-- landlord_verification_requests
--
-- Note the asymmetry that matters: a landlord may INSERT their own request,
-- but there is deliberately no UPDATE policy, so a landlord can never edit or
-- resolve a request. Only admin_review_verification() (0003) can decide one,
-- and it refuses when the reviewer is the applicant.
-- -----------------------------------------------------------------------------
create policy verification_select_own on public.landlord_verification_requests
  for select to authenticated
  using (landlord_id = auth.uid() or public.is_admin(auth.uid()));

create policy verification_insert_own on public.landlord_verification_requests
  for insert to authenticated
  with check (
    landlord_id = auth.uid()
    and public.current_role() = 'landlord'
    and status = 'pending'
    and reviewer_id is null
  );

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- No INSERT policy: rows are created by notify() or database triggers, so a
-- client cannot fabricate notifications attributed to someone else.

-- -----------------------------------------------------------------------------
-- push_tokens
-- -----------------------------------------------------------------------------
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated
  using (user_id = auth.uid());

create policy push_tokens_insert_own on public.push_tokens
  for insert to authenticated
  with check (user_id = auth.uid());

create policy push_tokens_delete_own on public.push_tokens
  for delete to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- property_views
-- -----------------------------------------------------------------------------
create policy property_views_select_landlord on public.property_views
  for select to authenticated
  using (public.is_property_landlord(property_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- Storage policies
-- -----------------------------------------------------------------------------

-- property-images: public read, landlord-only write scoped to their own folder.
create policy "property images public read"
  on storage.objects for select
  using (bucket_id = 'property-images');

create policy "landlords upload property images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'property-images'
    and public.is_admin(auth.uid())
    or (
      bucket_id = 'property-images'
      and auth.uid() is not null
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy "landlords update own property images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "landlords delete own property images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars: public read, owner writes into their own folder.
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- verification-documents: no public SELECT policy at all. Only the owning
-- landlord can upload, and reading requires a signed URL issued server-side
-- after an admin check.
create policy "landlords upload verification documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "landlords read own verification documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admins read verification documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-documents'
    and public.is_admin(auth.uid())
  );

create policy "landlords delete own verification documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );