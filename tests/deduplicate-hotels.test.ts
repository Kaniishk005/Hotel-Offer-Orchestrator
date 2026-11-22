import { describe, expect, it } from 'vitest';
import { deduplicateHotels } from '../src/services/deduplicate-hotels.js';
import type { HotelOffer } from '../src/types/hotel.js';

const offer = (overrides: Partial<HotelOffer> = {}): HotelOffer => ({
  hotelId: 'A-1',
  name: 'Example Hotel',
  price: 5000,
  city: 'Delhi',
  commissionPct: 10,
  supplier: 'Supplier A',
  ...overrides,
});

describe('deduplicateHotels', () => {
  it('deduplicates case-insensitive, trimmed hotel names and selects the cheaper offer', () => {
    const result = deduplicateHotels([
      offer({ name: '  HoltIn ', price: 5600 }),
      offer({ hotelId: 'B-1', name: 'holtin', price: 5340, supplier: 'Supplier B', commissionPct: 20 }),
    ]);

    expect(result).toEqual([
      { name: 'holtin', price: 5340, supplier: 'Supplier B', commissionPct: 20 },
    ]);
  });

  it('preserves hotels unique to each supplier and sorts them by price', () => {
    const result = deduplicateHotels([
      offer({ name: 'Alpha', price: 6000 }),
      offer({ hotelId: 'B-1', name: 'Beta', price: 4000, supplier: 'Supplier B' }),
    ]);

    expect(result.map(({ name }) => name)).toEqual(['Beta', 'Alpha']);
  });

  it('breaks same-price ties deterministically by supplier name', () => {
    const result = deduplicateHotels([
      offer({ hotelId: 'B-1', supplier: 'Supplier B', commissionPct: 20 }),
      offer({ hotelId: 'A-1', supplier: 'Supplier A', commissionPct: 13 }),
    ]);

    expect(result[0]?.supplier).toBe('Supplier A');
    expect(result[0]?.commissionPct).toBe(13);
  });

  it('returns an empty list for no offers', () => {
    expect(deduplicateHotels([])).toEqual([]);
  });
});
