import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeRedisClient, getRedisClient } from '../../src/redis/client.js';
import { createHotelOfferStore } from '../../src/services/hotel-offer-store.js';
import type { HotelResult } from '../../src/types/hotel.js';

const keys = ['hotels:integration-delhi', 'hotels:integration-mumbai'];
const offers: HotelResult[] = [
  { name: 'Budget', price: 4000, supplier: 'Supplier A', commissionPct: 10 },
  { name: 'Boundary', price: 5000, supplier: 'Supplier B', commissionPct: 12 },
  { name: 'Premium', price: 6000, supplier: 'Supplier A', commissionPct: 15 },
];

describe('Redis hotel offer store integration', () => {
  beforeEach(async () => {
    const client = await getRedisClient();
    await client.del(keys);
  });

  afterAll(async () => {
    const client = await getRedisClient();
    await client.del(keys);
    await closeRedisClient();
  });

  it('stores offers with scores and returns inclusive ranges in ascending order', async () => {
    const client = await getRedisClient();
    const store = createHotelOfferStore(client, 600);
    const result = await store.replaceAndFind(
      'integration-delhi',
      offers,
      { minPrice: 5000, maxPrice: 6000 },
    );

    expect(result).toEqual([offers[1], offers[2]]);
    expect(await client.ttl('hotels:integration-delhi')).toBeGreaterThan(0);
    expect(await client.zScore('hotels:integration-delhi', JSON.stringify(offers[1]))).toBe(5000);
  });

  it('atomically replaces stale entries for a city', async () => {
    const client = await getRedisClient();
    const store = createHotelOfferStore(client, 600);
    await store.replaceAndFind('integration-delhi', offers, {});
    await store.replaceAndFind('integration-delhi', [offers[1]!], {});

    expect(await client.zCard('hotels:integration-delhi')).toBe(1);
    expect(await store.replaceAndFind('integration-delhi', [offers[1]!], {})).toEqual([offers[1]]);
  });

  it('keeps cities isolated and clears stale data for an empty result', async () => {
    const client = await getRedisClient();
    const store = createHotelOfferStore(client, 600);
    await store.replaceAndFind('integration-delhi', offers, {});
    await store.replaceAndFind('integration-mumbai', [offers[0]!], {});
    await store.replaceAndFind('integration-delhi', [], {});

    expect(await client.exists('hotels:integration-delhi')).toBe(0);
    expect(await client.zCard('hotels:integration-mumbai')).toBe(1);
  });
});
