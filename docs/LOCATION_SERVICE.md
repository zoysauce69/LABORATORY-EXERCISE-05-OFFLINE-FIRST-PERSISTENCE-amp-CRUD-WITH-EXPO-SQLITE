# Location and distance

RoomLink shows how far a listing is from a student's school or workplace. This
document explains exactly how that number is produced, because the honest
answer changes what the UI is allowed to say about it.

## The rule

**The app never invents a distance, and never labels a straight-line distance as
a real one.**

There is no "fake GPS" fallback and no placeholder such as `1.2 km` when a
coordinate is missing. When either endpoint lacks coordinates,
`estimateDistance` returns `null` and the listing simply shows no distance at
all. Sorting a list without distances leaves the original database order rather
than pretending everything is equidistant.

## Providers

`src/services/location-service.ts` exposes a `DistanceProvider` interface with
two implementations. Screens call the interface and never branch on which one is
active, so switching is a configuration change.

### 1. `straightline` — the default, zero credentials

Great-circle distance via the Haversine formula (`haversineKm`) between two
stored `latitude` / `longitude` pairs.

- No API key, no network, works offline.
- Reads `precise: false` and every label it produces is prefixed with
  `approx.`.
- Distances are rounded for display only: metres below 1 km, one decimal below
  10 km, whole kilometres above that.

Activate it by leaving the env vars at their defaults:

```dotenv
EXPO_PUBLIC_DISTANCE_MODE=straightline
```

### 2. `routes` — opt-in, Google Routes API

Driving distance from the Google Routes `computeRouteMatrix` endpoint, cached
in memory for 24 hours per origin/destination pair.

Setup:

1. Enable **Routes API** for a Google Cloud project.
2. Create a key and **restrict it** to the Routes API. Note that
   `EXPO_PUBLIC_*` variables are compiled into the shipped bundle, so the key is
   visible to anyone who unpacks the app. Restrict it to the Routes API, and use
   a key you are willing to expose. For a production build, proxy the call
   through your own backend instead and remove this variable.
3. Set both variables and restart the dev server — Expo inlines `EXPO_PUBLIC_*`
   at bundle time, so a running server will not pick up changes.

```dotenv
EXPO_PUBLIC_DISTANCE_MODE=routes
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

`effectiveDistanceMode` in `src/lib/config.ts` resolves to `routes` **only when
a key is present**. Asking for `routes` without a key silently falls back to
`straightline` rather than failing every distance lookup.

## Degradation behaviour

`GoogleRoutesProvider.estimate` falls back to the straight-line provider when:

- the response status is not `200`, or
- the payload contains no usable `distanceMeters` (for example, no routable
  path between two points).

The fallback still reports `precise: false` and an `approx. ` label, so a
provider outage downgrades the claim rather than the number's honesty.

## Where the coordinates come from

| Point | Source | Notes |
| --- | --- | --- |
| Student's school / workplace | `profile_private_details.institution_latitude` / `institution_longitude` | Set on the profile editor. Private to the owner; never returned by any cross-user read path. |
| Listing | `properties.latitude` / `properties.longitude` | Set once when the landlord publishes the listing. |

`EXPO_PUBLIC_*` latitude/longitude values are stored, not derived. RoomLink
does not call a geocoder on an address string, so a landlord enters or picks the
pin themselves and the stored value is the single source of truth.

## Testing the providers

`setDistanceProvider` is a test seam: it replaces the resolved provider so a test
can inject a stub without touching the network.

```ts
import { setDistanceProvider, estimateDistance } from '@/services/location-service';

setDistanceProvider({
  method: 'routes',
  isPrecise: true,
  estimate: async () => ({ km: 4.2, method: 'routes', label: '4.2 km', precise: true }),
});

await estimateDistance(
  { latitude: 14.676, longitude: 121.043 },
  { latitude: 14.65, longitude: 121.06 },
);

setDistanceProvider(null); // restore
```

See `src/services/location-service.test.ts`.