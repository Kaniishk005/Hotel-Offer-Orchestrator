import type { SupplierHotel } from '../types/hotel.js';

export const supplierAHotels: readonly SupplierHotel[] = [
  { hotelId: 'A-DEL-001', name: 'Radison', price: 5900, city: 'Delhi', commissionPct: 13 },
  { hotelId: 'A-DEL-002', name: ' HoltIn ', price: 5600, city: 'Delhi', commissionPct: 15 },
  { hotelId: 'A-DEL-003', name: 'The Imperial', price: 8200, city: 'Delhi', commissionPct: 11 },
  { hotelId: 'A-MUM-001', name: 'Sea Palace', price: 7100, city: 'Mumbai', commissionPct: 12 },
];

export const supplierBHotels: readonly SupplierHotel[] = [
  { hotelId: 'B-DEL-001', name: 'radison ', price: 6100, city: 'delhi', commissionPct: 18 },
  { hotelId: 'B-DEL-002', name: 'HOLTIN', price: 5340, city: 'DELHI', commissionPct: 20 },
  { hotelId: 'B-DEL-003', name: 'City Crown', price: 6400, city: 'Delhi', commissionPct: 17 },
  { hotelId: 'B-MUM-001', name: 'SEA PALACE', price: 6900, city: 'Mumbai', commissionPct: 19 },
  { hotelId: 'B-BLR-001', name: 'Garden Suites', price: 4800, city: 'Bengaluru', commissionPct: 16 },
];

export const filterHotelsByCity = (
  hotels: readonly SupplierHotel[],
  city: string,
): SupplierHotel[] => {
  const normalizedCity = city.trim().toLowerCase();
  return hotels.filter((hotel) => hotel.city.trim().toLowerCase() === normalizedCity);
};
