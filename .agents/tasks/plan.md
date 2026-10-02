# Implementation Plan

## Overview
Transform RoomLink to use AsyncStorage for all data persistence instead of Supabase, with DEMO_MODE=true. Replace 'Demo Student' with 'Carl Louise', add predefined roommate Alex Reyes, make booking/rental requests functional with success messages, fix sign out, remove chat features, and ensure all buttons work.

## Key Findings from Exploration

- **DEMO_MODE is already true** in src/lib/config.ts
- **DemoAuthProvider exists** in src/providers/auth-provider.tsx and uses makeDemoProfile
- **All services have DEMO_MODE guards** that return DEMO_ERROR for write operations
- **Demo data exists** in src/lib/demo-data.ts with DEMO_PROPERTIES, DEMO_BOOKINGS, DEMO_ROOMMATES
- **No chat features found** - only references are hints explaining "no messaging feature"
- **Sign out already works** - DemoAuthProvider.signOut calls setDemoRole(null), app/index.tsx redirects to /(auth)/sign-in when !user
- **AsyncStorage is installed** - @react-native-async-storage/async-storage@3.1.1 in package.json
- **Student tabs**: Home, Saved, Bookings, Roommates, Profile (app/(student)/(tabs)/_layout.tsx)
- **Test command**: `npm test` (Jest with jest-expo preset)
- **Build command**: `npm run typecheck` for validation

---

- [ ] 1. Replace 'Demo Student' with 'Carl Louise' throughout the codebase.
      Update auth-provider.tsx makeDemoProfile function, demo-data.ts DEMO_BOOKINGS contact_name fields, and search for any other occurrences.
      Files: src/providers/auth-provider.tsx, src/lib/demo-data.ts
      Verify: `npm run typecheck` passes, then search codebase for "Demo Student" returns no results.

- [ ] 2. Add predefined roommate Alex Reyes to demo data.
      Add a new entry to DEMO_ROOMMATES in demo-data.ts with user_id 'demo-user-alex', full_name 'Alex Reyes', headline about being a reliable roommate, appropriate preferences, and high compatibility_score.
      Files: src/lib/demo-data.ts
      Verify: `npm run typecheck` passes.

- [ ] 3. Create AsyncStorage utility module for persisting app data.
      Create src/lib/async-storage.ts with typed get/set/remove functions for bookings, saved properties, saved roommates, roommate requests, and first-launch flag. Use JSON serialization with error handling.
      Files: src/lib/async-storage.ts (new file)
      Verify: `npm run typecheck` passes and no TypeScript errors.

- [ ] 4. Seed AsyncStorage with demo data on first launch.
      Create src/lib/seed-demo-data.ts that checks for a 'demo-seeded' flag in AsyncStorage. If not present, write DEMO_PROPERTIES, DEMO_BOOKINGS, and DEMO_ROOMMATES to AsyncStorage and set the flag. Call this from app/_layout.tsx on mount.
      Files: src/lib/seed-demo-data.ts (new file), app/_layout.tsx
      Verify: `npm run typecheck` passes. Manual test: fresh install shows seeded data.

- [ ] 5. Make bookingService.create functional in DEMO_MODE with AsyncStorage persistence.
      Replace the DEMO_ERROR return in booking-service.ts create method with logic that generates a synthetic BookingRow with uuid id, saves to AsyncStorage 'demo-bookings' key (appending to existing array), and returns ok(row). Use 'Carl Louise' for contact_name by default.
      Files: src/services/booking-service.ts
      Verify: `npm run typecheck` passes. Manual test: submit a booking request and verify it appears in bookings list after restart.

- [ ] 6. Update bookingService.listForUser to read from AsyncStorage in DEMO_MODE.
      Replace the hardcoded DEMO_BOOKINGS return with a read from AsyncStorage 'demo-bookings' key, filtering by requester_id === userId.
      Files: src/services/booking-service.ts
      Verify: `npm run typecheck` passes. Manual test: created bookings appear in the Bookings tab.

- [ ] 7. Add success message after booking submission.
      In app/(student)/booking/request/[propertyId].tsx onSubmit handler, after successful bookingService.create, show Alert with message "Thank you, Carl Louise! Your request has been submitted successfully." before navigating to the booking detail.
      Files: app/(student)/booking/request/[propertyId].tsx
      Verify: `npm run typecheck` passes. Manual test: submit booking shows success message.

