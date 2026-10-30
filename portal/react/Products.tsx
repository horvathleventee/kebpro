import React, { useState, useRef, useEffect } from 'react';
import { Heading, money } from './shared';

type Unit = 'kg' | 'db' | 'karton';
type PromoUnit = 'kg' | 'db';
type PriceMap = Partial<Record<Unit, number | null>>;
interface Product {
  id: string;
  name: string;
  active: boolean;
  prices?: PriceMap;
  promotions?: Partial<Record<PromoUnit, { kind: string; value: number }>>;
}
interface Partner {
  id: string;
  name: string;
  prices?: Record<string, PriceMap>;
}
interface ProductActions {
  onPrice(values: {
    productId: string;
    partnerId: string | null;
    unit: Unit;
    price: number | null;
  }): Promise<unknown>;
  onPromotion(values: {
    productId: string;
    unit: PromoUnit;
    kind: string;
    value: number;
  }): Promise<unknown>;
  onAvailability(id: string, active: boolean): Promise<unknown>;
  onRemove(product: Product, unit: PromoUnit): void;
  onError(error: unknown): void;
}
function useSave(onError: (error: unknown) => void) {
  const [busy, setBusy] = useState(false),
    inFlight = useRef(false);
  async function run(task: () => Promise<unknown>) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    try {
      await task();
      return true;
    } catch (error) {
      onError(error);
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return { busy, run };
}
function PriceForm({
  product,
  partner,
  onSave,
  onError,
}: {
  product: Product;
  partner?: Partner;
  onSave: ProductActions['onPrice'];
  onError: ProductActions['onError'];
}) {
  const [unit, setUnit] = useState<Unit>('kg'),
    [dirty, setDirty] = useState(false);
  const getPrice = (unit: Unit) =>
    partner ? partner.prices?.[product.id]?.[unit] : product.prices?.[unit];
  const [price, setPrice] = useState(() => getPrice('kg') ?? '');
  const { busy, run } = useSave(onError);
  useEffect(() => {
    if (!dirty && !busy) setPrice(getPrice(unit) ?? '');
  }, [product, partner, unit, dirty, busy]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = String(price).trim();
    if (
      await run(() =>
        onSave({
          productId: product.id,
          partnerId: partner?.id || null,
          unit,
          price: raw === '' ? null : Number(raw),
        }),
      )
    )
      setDirty(false);
  }
  return (
    <form
      id={'price-' + product.id}
      data-price-product={product.id}
      data-dirty={dirty ? 'true' : undefined}
      className="section-gap"
      onSubmit={submit}
    >
      <input type="hidden" name="partnerId" value={partner?.id || ''} />
      <p className="small muted">{partner ? 'Partner: ' + partner.name : 'Alapár'}</p>
      <label>
        Mértékegység
        <select
          name="unit"
          data-price-unit="true"
          value={unit}
          onChange={(event) => {
            const next = event.target.value as Unit;
            setUnit(next);
            setPrice(getPrice(next) ?? '');
            setDirty(true);
          }}
        >
          <option value="kg">kg</option>
          <option value="db">db</option>
          <option value="karton">karton</option>
        </select>
      </label>
      <label>
        Nettó egységár (Ft)
        <input
          name="price"
          type="number"
          min="0"
          max="100000000"
          step="1"
          inputMode="numeric"
          value={price}
          onChange={(event) => {
            setPrice(event.target.value);
            setDirty(true);
          }}
        />
      </label>
      <p className="small muted">
        Üres mezővel törölhető a beállított ár; egyedi árnál ezután az alapár érvényes.
      </p>
      <button className="button primary" disabled={busy}>
        Ár mentése
      </button>
    </form>
  );
}
function PromotionForm({
  product,
  unit,
  onSave,
  onError,
}: {
  product: Product;
  unit: PromoUnit;
  onSave: ProductActions['onPromotion'];
  onError: ProductActions['onError'];
}) {
  const promotion = product.promotions?.[unit] || { kind: 'discount', value: '' },
    [kind, setKind] = useState(promotion.kind),
    [value, setValue] = useState(promotion.value),
    [dirty, setDirty] = useState(false),
    { busy, run } = useSave(onError);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = String(value).trim();
    if (!raw) {
      onError(new Error('Add meg az akció értékét.'));
      return;
    }
    if (await run(() => onSave({ productId: product.id, unit, kind, value: Number(raw) })))
      setDirty(false);
  }
  return (
    <form
      id={'promotion-' + product.id + '-' + unit}
      data-promotion-product={product.id}
      data-dirty={dirty ? 'true' : undefined}
      className="section-gap"
      onSubmit={submit}
    >
      <h3>{unit}</h3>
      <input type="hidden" name="unit" value={unit} />
      <label>
        Mit állítsunk be?
        <select
          name="kind"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setDirty(true);
          }}
        >
          <option value="discount">Kedvezmény levonása (Ft / {unit})</option>
          <option value="fixed">Egységes akciós ár (Ft / {unit})</option>
        </select>
      </label>
      <label>
        Akció értéke Ft-ban
        <input
          name="value"
          type="number"
          min="0"
          max="100000000"
          step="1"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDirty(true);
          }}
        />
      </label>
      <button className="button primary" disabled={busy}>
        Akció mentése
      </button>
    </form>
  );
}
function ProductCard({
  product,
  chosen,
  onPrice,
  onPromotion,
  onAvailability,
  onRemove,
  onError,
}: ProductActions & { product: Product; chosen?: Partner }) {
  const { busy, run } = useSave(onError);
  return (
    <article className="card" data-price-card={product.name}>
      <div className="saved-list">
        <div>
          <strong>{product.name}</strong>
          <p>{product.active ? 'Rendelhető' : 'Átmenetileg nem rendelhető'}</p>
          <p className="small muted">
            Beállított árak (akció nélkül):{' '}
            {(['kg', 'db', 'karton'] as Unit[])
              .map(
                (unit) =>
                  unit +
                  ': ' +
                  money(
                    chosen
                      ? (chosen.prices?.[product.id]?.[unit] ?? product.prices?.[unit] ?? null)
                      : (product.prices?.[unit] ?? null),
                  ) +
                  (chosen && chosen.prices?.[product.id]?.[unit] !== undefined ? ' (egyedi)' : ''),
              )
              .join(' · ')}
          </p>
          {(['kg', 'db'] as PromoUnit[])
            .filter((unit) => product.promotions?.[unit])
            .map((unit) => {
              const promo = product.promotions![unit]!;
              return (
                <div className="promotion-active" key={unit}>
                  <strong>
                    🏷 Akció aktív:{' '}
                    {promo.kind === 'discount'
                      ? '−' + money(promo.value) + ' / ' + unit
                      : money(promo.value) + ' / ' + unit + ' akciós ár'}
                  </strong>
                  <button
                    type="button"
                    className="button secondary"
                    data-action="remove-promotion"
                    data-id={product.id}
                    data-unit={unit}
                    onClick={() => onRemove(product, unit)}
                  >
                    Akció levétele
                  </button>
                </div>
              );
            })}
        </div>
        <button
          type="button"
          className={'button ' + (product.active ? 'secondary' : 'primary')}
          data-action="product-availability"
          data-id={product.id}
          data-active={String(!product.active)}
          disabled={busy}
          onClick={() => run(() => onAvailability(product.id, !product.active))}
        >
          {product.active ? 'Rendelés szüneteltetése' : 'Újra rendelhető'}
        </button>
      </div>
      <details className="section-gap">
        <summary>Árak beállítása</summary>
        <PriceForm
          key={chosen?.id || 'default'}
          product={product}
          partner={chosen}
          onSave={onPrice}
          onError={onError}
        />
      </details>
      <details className="section-gap">
        <summary>Akció beállítása</summary>
        <p className="small muted">
          Válaszd ki a kg vagy db egységet, az akció típusát és a nettó értéket. Az akció minden
          partnerre azonnal érvényes. Az ár nélküli termék továbbra sem rendelhető.
        </p>
        <p className="small muted">
          A levonás a személyre szabott árból is levonódik; az egységes ár minden beállított árat
          felülír az akció idejére. A végső ár legalább 0 Ft.
        </p>
        {(['kg', 'db'] as PromoUnit[]).map((unit) => (
          <PromotionForm
            key={unit + JSON.stringify(product.promotions?.[unit] || {})}
            product={product}
            unit={unit}
            onSave={onPromotion}
            onError={onError}
          />
        ))}
      </details>
    </article>
  );
}
export function Products({
  data,
  productSearch,
  partnerSearch,
  pricePartner,
  onProductSearch,
  onPartnerSearch,
  onPartnerSelect,
  onPrice,
  onPromotion,
  onAvailability,
  onRemove,
  onError,
}: ProductActions & {
  data: { allPartners: Partner[]; products: Product[] };
  productSearch: string;
  partnerSearch: string;
  pricePartner: string;
  onProductSearch(value: string): void;
  onPartnerSearch(value: string): void;
  onPartnerSelect(value: string): void;
}) {
  const [productQuery, setProductQuery] = useState(productSearch),
    [partnerQuery, setPartnerQuery] = useState(partnerSearch);
  const match = (text: string, query: string) =>
    String(text)
      .toLocaleLowerCase('hu-HU')
      .includes(String(query).trim().toLocaleLowerCase('hu-HU'));
  const partners = [...data.allPartners].sort((a, b) => a.name.localeCompare(b.name, 'hu')),
    chosen = partners.find((p) => p.id === pricePartner);
  return (
    <>
      <Heading
        eyebrow="TERMÉKEK"
        title="Rendelhető termékek és árak"
        description="Az árakat külön kell megadni kg, db és karton egységre. Az üres egyedi árnál az alapár érvényes."
      />
      <p className="notice warning">
        Az árak nettó árak. Hiányzó ár esetén a partner nem adhatja le a rendelést; az árakat az
        értékesítő kollégák állítják be. A korábban rögzített rendelések ára nem változik.
      </p>
      <div className="card price-search section-gap">
        <label>
          Termék keresése
          <input
            type="search"
            id="price-product-search"
            value={productQuery}
            onChange={(e) => {
              setProductQuery(e.target.value);
              onProductSearch(e.target.value);
            }}
            placeholder="Termék neve"
          />
        </label>
        <label>
          Partner keresése az árbeállításhoz
          <input
            type="search"
            id="price-partner-search"
            value={partnerQuery}
            onChange={(e) => {
              setPartnerQuery(e.target.value);
              onPartnerSearch(e.target.value);
            }}
            placeholder="Cég neve"
          />
        </label>
        <label>
          Árak megtekintése
          <select
            id="price-partner-filter"
            value={pricePartner}
            onChange={(e) => onPartnerSelect(e.target.value)}
          >
            <option value="">Alapárak</option>
            {partners
              .filter((p) => match(p.name, partnerQuery) || p.id === pricePartner)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="stack section-gap">
        {data.products.map((product) => (
          <div key={product.id} hidden={!match(product.name, productQuery)}>
            <ProductCard
              product={product}
              chosen={chosen}
              onPrice={onPrice}
              onPromotion={onPromotion}
              onAvailability={onAvailability}
              onRemove={onRemove}
              onError={onError}
            />
          </div>
        ))}
      </div>
    </>
  );
}
