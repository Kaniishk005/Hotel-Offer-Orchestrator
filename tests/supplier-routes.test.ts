import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp({
  getHotelOffers: vi.fn().mockResolvedValue([]),
  replaceAndFilterHotelOffers: vi.fn().mockResolvedValue([]),
});

describe('supplier routes', () => {
  it('filters cities case-insensitively', async () => {
    const response = await request(app).get('/supplierA/hotels').query({ city: 'dELHi' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body.every((hotel: { city: string }) => hotel.city.toLowerCase() === 'delhi')).toBe(true);
  });

  it('returns an empty list when the city has no hotels', async () => {
    const response = await request(app).get('/supplierB/hotels').query({ city: 'Pune' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('validates the city query', async () => {
    const response = await request(app).get('/supplierA/hotels');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Query parameter "city" is required' });
  });
});
