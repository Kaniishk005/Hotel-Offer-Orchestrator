import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

describe('hotel API route', () => {
  it('passes a trimmed city to orchestration and returns its result', async () => {
    const offers = [
      { name: 'HoltIn', price: 5340, supplier: 'Supplier B', commissionPct: 20 },
    ];
    const getHotelOffers = vi.fn().mockResolvedValue(offers);
    const replaceAndFilterHotelOffers = vi.fn().mockResolvedValue(offers);
    const response = await request(createApp({ getHotelOffers, replaceAndFilterHotelOffers }))
      .get('/api/hotels')
      .query({ city: ' Delhi ' });

    expect(response.status).toBe(200);
    expect(getHotelOffers).toHaveBeenCalledWith('Delhi');
    expect(replaceAndFilterHotelOffers).toHaveBeenCalledWith('Delhi', offers, {});
    expect(response.body[0].supplier).toBe('Supplier B');
  });

  it('returns 400 for a missing city', async () => {
    const response = await request(createApp()).get('/api/hotels');
    expect(response.status).toBe(400);
  });

  it('maps orchestration errors to 502', async () => {
    const getHotelOffers = vi.fn().mockRejectedValue(new Error('Temporal unavailable'));
    const response = await request(createApp({ getHotelOffers })).get('/api/hotels').query({ city: 'Delhi' });
    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Hotel orchestration failed' });
  });

  it('maps Redis failures to a controlled 502 without exposing details', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const getHotelOffers = vi.fn().mockResolvedValue([]);
    const replaceAndFilterHotelOffers = vi.fn().mockRejectedValue(new Error('Redis unavailable'));
    const response = await request(createApp({ getHotelOffers, replaceAndFilterHotelOffers }))
      .get('/api/hotels')
      .query({ city: 'Delhi' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Hotel orchestration failed' });
    expect(JSON.stringify(response.body)).not.toContain('Redis unavailable');
    expect(log).toHaveBeenCalledWith('Hotel request failed', expect.objectContaining({
      method: 'GET',
      path: '/api/hotels?city=Delhi',
    }));
    log.mockRestore();
  });

  it.each([
    [{ minPrice: 'abc' }, 'Query parameter "minPrice" must be a number'],
    [{ maxPrice: '' }, 'Query parameter "maxPrice" must be a number'],
    [{ minPrice: '-1' }, 'Query parameter "minPrice" cannot be negative'],
    [{ maxPrice: '-0.1' }, 'Query parameter "maxPrice" cannot be negative'],
    [{ minPrice: '6000', maxPrice: '5000' }, 'minPrice cannot be greater than maxPrice'],
  ])('returns 400 for invalid price query %o', async (query, error) => {
    const getHotelOffers = vi.fn();
    const response = await request(createApp({ getHotelOffers })).get('/api/hotels').query({ city: 'Delhi', ...query });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error });
    expect(getHotelOffers).not.toHaveBeenCalled();
  });

  it('passes inclusive price boundaries to Redis storage', async () => {
    const offers = [{ name: 'Boundary', price: 5000, supplier: 'Supplier A' as const, commissionPct: 10 }];
    const getHotelOffers = vi.fn().mockResolvedValue(offers);
    const replaceAndFilterHotelOffers = vi.fn().mockResolvedValue(offers);
    const response = await request(createApp({ getHotelOffers, replaceAndFilterHotelOffers }))
      .get('/api/hotels')
      .query({ city: 'Delhi', minPrice: '5000', maxPrice: '6000' });

    expect(response.status).toBe(200);
    expect(replaceAndFilterHotelOffers).toHaveBeenCalledWith(
      'Delhi',
      offers,
      { minPrice: 5000, maxPrice: 6000 },
    );
  });

  it('returns an empty result for an unknown city', async () => {
    const getHotelOffers = vi.fn().mockResolvedValue([]);
    const replaceAndFilterHotelOffers = vi.fn().mockResolvedValue([]);
    const response = await request(createApp({ getHotelOffers, replaceAndFilterHotelOffers }))
      .get('/api/hotels')
      .query({ city: 'Unknown' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
