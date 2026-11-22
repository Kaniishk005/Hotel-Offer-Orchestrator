import { ApplicationFailure, log } from '@temporalio/activity';
import { config } from '../config.js';
import type { HotelOffer, SupplierHotel, SupplierName } from '../types/hotel.js';

const fetchSupplier = async (
  path: string,
  supplier: SupplierName,
  city: string,
): Promise<HotelOffer[]> => {
  const url = new URL(path, config.supplierApiBaseUrl);
  url.searchParams.set('city', city);
  log.info('Supplier fetch started', { supplier, city });

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  } catch (error) {
    log.warn('Supplier network failure', { supplier, city, failureType: 'SupplierNetworkError' });
    throw ApplicationFailure.retryable(
      `Could not reach ${supplier}`,
      'SupplierNetworkError',
      error instanceof Error ? error.message : String(error),
    );
  }

  if (!response.ok) {
    log.warn('Supplier HTTP failure', { supplier, city, status: response.status });
    const message = `${supplier} returned HTTP ${response.status}`;
    if (response.status >= 500 || response.status === 429) {
      throw ApplicationFailure.retryable(message, 'SupplierHttpError');
    }
    throw ApplicationFailure.nonRetryable(message, 'SupplierHttpError');
  }

  const hotels = (await response.json()) as SupplierHotel[];
  const offers = hotels.map((hotel) => ({ ...hotel, supplier }));
  log.info('Supplier fetch succeeded', { supplier, city, hotelCount: offers.length });
  return offers;
};

export const fetchSupplierAHotels = (city: string): Promise<HotelOffer[]> =>
  fetchSupplier('/supplierA/hotels', 'Supplier A', city);

export const fetchSupplierBHotels = (city: string): Promise<HotelOffer[]> =>
  fetchSupplier('/supplierB/hotels', 'Supplier B', city);
