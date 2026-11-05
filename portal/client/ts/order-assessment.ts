export interface AssessmentItem {
  productId: string;
  quantity: number;
  unit: string;
  spitWeight?: number;
}
export const spitSizes = [5, 10, 15, 20, 30, 40, 50, 60] as const;
export const isSpit = (id: string) => ['product-1', 'product-2', 'product-3'].includes(id);
export const spitPriceKey = (weight: number) => `nyars-${weight}` as const;
export type Assessment = 'ok' | 'below' | 'unknown';
// Stable IDs from the original catalog. Product 9 has two package variants, both carton-eligible.
const cartonProducts = new Set([
  'product-8',
  'product-9',
  'product-10',
  'product-11',
  'frozen-chicken-1kg',
  'frozen-chicken-1_5kg',
]);
export function assessOrder(items: readonly AssessmentItem[]): Assessment {
  let cartons = 0,
    kilograms = 0,
    unknown = false;
  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      unknown = true;
      continue;
    }
    if (
      isSpit(item.productId) &&
      item.unit === 'db' &&
      spitSizes.some((size) => size === item.spitWeight)
    )
      kilograms += item.quantity * item.spitWeight!;
    else if (cartonProducts.has(item.productId) && item.unit === 'karton') cartons += item.quantity;
    else if (item.productId === 'product-32' && item.unit === 'kg') kilograms += item.quantity;
    else unknown = true;
  }
  if (cartons >= 2 || kilograms >= 20) return 'ok';
  return unknown ? 'unknown' : 'below';
}
export function assessmentMessage(status: Assessment): string {
  if (status === 'below')
    return 'A rendelt mennyiség várhatóan nem elegendő a kiszállításhoz. Rendelésedet elküldheted, de előfordulhat, hogy a Kebpro munkatársa telefonon felkeres egyeztetés céljából.';
  if (status === 'unknown')
    return 'A rendelt mennyiség ellenőrzést igényel. Rendelésedet elküldheted, de előfordulhat, hogy a Kebpro munkatársa telefonon felkeres egyeztetés céljából.';
  return '';
}
