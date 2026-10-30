/** Fields needed by the client-side price calculation. Server data remains authoritative. */
export type OrderUnit = 'kg' | 'db' | 'karton';

export interface PricedProduct {
  id: string;
  prices?: Partial<Record<OrderUnit, number | null>>;
}

export interface ProductSelection {
  productId: string;
  unit: OrderUnit;
}

export interface PricedOrderItem extends ProductSelection {
  quantity: number;
}

export type PortalRole = 'partner' | 'staff';
