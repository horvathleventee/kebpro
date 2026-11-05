import { availableUnits } from '../client/ts/available-units';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Heading, money } from './shared';

type Unit = 'kg' | 'db' | 'karton' | 'zacskó' | 'csomag' | `nyars-${number}`;
type PriceMap = Partial<Record<Unit, number | null>>;
interface Product {
  id: string;
  name: string;
  active: boolean;
  availablePriceUnits?: Unit[];
  orderUnit?: Unit | null;
  prices?: PriceMap;
  promotions?: Partial<Record<Unit, { kind: string; value: number }>>;
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
    unit: Unit;
    kind: string;
    value: number;
  }): Promise<unknown>;
  onAvailability(id: string, active: boolean): Promise<unknown>;
  onRemove(product: Product, unit: Unit): void;
  onError(error: unknown): void;
}
interface DraftHandle {
  dirty(): boolean;
  busy(): boolean;
  save(): Promise<boolean>;
  discard(): void;
}
const unitLabel = (unit: string) =>
  unit.startsWith('nyars-') ? unit.slice(6) + ' kg / nyárs' : unit;
const inputValue = (value: number | null | undefined) => (value == null ? '' : String(value));
const parseMoney = (value: string): number | null => {
  if (!/^\d+$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number <= 100000000 ? number : null;
};

function ProductCard({
  product,
  chosen,
  onPrice,
  onPromotion,
  onAvailability,
  onRemove,
  onError,
  register,
  change,
}: ProductActions & {
  product: Product;
  chosen?: Partner;
  register(id: string, handle: DraftHandle | null): void;
  change(ids: string[], action: () => void): void;
}) {
  const units = availableUnits(product);
  const [unit, setUnit] = useState<Unit | undefined>(units[0]);
  const activeUnit = unit && units.includes(unit) ? unit : units[0];
  const override = activeUnit && chosen ? chosen.prices?.[product.id]?.[activeUnit] : undefined;
  const base = activeUnit ? (product.prices?.[activeUnit] ?? null) : null;
  const effectiveBase = override ?? base;
  const existing = activeUnit ? product.promotions?.[activeUnit] : undefined;
  const [mobileEditor, setMobileEditor] = useState<'price' | 'promotion' | null>(null);
  const [price, setPrice] = useState('');
  const [kind, setKind] = useState('discount');
  const [promotion, setPromotion] = useState('');
  const [priceDirty, setPriceDirty] = useState(false);
  const [promoDirty, setPromoDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [priceMessage, setPriceMessage] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const pending = useRef(false);
  const snapshot = () => {
    setPrice(inputValue(chosen ? (override ?? base) : base));
    setKind(existing?.kind || 'discount');
    setPromotion(inputValue(existing?.value));
    setPriceDirty(false);
    setPromoDirty(false);
    setPriceMessage('');
    setPromoMessage('');
  };
  useEffect(() => {
    if (!priceDirty) setPrice(inputValue(chosen ? (override ?? base) : base));
  }, [activeUnit, chosen?.id, override, base, priceDirty]);
  useEffect(() => {
    if (!promoDirty) {
      setKind(existing?.kind || 'discount');
      setPromotion(inputValue(existing?.value));
    }
  }, [activeUnit, existing?.kind, existing?.value, promoDirty]);
  const operation = async (
    action: () => Promise<unknown>,
    setMessage: (value: string) => void,
    success: string,
  ) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'A mentés nem sikerült.');
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const savePrice = async () => {
    const parsed = parseMoney(price);
    if (!activeUnit || parsed === null) {
      setPriceMessage('Adj meg 0 és 100 000 000 közötti egész forintot.');
      return false;
    }
    const ok = await operation(
      () =>
        onPrice({
          productId: product.id,
          partnerId: chosen?.id || null,
          unit: activeUnit,
          price: parsed,
        }),
      setPriceMessage,
      'Ár elmentve.',
    );
    if (ok) setPriceDirty(false);
    return ok;
  };
  const savePromotion = async () => {
    const parsed = parseMoney(promotion);
    if (!activeUnit || parsed === null) {
      setPromoMessage('Adj meg 0 és 100 000 000 közötti egész forintot.');
      return false;
    }
    const ok = await operation(
      () => onPromotion({ productId: product.id, unit: activeUnit, kind, value: parsed }),
      setPromoMessage,
      'Akció elmentve; minden partnerre érvényes.',
    );
    if (ok) setPromoDirty(false);
    return ok;
  };
  useLayoutEffect(() => {
    register(product.id, {
      dirty: () => priceDirty || promoDirty,
      busy: () => pending.current || busy,
      save: async () => {
        if (busy) return false;
        if (priceDirty && !(await savePrice())) return false;
        if (promoDirty && !(await savePromotion())) return false;
        return true;
      },
      discard: snapshot,
    });
    return () => register(product.id, null);
  });
  if (!activeUnit)
    return (
      <article className="card">
        <strong>{product.name}</strong>
        <p className="notice warning">
          A termék rendelési egysége nem ismert. Frissítsd az alkalmazást, vagy keresd a
          rendszergazdát.
        </p>
      </article>
    );
  const savedEffective =
    effectiveBase == null
      ? null
      : !existing
        ? effectiveBase
        : existing.kind === 'fixed'
          ? existing.value
          : Math.max(0, effectiveBase - existing.value);
  const parsedPromo = parseMoney(promotion);
  const preview =
    effectiveBase == null || parsedPromo == null
      ? null
      : kind === 'fixed'
        ? parsedPromo
        : Math.max(0, effectiveBase - parsedPromo);
  return (
    <article className="card pricing-card" data-price-card={product.name}>
      <div className="pricing-card-header">
        <div>
          <h2>{product.name}</h2>
          <span className={'badge ' + (product.active ? 'green' : 'amber')}>
            {product.active ? 'Rendelhető' : 'Átmenetileg nem rendelhető'}
          </span>
        </div>
        <button
          type="button"
          className={'button ' + (product.active ? 'secondary' : 'primary')}
          disabled={busy}
          onClick={async () => {
            try {
              setBusy(true);
              await onAvailability(product.id, !product.active);
            } catch (e) {
              onError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          {product.active ? 'Rendelés szüneteltetése' : 'Újra rendelhető'}
        </button>
      </div>
      {units.length > 1 ? (
        <div className="pricing-units" role="group" aria-label={product.name + ' mérete'}>
          {units.map((u) => (
            <button
              type="button"
              key={u}
              className={'button ' + (u === activeUnit ? 'primary' : 'secondary')}
              aria-pressed={u === activeUnit}
              disabled={busy}
              onClick={() => {
                if (u !== activeUnit) change([product.id], () => setUnit(u));
              }}
            >
              {unitLabel(u)}
            </button>
          ))}
        </div>
      ) : (
        <p className="small muted">
          Rendelési egység: <strong>{unitLabel(activeUnit)}</strong>
        </p>
      )}
      <div className="pricing-saved-summary" aria-live="polite">
        <p>
          <strong>
            {chosen ? (override != null ? 'Egyedi partnerár' : 'Örökölt alapár') : 'Alapár'}:
          </strong>{' '}
          {effectiveBase == null
            ? 'Nincs beállított ár'
            : money(effectiveBase) + ' / ' + unitLabel(activeUnit)}
        </p>
        {existing && (
          <p>
            <strong>Aktív akció:</strong>{' '}
            {existing.kind === 'discount'
              ? 'Kedvezmény ' + money(existing.value)
              : 'Akciós ár ' + money(existing.value)}
            {' · '}
            {savedEffective == null
              ? 'Nincs beállított ár, a termék nem rendelhető'
              : 'Végső ár: ' + money(savedEffective) + ' / ' + unitLabel(activeUnit)}
          </p>
        )}
      </div>
      <div className="pricing-panels">
        <form
          className="pricing-panel"
          data-price-product={product.id}
          data-dirty={priceDirty ? 'true' : undefined}
          onSubmit={(e) => {
            e.preventDefault();
            void savePrice();
          }}
        >
          <div className="pricing-panel-heading">
            <h3 className="pricing-desktop-title">Ár beállítása</h3>
            <button
              className="pricing-mobile-toggle"
              type="button"
              aria-expanded={mobileEditor === 'price'}
              aria-controls={'price-editor-' + product.id}
              disabled={busy}
              onClick={() =>
                change([product.id], () =>
                  setMobileEditor(mobileEditor === 'price' ? null : 'price'),
                )
              }
            >
              <span>Ár beállítása</span>
              <span aria-hidden="true">{mobileEditor === 'price' ? '−' : '+'}</span>
            </button>
            <p>
              {chosen ? 'Partner: ' + chosen.name : 'Alapár'} · {unitLabel(activeUnit)}
            </p>
          </div>
          <div
            id={'price-editor-' + product.id}
            className={
              'pricing-panel-body' + (mobileEditor === 'price' ? ' pricing-mobile-open' : '')
            }
          >
            <p className="small muted">
              {chosen ? (override != null ? 'Egyedi partnerár' : 'Örökölt alapár') : 'Alapár'}:{' '}
              {money(effectiveBase)} / {unitLabel(activeUnit)}
            </p>
            <label htmlFor={'price-value-' + product.id}>
              Nettó ár (Ft / {unitLabel(activeUnit)})
            </label>
            <input
              id={'price-value-' + product.id}
              name="price"
              type="number"
              min="0"
              max="100000000"
              step="1"
              inputMode="numeric"
              value={price}
              disabled={busy}
              onChange={(e) => {
                setPrice(e.target.value);
                setPriceDirty(true);
                setPriceMessage('');
              }}
            />
            <div className="pricing-actions">
              <button className="button primary" disabled={busy}>
                Ár mentése
              </button>
              {(chosen ? override != null : base != null) && (
                <button
                  type="button"
                  className="button text-button"
                  disabled={busy}
                  onClick={() =>
                    change([product.id], () => {
                      void (async () => {
                        const ok = await operation(
                          () =>
                            onPrice({
                              productId: product.id,
                              partnerId: chosen?.id || null,
                              unit: activeUnit,
                              price: null,
                            }),
                          setPriceMessage,
                          chosen ? 'Egyedi ár törölve; az alapár érvényes.' : 'Alapár törölve.',
                        );
                        if (ok) setPriceDirty(false);
                      })();
                    })
                  }
                >
                  {chosen ? 'Egyedi ár törlése · vissza az alapárhoz' : 'Alapár törlése'}
                </button>
              )}
            </div>
            <p role="status" className="small">
              {priceMessage}
            </p>
          </div>
        </form>
        <form
          className="pricing-panel"
          data-promotion-product={product.id}
          data-dirty={promoDirty ? 'true' : undefined}
          onSubmit={(e) => {
            e.preventDefault();
            void savePromotion();
          }}
        >
          <div className="pricing-panel-heading">
            <h3 className="pricing-desktop-title">Akció beállítása</h3>
            <button
              className="pricing-mobile-toggle"
              type="button"
              aria-expanded={mobileEditor === 'promotion'}
              aria-controls={'promotion-editor-' + product.id}
              disabled={busy}
              onClick={() =>
                change([product.id], () =>
                  setMobileEditor(mobileEditor === 'promotion' ? null : 'promotion'),
                )
              }
            >
              <span>Akció beállítása</span>
              <span aria-hidden="true">{mobileEditor === 'promotion' ? '−' : '+'}</span>
            </button>
            <p>Minden partnerre azonnal érvényes · {unitLabel(activeUnit)}</p>
          </div>
          <div
            id={'promotion-editor-' + product.id}
            className={
              'pricing-panel-body' + (mobileEditor === 'promotion' ? ' pricing-mobile-open' : '')
            }
          >
            <fieldset className="pricing-promotion-kind">
              <legend>Akció típusa</legend>
              <label>
                <input
                  type="radio"
                  name={'promotion-kind-' + product.id}
                  value="discount"
                  checked={kind === 'discount'}
                  disabled={busy}
                  onChange={() => {
                    setKind('discount');
                    setPromoDirty(true);
                    setPromoMessage('');
                  }}
                />{' '}
                Kedvezmény (Ft)
              </label>
              <label>
                <input
                  type="radio"
                  name={'promotion-kind-' + product.id}
                  value="fixed"
                  checked={kind === 'fixed'}
                  disabled={busy}
                  onChange={() => {
                    setKind('fixed');
                    setPromoDirty(true);
                    setPromoMessage('');
                  }}
                />{' '}
                Akciós ár (Ft)
              </label>
            </fieldset>
            <label htmlFor={'promo-value-' + product.id}>
              {kind === 'discount' ? 'Levonás' : 'Akciós ár'} (Ft / {unitLabel(activeUnit)})
            </label>
            <input
              id={'promo-value-' + product.id}
              name="value"
              type="number"
              min="0"
              max="100000000"
              step="1"
              inputMode="numeric"
              value={promotion}
              disabled={busy}
              onChange={(e) => {
                setPromotion(e.target.value);
                setPromoDirty(true);
                setPromoMessage('');
              }}
            />
            <p className="pricing-preview" aria-live="polite">
              {effectiveBase == null ? (
                'Nincs alap- vagy egyedi ár: a termék nem rendelhető.'
              ) : parsedPromo == null ? (
                'Add meg az akció értékét az előnézethez.'
              ) : (
                <>
                  Előnézet: {money(effectiveBase)} → <strong>{money(preview)}</strong> /{' '}
                  {unitLabel(activeUnit)}
                </>
              )}
            </p>
            <div className="pricing-actions">
              <button className="button primary" disabled={busy}>
                Akció mentése
              </button>
              {existing && (
                <button
                  type="button"
                  className="button text-button"
                  disabled={busy}
                  onClick={() => change([product.id], () => onRemove(product, activeUnit))}
                >
                  Akció megszüntetése
                </button>
              )}
            </div>
            <p role="status" className="small">
              {promoMessage}
            </p>
          </div>
        </form>
      </div>
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
  const [pendingChange, setPendingChange] = useState<{ ids: string[]; action: () => void } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const handles = useRef(new Map<string, DraftHandle>());
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (pendingChange && !dialog.current?.open) dialog.current?.showModal();
  }, [pendingChange]);
  const register = (id: string, handle: DraftHandle | null) => {
    if (handle) handles.current.set(id, handle);
    else handles.current.delete(id);
  };
  const change = (ids: string[], action: () => void) => {
    if (ids.some((id) => handles.current.get(id)?.busy())) {
      onError(new Error('Várd meg a folyamatban lévő mentést.'));
      return;
    }
    setDialogError('');
    const dirty = ids.filter((id) => handles.current.get(id)?.dirty());
    if (dirty.length) setPendingChange({ ids: dirty, action });
    else action();
  };
  const finish = () => {
    dialog.current?.close();
    setPendingChange(null);
  };
  const match = (text: string, query: string) =>
    String(text)
      .toLocaleLowerCase('hu-HU')
      .includes(String(query).trim().toLocaleLowerCase('hu-HU'));
  const partners = [...data.allPartners].sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  const chosen = partners.find((p) => p.id === pricePartner);
  return (
    <>
      <Heading
        eyebrow="TERMÉKEK"
        title="Rendelhető termékek és árak"
        description="Nettó árak rendelési egységenként. A korábbi rendelések ára nem változik."
      />
      <p className="notice warning">
        Hiányzó ár esetén a partner nem adhatja le a rendelést. Az akciók minden partnerre
        érvényesek.
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
          Partner keresése
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
            onChange={(e) => {
              const next = e.target.value;
              change([...handles.current.keys()], () => onPartnerSelect(next));
            }}
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
      <p className="pricing-context" role="status">
        Árkörnyezet: <strong>{chosen ? 'Egyedi árak · ' + chosen.name : 'Alapárak'}</strong>
      </p>
      <div className="stack section-gap pricing-products">
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
              register={register}
              change={change}
            />
          </div>
        ))}
      </div>
      {pendingChange && (
        <dialog
          ref={dialog}
          aria-labelledby="pricing-unsaved-title"
          onCancel={(e) => {
            e.preventDefault();
            if (!saving) finish();
          }}
        >
          <h2 id="pricing-unsaved-title">Nem mentett módosítások</h2>
          <p>Mentsd vagy vesd el a módosításokat a váltás előtt.</p>
          <div className="dialog-actions">
            <button type="button" className="button secondary" disabled={saving} onClick={finish}>
              Maradok
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={saving}
              onClick={() => {
                pendingChange.ids.forEach((id) => handles.current.get(id)?.discard());
                pendingChange.action();
                finish();
              }}
            >
              Elvetem
            </button>
            <button
              type="button"
              className="button primary"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  for (const id of pendingChange.ids)
                    if (!(await handles.current.get(id)?.save())) {
                      setDialogError(
                        'A mentés nem sikerült. Válaszd a Maradok lehetőséget, és ellenőrizd a megadott értékeket vagy a hibaüzenetet.',
                      );
                      return;
                    }
                  pendingChange.action();
                  finish();
                } finally {
                  setSaving(false);
                }
              }}
            >
              Mentés és váltás
            </button>
          </div>
          {dialogError && (
            <p role="alert" className="notice warning">
              {dialogError}
            </p>
          )}
          <p className="small muted">Ha a mentés sikertelen, az értékek a helyükön maradnak.</p>
        </dialog>
      )}
    </>
  );
}
