import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp({
  getHotelOffers: vi.fn().mockResolvedValue([]),
  replaceAndFilterHotelOffers: vi.fn().mockResolvedValue([]),
});

describe('supplier routes', () => {
  it.each([
    ['/supplierA/hotels', 4],
    ['/supplierB/hotels', 5],
  ])('returns every supplier hotel when city is omitted from %s', async (path, count) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(count);
  });

  it.each(['/supplierA/hotels', '/supplierB/hotels'])(
    'filters cities case-insensitively for %s',
    async (path) => {
      const response = await request(app).get(path).query({ city: 'dELHi' });
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body.every((hotel: { city: string }) => hotel.city.toLowerCase() === 'delhi')).toBe(true);
    },
  );

  it.each(['/supplierA/hotels', '/supplierB/hotels'])(
    'rejects an empty city for %s',
    async (path) => {
      const response = await request(app).get(path).query({ city: '   ' });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Query parameter "city" must be a non-empty string' });
    },
  );

  it.each(['/supplierA/hotels', '/supplierB/hotels'])(
    'rejects a non-string city for %s',
    async (path) => {
      const response = await request(app).get(path).query({ city: ['Delhi', 'Mumbai'] });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Query parameter "city" must be a non-empty string' });
    },
  );

  it('returns an empty list when the city has no hotels', async () => {
    const response = await request(app).get('/supplierB/hotels').query({ city: 'Pune' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

});
