import express, { type NextFunction, type Request, type Response } from 'express';
import { filterHotelsByCity, supplierAHotels, supplierBHotels } from './data/supplier-hotels.js';
import {
  replaceAndFilterHotelOffers,
  type PriceRange,
} from './services/hotel-offer-store.js';
import { getHotelOffers } from './temporal/client.js';

export interface AppDependencies {
  getHotelOffers: typeof getHotelOffers;
  replaceAndFilterHotelOffers: typeof replaceAndFilterHotelOffers;
}

const describeError = (error: unknown): unknown => {
  if (!(error instanceof Error)) return error;

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause === undefined ? undefined : describeError(error.cause),
  };
};

const requireCity = (request: Request, response: Response): string | undefined => {
  if (typeof request.query.city !== 'string' || request.query.city.trim() === '') {
    response.status(400).json({ error: 'Query parameter "city" is required' });
    return undefined;
  }
  return request.query.city.trim();
};

const optionalCity = (request: Request, response: Response): string | null | undefined => {
  const value = request.query.city;
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.trim() === '') {
    response.status(400).json({ error: 'Query parameter "city" must be a non-empty string' });
    return undefined;
  }
  return value.trim();
};

const parsePrice = (
  value: unknown,
  name: 'minPrice' | 'maxPrice',
): { valid: true; value?: number } | { valid: false; message: string } => {
  if (value === undefined) return { valid: true };
  if (typeof value !== 'string' || value.trim() === '') {
    return { valid: false, message: `Query parameter "${name}" must be a number` };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { valid: false, message: `Query parameter "${name}" must be a number` };
  }
  if (parsed < 0) {
    return { valid: false, message: `Query parameter "${name}" cannot be negative` };
  }
  return { valid: true, value: parsed };
};

const requirePriceRange = (request: Request, response: Response): PriceRange | undefined => {
  const minimum = parsePrice(request.query.minPrice, 'minPrice');
  if (!minimum.valid) {
    response.status(400).json({ error: minimum.message });
    return undefined;
  }

  const maximum = parsePrice(request.query.maxPrice, 'maxPrice');
  if (!maximum.valid) {
    response.status(400).json({ error: maximum.message });
    return undefined;
  }

  if (minimum.value !== undefined && maximum.value !== undefined && minimum.value > maximum.value) {
    response.status(400).json({ error: 'minPrice cannot be greater than maxPrice' });
    return undefined;
  }

  return {
    ...(minimum.value === undefined ? {} : { minPrice: minimum.value }),
    ...(maximum.value === undefined ? {} : { maxPrice: maximum.value }),
  };
};

export const createApp = (overrides: Partial<AppDependencies> = {}) => {
  const dependencies: AppDependencies = {
    getHotelOffers,
    replaceAndFilterHotelOffers,
    ...overrides,
  };
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/supplierA/hotels', (request, response) => {
    const city = optionalCity(request, response);
    if (city !== undefined) {
      response.json(city === null ? supplierAHotels : filterHotelsByCity(supplierAHotels, city));
    }
  });

  app.get('/supplierB/hotels', (request, response) => {
    const city = optionalCity(request, response);
    if (city !== undefined) {
      response.json(city === null ? supplierBHotels : filterHotelsByCity(supplierBHotels, city));
    }
  });

  app.get('/api/hotels', async (request, response, next) => {
    const city = requireCity(request, response);
    if (city === undefined) return;
    const priceRange = requirePriceRange(request, response);
    if (priceRange === undefined) return;

    try {
      const offers = await dependencies.getHotelOffers(city);
      response.json(await dependencies.replaceAndFilterHotelOffers(city, offers, priceRange));
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, request: Request, response: Response, _next: NextFunction) => {
    console.error('Hotel request failed', {
      method: request.method,
      path: request.originalUrl,
      error: describeError(error),
    });
    response.status(502).json({ error: 'Hotel orchestration failed' });
  });

  return app;
};
