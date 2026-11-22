import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHotelOfferStore,
  hotelKey,
  type RedisHotelClient,
} from '../src/services/hotel-offer-store.js';
import type { HotelResult } from '../src/types/hotel.js';

const offers: HotelResult[] = [
  { name: 'Budget', price: 4000, supplier: 'Supplier A', commissionPct: 10 },
  { name: 'Boundary', price: 5000, supplier: 'Supplier B', commissionPct: 12 },
  { name: 'Premium', price: 6000, supplier: 'Supplier A', commissionPct: 15 },
];

const createRedisMock = () => {
  const transaction = {
    del: vi.fn(),
    zAdd: vi.fn(),
    expire: vi.fn(),
    exec: vi.fn().mockResolvedValue([]),
  };
  transaction.del.mockReturnValue(transaction);
  transaction.zAdd.mockReturnValue(transaction);
  transaction.expire.mockReturnValue(transaction);

  const client = {
    multi: vi.fn().mockReturnValue(transaction),
    zRangeByScore: vi.fn().mockResolvedValue([]),
  } as unknown as RedisHotelClient;
  return { client, transaction };
};

describe('Redis hotel offer store', () => {
  let redis: ReturnType<typeof createRedisMock>;

  beforeEach(() => {
    redis = createRedisMock();
  });

  it('uses isolated normalized city keys', () => {
    expect(hotelKey(' Delhi ')).toBe('hotels:delhi');
    expect(hotelKey('MUMBAI')).toBe('hotels:mumbai');
  });

  it('atomically deletes stale entries, stores scored offers, and applies the TTL', async () => {
    await createHotelOfferStore(redis.client, 600).replaceAndFind('Delhi', offers, {});
    expect(redis.transaction.del).toHaveBeenCalledWith('hotels:delhi');
    expect(redis.transaction.zAdd).toHaveBeenCalledWith(
      'hotels:delhi',
      offers.map((offer) => ({ score: offer.price, value: JSON.stringify(offer) })),
    );
    expect(redis.transaction.expire).toHaveBeenCalledWith('hotels:delhi', 600);
    expect(redis.transaction.exec).toHaveBeenCalledOnce();
  });

  it('queries minimum price inside Redis', async () => {
    await createHotelOfferStore(redis.client, 600).replaceAndFind('Delhi', offers, { minPrice: 5000 });
    expect(redis.client.zRangeByScore).toHaveBeenCalledWith('hotels:delhi', 5000, '+inf');
  });

  it('queries maximum price inside Redis', async () => {
    await createHotelOfferStore(redis.client, 600).replaceAndFind('Delhi', offers, { maxPrice: 6000 });
    expect(redis.client.zRangeByScore).toHaveBeenCalledWith('hotels:delhi', '-inf', 6000);
  });

  it('uses inclusive combined boundaries and deserializes matching results', async () => {
    const boundary = offers[1];
    vi.mocked(redis.client.zRangeByScore).mockResolvedValue([JSON.stringify(boundary)]);
    const result = await createHotelOfferStore(redis.client, 600)
      .replaceAndFind('Delhi', offers, { minPrice: 5000, maxPrice: 5000 });
    expect(redis.client.zRangeByScore).toHaveBeenCalledWith('hotels:delhi', 5000, 5000);
    expect(result).toEqual([boundary]);
  });

  it('returns no matches without JavaScript filtering', async () => {
    const result = await createHotelOfferStore(redis.client, 600)
      .replaceAndFind('Delhi', offers, { minPrice: 9000 });
    expect(result).toEqual([]);
  });

  it('removes stale entries and does not create a set for empty results', async () => {
    await createHotelOfferStore(redis.client, 600).replaceAndFind('Delhi', [], {});
    expect(redis.transaction.del).toHaveBeenCalledWith('hotels:delhi');
    expect(redis.transaction.zAdd).not.toHaveBeenCalled();
    expect(redis.transaction.expire).not.toHaveBeenCalled();
    expect(redis.transaction.exec).toHaveBeenCalledOnce();
  });
});
