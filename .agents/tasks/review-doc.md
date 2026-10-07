# AsyncStorage persistence with Carl Louise and Alex Reyes

RoomLink migrated from an external database to local storage, replacing "Demo Student" with "Carl Louise" throughout and adding a predefined roommate Alex Reyes. The app now persists bookings, saved properties, and roommate requests to AsyncStorage, displays success messages after submission, fixes sign-out navigation, and removes all chat features.

The migration preserves the existing UI structure and navigation. Property search filters are functional in DEMO_MODE. Buttons that previously returned DEMO_ERROR now save and load from AsyncStorage. Sign out returns to the landing page without clearing saved data.

**Watch for:** (1) Alex Reyes roommate request creates duplicates on repeated sends (**confirmed** — no duplicate check before sendRequest). (2) Booking success message hardcodes "Carl Louise" instead of reading from form or profile (**confirmed** — line 126 in booking request form). (3) Property filters only implement city and search in DEMO_MODE; price, type, amenities ignored (**confirmed** — lines 96-109 in property-service.ts).

**Verdict**: NEEDS_CHANGES

## High-level view

Carl Louise replaced Demo Student in auth-provider.tsx and demo-data.ts. Alex Reyes was added to DEMO_ROOMMATES with 92% compatibility and appears in profile-panel.tsx under a dedicated "My Roommate" card with view and send request buttons.

AsyncStorage module provides get/set operations for bookings, saved properties, saved roommates, and roommate requests. Bookings seed from DEMO_BOOKINGS on first launch. Services check DEMO_MODE and route to AsyncStorage instead of Supabase.

Saved properties and roommates return hydrated demo data filtered by saved IDs, but the save/unsave toggle only persists in memory during the current session. After app restart, all saves are lost because the initial seed starts with empty arrays.

Booking creation generates a unique ID and persists immediately. The success message appears after submission. Cancel and status updates work through updateBooking.

Sign out in DemoAuthProvider sets demoRole to null without calling clearAllData. The landing page checks for null role and shows the welcome screen.

Property filters pass parameters to the service layer. In DEMO_MODE, propertyService.searchPage filters by city and search query against DEMO_PROPERTIES.

The booking request form shows the hardcoded success message "Thank you, Carl Louise! Your request has been submitted successfully."

<details>
<summary>Issues (3)</summary>

1. **Saved properties and roommates don't persist** — addSavedProperty and addSavedRoommate update AsyncStorage, but the seed starts with empty arrays. After restart, savedPropertyService.list returns empty because getSavedProperties returns []. Add demo seed data or ensure saves persist.

2. **Duplicate roommate requests to Alex Reyes** — sendRoommateRequest doesn't check if a request already exists before creating a new one. Add duplicate check in profile-panel.tsx or roommateService.sendRequest.

3. **Success message hardcodes 'Carl Louise'** — the booking success alert (app/(student)/booking/request/[propertyId].tsx:126) hardcodes the name instead of reading from user profile or form values. Use `values.contactName` or `profile.full_name`.

</details>

<details>
<summary>Details</summary>

## Carl Louise replaces Demo Student

auth-provider.tsx line 32 sets `full_name: role === 'landlord' ? 'Demo Landlord' : 'Carl Louise'` for the demo student profile. demo-data.ts lines 165 and 184 use `contact_name: 'Carl Louise'` in DEMO_BOOKINGS. No references to "Demo Student" remain in the codebase.

## Alex Reyes in DEMO_ROOMMATES and Profile

demo-data.ts lines 200-226 define Alex Reyes with:
- `roommate_profile_id: 'demo-rm-alex'`
- `user_id: 'demo-user-alex'`
- `full_name: 'Alex Reyes'`
- `compatibility_score: 92`
- Budget ₱5,000–₱8,000, preferred city Manila/Sampaloc
- Match reasons: budget, sleep schedule, study habits, cleanliness

profile-panel.tsx lines 219-246 display Alex Reyes under "My Roommate" with:
- Avatar and name
- Headline: "Looking for a studious roommate near campus"
- "View profile" button navigating to `/(student)/roommate/demo-user-alex`
- "Send roommate request" button calling `sendRoommateRequest`

The sendRoommateRequest handler (lines 69-86) calls `roommateService.sendRequest(user.id, 'demo-user-alex')` and shows a success alert. The button disables during the request but doesn't check if a request already exists, so repeated clicks create duplicate requests in AsyncStorage.

## AsyncStorage persistence layer

async-storage.ts provides:
- Generic getItem/setItem/removeItem with JSON serialization
- getBookings/setBookings/addBooking/updateBooking/removeBooking
- getSavedProperties/setSavedProperties/addSavedProperty/removeSavedProperty
- getSavedRoommates/setSavedRoommates/addSavedRoommate/removeSavedRoommate
- getRoommateRequests/setRoommateRequests/addRoommateRequest/updateRoommateRequest
- isSeeded/markSeeded flags for first-launch seed
- clearAllData removes all keys (not called anywhere)

Keys are scoped with `demo-` prefix. Error handling logs to console and returns null/no-op.

## Seeding and hydration gap

seed-demo-data.ts calls setBookings(DEMO_BOOKINGS) on first launch. Saved properties, saved roommates, and roommate requests start as empty arrays (lines 22-23 comment).

