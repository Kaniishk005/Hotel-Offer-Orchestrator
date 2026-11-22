import type { HotelOffer, HotelResult } from '../types/hotel.js';

export const normalizeHotelName = (name: string): string => name.trim().toLowerCase();

const isPreferredOffer = (candidate: HotelOffer, current: HotelOffer): boolean => {
  if (candidate.price !== current.price) {
    return candidate.price < current.price;
  }

  const supplierComparison = candidate.supplier.localeCompare(current.supplier);
  if (supplierComparison !== 0) {
    return supplierComparison < 0;
  }

  return candidate.hotelId.localeCompare(current.hotelId) < 0;
};

export const deduplicateHotels = (offers: readonly HotelOffer[]): HotelResult[] => {
  const bestByName = new Map<string, HotelOffer>();

  for (const offer of offers) {
    const normalizedName = normalizeHotelName(offer.name);
    const current = bestByName.get(normalizedName);
    if (current === undefined || isPreferredOffer(offer, current)) {
      bestByName.set(normalizedName, offer);
    }
  }

  return [...bestByName.entries()]
    .map(([normalizedName, offer]) => ({
      normalizedName,
      result: {
        name: offer.name.trim(),
        price: offer.price,
        supplier: offer.supplier,
        commissionPct: offer.commissionPct,
      } satisfies HotelResult,
    }))
    .sort((left, right) =>
      left.result.price - right.result.price ||
      left.normalizedName.localeCompare(right.normalizedName) ||
      left.result.supplier.localeCompare(right.result.supplier),
    )
    .map(({ result }) => result);
};
