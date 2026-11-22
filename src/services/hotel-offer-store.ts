import { config } from '../config.js';
import { getRedisClient } from '../redis/client.js';
import type { HotelResult } from '../types/hotel.js';

interface RedisTransaction {
  del(key: string): RedisTransaction;
  zAdd(key: string, entries: Array<{ score: number; value: string }>): RedisTransaction;
  expire(key: string, seconds: number): RedisTransaction;
  exec(): Promise<unknown>;
}

export interface RedisHotelClient {
  multi(): RedisTransaction;
  zRangeByScore(key: string, min: number | string, max: number | string): Promise<string[]>;
}

export interface PriceRange {
  minPrice?: number;
  maxPrice?: number;
}

export const hotelKey = (city: string): string => `hotels:${city.trim().toLowerCase()}`;

export const createHotelOfferStore = (
  client: RedisHotelClient,
  ttlSeconds: number,
) => ({
  replaceAndFind: async (
    city: string,
    offers: readonly HotelResult[],
    range: PriceRange,
  ): Promise<HotelResult[]> => {
    const key = hotelKey(city);
    const transaction = client.multi().del(key);

    if (offers.length > 0) {
      transaction
        .zAdd(key, offers.map((offer) => ({ score: offer.price, value: JSON.stringify(offer) })))
        .expire(key, ttlSeconds);
    }

    await transaction.exec();

    const members = await client.zRangeByScore(
      key,
      range.minPrice ?? '-inf',
      range.maxPrice ?? '+inf',
    );
    return members.map((member) => JSON.parse(member) as HotelResult);
  },
});

export const replaceAndFilterHotelOffers = async (
  city: string,
  offers: readonly HotelResult[],
  range: PriceRange,
): Promise<HotelResult[]> => {
  const client = await getRedisClient();
  return createHotelOfferStore(client, config.redisTtlSeconds).replaceAndFind(city, offers, range);
};