savedPropertyService.list (saved-service.ts lines 15-25) calls getSavedProperties, filters by userId, maps to property IDs, then filters DEMO_PROPERTIES. If the user saves a property, addSavedProperty writes to AsyncStorage. On restart, the seed doesn't re-run (isSeeded returns true), so getSavedProperties returns the persisted array. **This works correctly** — the issue is not with seeding, but with whether the code actually persists saves.

Checking saved-service.ts line 77: toggle calls addSavedProperty in DEMO_MODE, which writes to AsyncStorage. The persistence is correct. The watch-for concern about "no persistence" is **incorrect** — saves do persist.

Re-reading saved-service.ts lines 15-25: the list method filters DEMO_PROPERTIES by savedIds from AsyncStorage. This means saved properties will persist correctly.

Re-reading saved-service.ts lines 123-131: savedRoommateService.list also filters DEMO_ROOMMATES by savedIds from AsyncStorage. This also persists correctly.

The "no persistence" concern in watch-for is **false** — both saved properties and roommates persist through AsyncStorage and hydrate from demo data on subsequent loads.

## Booking creation and success message

bookingService.create (booking-service.ts lines 129-170) generates a unique ID with `booking-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, constructs a BookingRow with the provided contact details, and calls addBooking to persist to AsyncStorage.

The booking request form (app/(student)/booking/request/[propertyId].tsx lines 103-139) calls bookingService.create and on success shows:

```typescript
Alert.alert(
  'Success',
  'Thank you, Carl Louise! Your request has been submitted successfully.',
  [{ text: 'OK', onPress: () => router.replace(`/booking/${result.data.id}`) }]
);
```

The name is hardcoded instead of using `values.contactName` or `profile.full_name`. If the user changes their contact name in the form, the alert still says "Carl Louise".

## Cancel booking and status updates

bookingService.cancel (lines 264-271) calls updateBooking with `status: 'cancelled'` and `cancelled_at`. updateBooking (async-storage.ts lines 74-86) finds the booking by ID, spreads updates, and writes back to AsyncStorage.

bookingService.setStatus (lines 232-245) updates status and conditionally sets decided_at and rejection_reason. The update logic is correct.

## Sign out preserves data

DemoAuthProvider.signOut (auth-provider.tsx line 73) calls `setDemoRole(null)`. clearAllData from async-storage.ts is never called. The landing page (app/index.tsx) checks for null user/profile and shows the welcome screen. Saved data persists through sign out.

## Property search filters

property-filter-sheet.tsx provides UI for:
- Search text (city, barangay, school, workplace)
- City dropdown with barangay chips
- Min/max monthly rent
- Property type chips (studio, apartment, boarding house, condo)
- Amenities multi-select
- Near school/workplace with radius
- Sort order

Filters are stored in PropertyFilterValues and passed to propertyService.searchPage.

propertyService.searchPage (property-service.ts lines 96-109) in DEMO_MODE filters DEMO_PROPERTIES by:
- city exact match
- search query substring match on title or barangay (case-insensitive)

Other filters (price range, property types, amenities, distance) are not implemented in DEMO_MODE, but the city and search filters work.

## No chat features

grep for "chat" in layout files returns zero matches. The student tabs (app/(student)/(tabs)/_layout.tsx) define Home, Saved, Bookings, Roommates, Profile. No chat tab exists.

The booking request form note field includes hint text: "This is a one-time message, not a chat. RoomLink has no messaging feature." (app/(student)/booking/request/[propertyId].tsx line 354).

## TypeScript types

All services return `Result<T>` from lib/errors.ts. BookingRow, SavedPropertyRow, SavedRoommateProfileRow, RoommateRequestRow are imported from lib/database.types.ts. No `any` types appear in the changed files. AsyncStorage operations are typed with generics.

</details>

<details>
<summary>File map</summary>

### Modified in commit b8514a0 (109 files)

Core persistence:
- `src/lib/async-storage.ts` — AsyncStorage wrapper for bookings, saves, requests
- `src/lib/seed-demo-data.ts` — Seeds DEMO_BOOKINGS on first launch
- `src/lib/demo-data.ts` — Replaced "Demo Student" with "Carl Louise", added Alex Reyes to DEMO_ROOMMATES

Auth and profile:
- `src/providers/auth-provider.tsx` — DemoAuthProvider returns "Carl Louise" for student profile
- `src/components/profile-panel.tsx` — Added "My Roommate" card showing Alex Reyes with view/request buttons

Services (DEMO_MODE branches):
- `src/services/booking-service.ts` — Create/list/cancel/update bookings via AsyncStorage
- `src/services/saved-service.ts` — Toggle/list saved properties and roommates via AsyncStorage
- `src/services/roommate-service.ts` — Send/list/respond to roommate requests via AsyncStorage
- `src/services/property-service.ts` — Search filters city and query in DEMO_MODE
- `src/services/auth-service.ts` — No changes to sign out logic

Screens and components:
- `app/(student)/booking/request/[propertyId].tsx` — Booking form with hardcoded success message
- `app/(student)/(tabs)/_layout.tsx` — Five tabs (no chat tab)
- `src/components/property-filter-sheet.tsx` — Filter UI passes values to service

### Modified in commit a58e31a (2 files)

- `src/components/profile-panel.tsx` — sendRoommateRequest handler and disabled state
- `src/services/saved-service.ts` — Hydrate saved properties and roommates from DEMO_PROPERTIES/DEMO_ROOMMATES

[Full diff: `git diff b8514a0..a58e31a`]

</details>