- [ ] 8. Make savedPropertyService.toggle functional in DEMO_MODE with AsyncStorage.
      Replace DEMO_ERROR returns in saved-service.ts with AsyncStorage reads/writes to 'demo-saved-properties' key. Store array of {user_id, property_id} objects. Update list, isSaved, toggle, remove, and count methods.
      Files: src/services/saved-service.ts
      Verify: `npm run typecheck` passes. Manual test: save a property, restart app, verify it's still saved.

- [ ] 9. Make propertyService.searchPage filter properly in DEMO_MODE.
      The existing DEMO_MODE code in property-service.ts searchPage already filters by city and search text. Verify this works and enhance search to also check landmark field.
      Files: src/services/property-service.ts
      Verify: `npm run typecheck` passes. Manual test: search by city and text filters results correctly.

- [ ] 10. Display predefined roommate Alex Reyes in Profile screen under "My Roommate" card.
       Modify src/components/profile-panel.tsx to add a new Card after the "Roommates" card for students. Display "My Roommate" heading, show Alex Reyes with avatar (can be null), and add buttons "View Profile" (navigate to roommate detail) and "Send Request".
       Files: src/components/profile-panel.tsx
       Verify: `npm run typecheck` passes. Manual test: Profile tab shows Alex Reyes card with buttons.

- [ ] 11. Make roommateService.sendRequest functional in DEMO_MODE with AsyncStorage.
       Replace DEMO_ERROR in roommate-service.ts sendRequest with logic to generate synthetic RoommateRequestRow, save to AsyncStorage 'demo-roommate-requests', and return ok(row). Update listRequests to read from AsyncStorage.
       Files: src/services/roommate-service.ts
       Verify: `npm run typecheck` passes. Manual test: send roommate request to Alex Reyes, verify it persists.

- [ ] 12. Make all other booking operations functional in DEMO_MODE.
       Update bookingService methods cancel, setStatus, proposeReschedule, confirmReschedule to read from AsyncStorage, update the record, write back, and return the updated row instead of DEMO_ERROR.
       Files: src/services/booking-service.ts
       Verify: `npm run typecheck` passes. Manual test: approve/reject/cancel bookings work and persist.

- [ ] 13. Verify sign out functionality returns to landing page without deleting data.
       Test that DemoAuthProvider.signOut (which calls setDemoRole(null)) causes app/index.tsx to redirect to /(auth)/sign-in (the RoomLink landing/welcome page). Confirm AsyncStorage data persists after sign out and sign back in.
       Files: (no changes needed, verification only)
       Verify: Manual test: sign out returns to welcome screen, sign back in shows saved data still present.

- [ ] 14. Remove any chat-related UI elements and imports.
       Grep for 'chat' references and confirm they are only hint text explaining no chat exists. No tab bar items or screens for chat were found. Document that chat is already absent.
       Files: (no changes expected based on exploration)
       Verify: `npm run typecheck` passes. Grep confirms no chat screens or navigation items.

- [ ] 15. Audit and fix all buttons in booking and roommate screens.
       Review booking-detail.tsx, bookings-panel.tsx, roommate screens for any buttons that currently do nothing or return DEMO_ERROR. Ensure all call the updated service methods that now use AsyncStorage.
       Files: src/components/booking-detail.tsx, src/components/bookings-panel.tsx, app/(student)/roommate-requests.tsx
       Verify: `npm run typecheck` passes. Manual test: all buttons in booking and roommate flows trigger actions and show results.

- [ ] 16. Add persistence for saved roommates in DEMO_MODE.
       Update savedRoommateService in saved-service.ts to use AsyncStorage 'demo-saved-roommates' key instead of returning empty arrays. Implement list and toggle methods.
       Files: src/services/saved-service.ts
       Verify: `npm run typecheck` passes. Manual test: save a roommate, restart, verify persistence.

- [ ] 17. Update roommate request status methods in DEMO_MODE.
       Implement respondToRequest, withdrawRequest, countIncoming in roommate-service.ts to read/write AsyncStorage 'demo-roommate-requests' instead of returning DEMO_ERROR.
       Files: src/services/roommate-service.ts
       Verify: `npm run typecheck` passes. Manual test: accept/decline roommate requests work.

- [ ] 18. Final integration test: complete user flows end-to-end.
       Test the full student journey: sign in as student, search properties, save a property, request a viewing, view bookings, see Alex Reyes roommate, send roommate request, sign out, sign back in, verify all data persists. Ensure every button triggers an action and no DEMO_ERROR messages appear.
       Files: (no changes, testing only)
       Verify: All user flows complete successfully, data persists across app restarts, no errors in console.

