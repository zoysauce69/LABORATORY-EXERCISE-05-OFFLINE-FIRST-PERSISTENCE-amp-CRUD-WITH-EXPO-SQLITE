# Database setup

Supabase project settings, migration order, and the manual steps that cannot be
automated.

## Order matters

Apply the files in `supabase/migrations/` in filename order:

| File | What it does |
| --- | --- |
| `20260101000001_core_schema.sql` | Tables, enums, constraints, indexes, triggers on `auth.users`. |
| `20260101000002_row_level_security.sql` | Enables RLS everywhere and writes the policies. |
| `20260101000003_functions.sql` | RPCs, notification triggers, helper functions. |
| `20260101000004_reference_data.sql` | Amenity catalogue. The slugs are a contract with `src/constants/options.ts`. |

There is no `supabase/config.toml` in this repository, so the local flow is:

```bash
npm run db:reset          # supabase db reset, if you have the CLI linked
```

or, against a hosted project, paste each file into the SQL editor in the order
above. Editing an already-applied migration is not safe — write a new numbered
file instead.

## Storage buckets

Create these three buckets in **Storage**. The names must match
`storageBuckets` in `src/lib/supabase.ts`.

| Bucket | Public | Purpose |
| --- | --- | --- |
| `property-images` | Public | Listing photos. |
| `avatars` | Public | Profile pictures. |
| `verification-documents` | **Private** | Landlord ID scans. Never grant a public read policy on this one. |

Upload policies are written in migration `0002` and are scoped to
`<auth uid>/...` object paths, so a user can only write inside their own folder.

## Admin accounts

`admin_users` has **no INSERT policy on purpose** — a user must never be able to
promote themselves. Insert the row once, by hand, from the SQL editor:

```sql
-- 1. Create the user through Authentication -> Users first, then copy its id.
insert into public.admin_users (user_id, notes)
values ('<auth.users.id>', 'founder');
```

`public.is_admin(uuid)` reads this table, and it gates:

- reading other users' `profiles` and `profile_private_details`,
- reading and editing any landlord's listings,
- the pending-verification review queue.

## Verification review

Landlord verification is deliberately one-directional. The app can submit and
display a request but cannot decide one. Deciding requires
`admin_review_verification`, which:

1. refuses unless `is_admin(auth.uid())`,
2. refuses when `target.landlord_id = auth.uid()`, so an admin cannot verify
   themselves,
3. refuses when the request is not `pending`, so a decision cannot be changed,
4. writes `verification_status` and `verified_at` through
   `set_verification_status`, which re-checks the admin flag,
5. notifies the landlord.

### Reviewing a request

```sql
select
  id,
  landlord_id,
  full_legal_name,
  id_type,
  id_number_last4,        -- only the last 4 characters were ever stored
  document_storage_path,
  submitted_notes,
  created_at
from public.landlord_verification_requests
where status = 'pending'
order by created_at;
```

Read the document through a **signed URL issued by the service role**; the
bucket has no client read path:

```ts
const { data } = await supabaseAdmin.storage
  .from('verification-documents')
  .createSignedUrl(path, 300); // five minutes is plenty for a review
```

Then decide:

```sql
select public.admin_review_verification(
  '<request id>',
  'verified',                        -- or 'rejected'
  'PhilSys ID matches the submitted name.'  -- shown verbatim to the landlord
);
```

The app calls the same RPC from `verificationService.review`, so an admin using
a client built on this schema gets identical behaviour.

## What a client can never do

These are enforced by policies and triggers, not by the app:

| Attempt | Result |
| --- | --- |
| Student updates another profile | Policy `profiles_update_own` uses `id = auth.uid()` |
| Client sets its own `role` | `guard_profile_privileged_columns` raises `42501` |
| Client sets its own `verification_status` | Same trigger |
| Landlord edits someone else's listing | `properties_update_own` uses `landlord_id = auth.uid()` |
| Landlord reads a booking on another landlord's property | `bookings_select_participants` only matches the two participants |
| Landlord reads a roommate profile without consent | `search_roommates` returns `null` for every unshared field |
| One student reads another's phone number | `profile_private_details` has no policy other than owner and admin |
| Anonymous user reads a draft listing | `properties_select_published` requires `status = 'published'` |

Because the anon key is safe to ship, the only thing standing between a curious
user and someone else's data is RLS. Test it before shipping by calling the API
with the anon key and confirming the response is empty or scoped.