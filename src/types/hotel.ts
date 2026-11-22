export const SUPPLIERS = ['Supplier A', 'Supplier B'] as const;

export type SupplierName = (typeof SUPPLIERS)[number];

export interface SupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

export interface HotelOffer extends SupplierHotel {
  supplier: SupplierName;
}

export interface HotelResult {
  name: string;
  price: number;
  supplier: SupplierName;
  commissionPct: number;
}

export interface HotelWorkflowInput {
  city: string;
}
