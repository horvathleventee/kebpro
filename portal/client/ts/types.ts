/** Fields needed by the client-side price calculation. Server data remains authoritative. */
export type OrderUnit = 'kg' | 'db' | 'karton' | 'zacskó' | 'csomag';

export type PriceUnit = OrderUnit | `nyars-${number}`;

export interface PricedProduct {
  id: string;
  orderUnit?: OrderUnit | null;
  prices?: Partial<Record<PriceUnit, number | null>>;
}

export interface ProductSelection {
  productId: string;
  unit: OrderUnit;
  spitWeight?: number;
}

export interface PricedOrderItem extends ProductSelection {
  quantity: number;
}

export type PortalRole = 'partner' | 'staff';
