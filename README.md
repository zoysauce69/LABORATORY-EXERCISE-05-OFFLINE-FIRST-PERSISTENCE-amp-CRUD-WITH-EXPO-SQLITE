# RoomLink

Boarding houses and apartments for students and workers in the Philippines.
Renters find a place near their school or workplace and request a viewing or
apply to rent. Landlords publish listings and answer those requests.

There is **no chat**. Every inquiry between a renter and a landlord is a form:
a viewing request or an application, both of which live in the Bookings tab on
both sides.

## Stack

| Concern | Choice |
| --- | --- |
| Runtime | Expo SDK 57, React Native 0.86, React 19 |
| Navigation | Expo Router (file-based, typed route groups per role) |
| Language | TypeScript in `strict` mode, no `any` in app code |
| Backend | Supabase: Postgres, Auth, Storage, Row Level Security |
| Forms | React Hook Form + Zod |
| Media | `expo-image`, `expo-image-picker` |
| Notifications | `expo-notifications` for push, `notifications` table for in-app |
| Icons | `@expo/vector-icons` (Ionicons) |
| Dates | `date-fns` |

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in the two Supabase values
npm start
```

### Environment

Only `EXPO_PUBLIC_*` variables reach the client bundle, and the Supabase
**service_role key must never be among them.** The anon key is safe to ship:
Row Level Security is what protects the data, not the key.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Optional, for real driving distances — see `docs/LOCATION_SERVICE.md`:

```dotenv
EXPO_PUBLIC_DISTANCE_MODE=routes
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

Restart the dev server after editing env files; Expo inlines these at bundle
time.

Without credentials the app starts and shows an actionable setup message
instead of failing on the network layer.

### Database

Apply `supabase/migrations/` in filename order, create the three storage
buckets, and add the first admin by hand. `docs/DATABASE.md` has the details,
including how to review a landlord verification request.

```bash
npm run db:reset     # requires the Supabase CLI and a linked local project
```

### Running on a device

```bash
npm run android      # Android device or emulator over USB/ADB
npm run ios          # iOS simulator (macOS only)
npm run web          # browser
```

`npm run android` needs a running device or emulator; start one in Android
Studio, or confirm with `adb devices`, before running the script. The project
targets Expo SDK 57, so use the matching Expo Go build on a physical device.

`expo-notifications` cannot deliver remote push in Expo Go as of SDK 53. The app
degrades to in-app notifications backed by the `notifications` table, which is
populated by database triggers and works regardless of push delivery. Build a
development or production APK to exercise real push.

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

## Layout

```
app/                        routes
  _layout.tsx               providers, fonts, notification bootstrap
  index.tsx                 redirects by auth state and role
  (auth)/                   sign in, sign up, password reset
  booking/[id].tsx          booking detail for a renter
  (student)/                tabs + detail screens, students only
  (landlord)/               tabs + detail screens, landlords only
src/
  components/               shared UI; no data fetching unless the name says so
  constants/                Philippines locations, option lists, status labels
  hooks/                    async-data primitives plus per-feature hooks
  lib/                      Supabase client, config, Result type, DB types
  providers/                auth context
  services/                 one module per data domain
  theme/                    design tokens
  utils/                    formatting and Zod schemas
supabase/migrations/        0001 schema, 0002 RLS, 0003 functions, 0004 data
docs/                       DATABASE.md, LOCATION_SERVICE.md
```

### Conventions

- **Everything returns `Result<T>`.** `ok(...)` or `fail(message, code)` from
  `@/lib/errors`. No `throw` for expected failures, no swallowed errors, no
  pretending a write succeeded.
- **Data access lives in `src/services`.** Screens and components call services
  through hooks. Components never build a Supabase query inline.
- **Do not invent database columns.** Read `src/lib/database.types.ts` or the
  migration first. If a screen needs a field that does not exist, the schema
  needs changing, not the type assertion.
- **No `as never`, no `as unknown as Result`.** Widen the type at the boundary
  instead.
- **Never render a placeholder row.** If data failed to load, show the error and
  a retry. Re-fetch rather than displaying a stand-in.
- **Never fabricate a number.** A missing distance renders as no distance, not
  as zero. See `docs/LOCATION_SERVICE.md`.

## Security model in one paragraph

The client ships an anon key and nothing secret. Every read and write is subject
to RLS: users read and update only their own profile, students own their
favorites and bookings, landlords manage only their own listings and see only
requests against those listings, published properties are readable by anyone
including anonymous visitors, and cross-user roommate data is only reachable
through `SECURITY DEFINER` functions that return `null` for every field the
person has not consented to share. Role, verification status and `verified_at`
are guarded by a trigger, so no client code can escalate itself.

## Known limitations

- **Push notifications need a standalone build.** In Expo Go the app falls back
  to in-app notifications from the database.
- **Distances are approximate by default.** Straight-line unless you configure a
  routing provider; the UI says `approx.` when that is the case.
- **Verification documents are not readable by the client.** An admin signs a
  short-lived URL server-side. See `docs/DATABASE.md`.
- **No geocoding.** Listings and schools store coordinates the landlord or
  student supplies; RoomLink does not resolve address strings.