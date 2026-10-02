import {
  estimateDistance,
  haversineKm,
  setDistanceProvider,
  type DistanceProvider,
} from '@/services/location-service';

const UP_DILIMAN = { latitude: 14.676, longitude: 121.043 };
const BACLARAN = { latitude: 14.6489, longitude: 120.9833 };

describe('haversineKm', () => {
  it('returns zero for the same point', () => {
    expect(haversineKm(UP_DILIMAN, UP_DILIMAN)).toBe(0);
  });

  it('is symmetric', () => {
    const a = haversineKm(UP_DILIMAN, BACLARAN);
    const b = haversineKm(BACLARAN, UP_DILIMAN);
    expect(a).toBeCloseTo(b, 9);
  });

  it('matches a known distance within a kilometre', () => {
    // UP Diliman to Baclaran is roughly 7 km as the crow flies.
    const km = haversineKm(UP_DILIMAN, BACLARAN);
    expect(km).toBeGreaterThan(6);
    expect(km).toBeLessThan(8.5);
  });

  it('scales with latitude for a fixed longitude delta', () => {
    const equator = haversineKm(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    );
    const manila = haversineKm(
      { latitude: 14.6, longitude: 121 },
      { latitude: 14.6, longitude: 122 },
    );
    // One degree of longitude is shorter further from the equator.
    expect(manila).toBeLessThan(equator);
  });
});

describe('estimateDistance', () => {
  afterEach(() => setDistanceProvider(null));

  it('returns null when either point is missing', async () => {
    await expect(estimateDistance(null, BACLARAN)).resolves.toBeNull();
    await expect(estimateDistance(UP_DILIMAN, undefined)).resolves.toBeNull();
    await expect(estimateDistance(null, null)).resolves.toBeNull();
  });

  it('returns null rather than guessing when coordinates are not finite', async () => {
    await expect(
      estimateDistance({ latitude: Number.NaN, longitude: 121 }, BACLARAN),
    ).resolves.toBeNull();
    await expect(
      estimateDistance(UP_DILIMAN, { latitude: Number.POSITIVE_INFINITY, longitude: 121 }),
    ).resolves.toBeNull();
  });

  it('never claims precision in the default straight-line mode', async () => {
    const result = await estimateDistance(UP_DILIMAN, BACLARAN);

    expect(result).not.toBeNull();
    expect(result?.method).toBe('straightline');
    expect(result?.precise).toBe(false);
    expect(result?.label.startsWith('approx. ')).toBe(true);
  });

  it('labels sub-kilometre distances in metres', async () => {
    const result = await estimateDistance(UP_DILIMAN, {
      latitude: UP_DILIMAN.latitude + 0.004,
      longitude: UP_DILIMAN.longitude,
    });

    expect(result?.label).toMatch(/^approx\. \d+ m$/);
  });

  it('uses the injected provider when one is set', async () => {
    const stub: DistanceProvider = {
      method: 'routes',
      isPrecise: true,
      estimate: async () => ({ km: 12.5, method: 'routes', label: '12.5 km', precise: true }),
    };
    setDistanceProvider(stub);

    const result = await estimateDistance(UP_DILIMAN, BACLARAN);

    expect(result?.km).toBe(12.5);
    expect(result?.precise).toBe(true);
    // A precise provider must not add the qualifier.
    expect(result?.label).toBe('12.5 km');
  });
});