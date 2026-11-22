import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('supplier health', () => {
  it('reports both suppliers healthy', async () => {
    const response = await request(createApp({ supplierBDown: false })).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      suppliers: { supplierA: 'healthy', supplierB: 'healthy' },
    });
  });

  it.each(['A', 'B'] as const)('reports supplier %s unavailable without failing liveness', async (supplier) => {
    const app = createApp({ supplierADown: supplier === 'A', supplierBDown: supplier === 'B' });
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'degraded',
      suppliers: {
        supplierA: supplier === 'A' ? 'unhealthy' : 'healthy',
        supplierB: supplier === 'B' ? 'unhealthy' : 'healthy',
      },
    });
    await request(app).get(`/supplier${supplier}/hotels`).expect(503);
    await request(app).get(`/supplier${supplier === 'A' ? 'B' : 'A'}/hotels`).expect(200);
  });
});
