import type { PricedOrderItem, PricedProduct, ProductSelection } from './types';

export const formatMoney = (value: number | null | undefined): string =>
  value === null || value === undefined ? 'Ár egyeztetendő' : new Intl.NumberFormat('hu-HU').format(value) + ' Ft';

export const getUnitPrice = (products: readonly PricedProduct[], item: ProductSelection): number | null =>
  products.find(product => product.id === item.productId)?.prices?.[item.unit] ?? null;

export function getLinePrice(products: readonly PricedProduct[], item: PricedOrderItem): number | null {
  const price = getUnitPrice(products, item);
  return price === null ? null : Math.round(price * Math.round(item.quantity * 100) / 100);
}

export function summarizeCart(products: readonly PricedProduct[], cart: readonly PricedOrderItem[]): string {
  if (!cart.length) return '';
  const lines = cart.map(item => getLinePrice(products, item));
  if (lines.some(value => value === null)) return 'Hiányzó ár: kérjük, fordulj az értékesítő kollégákhoz.';
  return 'Nettó összesen: ' + formatMoney(lines.reduce<number>((sum, value) => sum + (value ?? 0), 0));
}
