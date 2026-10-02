/**
 * Location service abstraction.
 *
 * The app must never present a fabricated distance as a GPS-verified
 * measurement. Two providers are supported and both report which method
 * produced the number:
 *
 *  - `straightline` (default, zero credentials): great-circle distance between
 *    two stored lat/lng pairs using the Haversine formula. Labelled "approx."
 *    in the UI.
 *  - `routes` (opt-in, needs EXPO_PUBLIC_GOOGLE_MAPS_API_KEY): driving/walking
 *    distance from the Google Routes API, cached for 24h in memory.
 *
 * Switching providers is a configuration change only; screens consume the
 * `DistanceProvider` interface and never branch on the implementation.
 *
 * See docs/LOCATION_SERVICE.md for setup.
 */

import { effectiveDistanceMode, config } from '@/lib/config';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type DistanceMethod = 'straightline' | 'routes';

export interface DistanceEstimate {
  /** Kilometres. Never null: callers get `null` from the search layer instead. */
  km: number;
  method: DistanceMethod;
  /** Short qualifier for UI display, e.g. "approx. 1.4 km". */
  label: string;
  /** False when the provider key is missing and we silently degraded. */
  precise: boolean;
}

export interface DistanceProvider {
  readonly method: DistanceMethod;
  /** True when a real routing provider is configured. */
  readonly isPrecise: boolean;
  estimate(from: Coordinates, to: Coordinates): Promise<DistanceEstimate>;
}

const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function haversineKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function formatLabel(km: number, method: DistanceMethod): string {
  const value = km < 1 ? `${Math.round(km * 1000)} m` : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  return method === 'straightline' ? `approx. ${value}` : value;
}

/** Offline provider. Always available, never misleading about precision. */
class StraightLineProvider implements DistanceProvider {
  readonly method = 'straightline' as const;
  readonly isPrecise = false;

  async estimate(from: Coordinates, to: Coordinates): Promise<DistanceEstimate> {
    const km = haversineKm(from, to);
    return { km, method: this.method, label: formatLabel(km, this.method), precise: false };
  }
}

interface RoutesCacheEntry {
  km: number;
  expiresAt: number;
}

const ROUTES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Google Routes API provider. Requires EXPO_PUBLIC_GOOGLE_MAPS_API_KEY. */
class GoogleRoutesProvider implements DistanceProvider {
  readonly method = 'routes' as const;
  readonly isPrecise = true;

  private readonly cache = new Map<string, RoutesCacheEntry>();

  constructor(private readonly apiKey: string) {}

  async estimate(from: Coordinates, to: Coordinates): Promise<DistanceEstimate> {
    const key = `${from.latitude},${from.longitude}->${to.latitude},${to.longitude}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      const km = cached.km;
      return { km, method: this.method, label: formatLabel(km, this.method), precise: true };
    }

    const url =
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix' +
      `?origins=${encodeURIComponent(`${from.latitude},${from.longitude}`)}` +
      `&destinations=${encodeURIComponent(`${to.latitude},${to.longitude}`)}` +
      '&travelMode=DRIVE&routingPreference=TRAFFIC_AWARE';

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,status',
      },
      method: 'POST',
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      // Degrade rather than block the user; the caller still sees a labelled value.
      const fallback = await new StraightLineProvider().estimate(from, to);
      return fallback;
    }

    const payload = (await response.json()) as {
      originIndex?: string;
      destinationIndex?: string;
      distanceMeters?: number;
      status?: { code?: string };
    }[];

    const entry = payload?.[0];
    if (!entry || entry.status?.code !== 'OK' || typeof entry.distanceMeters !== 'number') {
      return new StraightLineProvider().estimate(from, to);
    }

    const km = entry.distanceMeters / 1000;
    this.cache.set(key, { km, expiresAt: Date.now() + ROUTES_CACHE_TTL_MS });
    return { km, method: this.method, label: formatLabel(km, this.method), precise: true };
  }
}

let provider: DistanceProvider | null = null;

/** Lazily resolves the configured provider, degrading to straight line. */
export function getDistanceProvider(): DistanceProvider {
  if (provider) return provider;

  if (effectiveDistanceMode === 'routes' && config.googleMapsApiKey.length > 0) {
    provider = new GoogleRoutesProvider(config.googleMapsApiKey);
  } else {
    provider = new StraightLineProvider();
  }
  return provider;
}

/** Test seam: forces a provider instance. */
export function setDistanceProvider(next: DistanceProvider | null): void {
  provider = next;
}

/** Returns the estimate, or null when either point lacks coordinates. */
export async function estimateDistance(
  from: Coordinates | null | undefined,
  to: Coordinates | null | undefined,
): Promise<DistanceEstimate | null> {
  if (!from || !to) return null;
  if (!Number.isFinite(from.latitude) || !Number.isFinite(to.latitude)) return null;
  return getDistanceProvider().estimate(from, to);
}

/** Blocking variant for sorting a list already in memory. */
export function estimateDistanceSync(
  from: Coordinates,
  to: Coordinates,
): DistanceEstimate {
  const km = haversineKm(from, to);
  const method: DistanceMethod = 'straightline';
  return { km, method, label: formatLabel(km, method), precise: false };
}