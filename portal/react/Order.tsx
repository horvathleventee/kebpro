import React from 'react';
import { getUnitPrice, getLinePrice, summarizeCart } from '../client/ts/order-pricing';
import {
  Heading,
  dateLabel,
  dateShort,
  timeLabel,
  Badge,
  OrderProgress,
  NewsCard,
  money,
  quantity,
  ComplaintPhotos,
  PartnerComplaints,
  Pager,
  SessionSettings,
} from './shared';
import type { PricedProduct, PricedOrderItem } from '../client/ts/types';
import type { createOrderActions } from '../client/ts/order-actions';
type Product = PricedProduct & { name: string };
type Item = PricedOrderItem & { name: string };
interface Delivery {
  date: string;
  route: string;
  cutoffDate: string;
  cutoff: string;
  open: boolean;
}
interface OrderProps {
  data: {
    products: Product[];
    deliveryOptions: Delivery[];
    templates: { id: string; name: string; items: Item[] }[];
  };
  next: Delivery;
  response: { status: string; id: string; canEdit?: boolean } | null;
  cart: Item[];
  note: string;
  editing: { id: string; revision: number } | null;
  actions: ReturnType<typeof createOrderActions>;
  cartRevision: string;
}
function Order({ data, next, response, cart, note, editing, actions, cartRevision }: OrderProps) {
  const [noteValue, setNoteValue] = React.useState(note);
  const [, setCartVersion] = React.useState(0);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  React.useEffect(() => setNoteValue(note), [note]);
  const unavailable = cart.filter((i) => !data.products.some((p) => p.id === i.productId));
  const price = (item: Item) => getUnitPrice(data.products, item);
  const line = (item: Item) => getLinePrice(data.products, item);
  const summary = summarizeCart(data.products, cart);
  return (
    <>
      <label className="card delivery-picker">
        Melyik kiszállításra rendelsz?
        <select
          key={next.date}
          id="order-delivery"
          defaultValue={next.date}
          onChange={(event) => {
            event.stopPropagation();
            actions.selectDelivery(event.target.value, event.target);
          }}
        >
          {!data.deliveryOptions.some((d) => d.date === next.date) && (
            <option value={next.date}>{dateLabel(next.date)} · Lejárt / nem elérhető</option>
          )}
          {data.deliveryOptions.map((d) => (
            <option key={d.date} value={d.date}>
              {dateLabel(d.date)} · {d.route}
              {d.open ? '' : ' \xB7 Lez\xE1rt'}
            </option>
          ))}
        </select>
      </label>
      <details className="card section-gap">
        <summary>★ Mentett rendelési listáim ({data.templates.length})</summary>
        <p className="muted">A betöltés csak a kosarat tölti ki, rendelést nem küld be.</p>
        {data.templates.map((t) => (
          <div className="saved-list" key={t.id}>
            <strong>{t.name}</strong>
            <span>{t.items.length} tétel</span>
            <button
              className="button secondary"
              data-action="load-template"
              data-id={t.id}
              onClick={(event) => {
                event.stopPropagation();
                actions.loadTemplate(t.id);
              }}
            >
              Betöltés
            </button>
            <button
              className="button text-button"
              data-action="delete-template"
              data-id={t.id}
              onClick={(event) => {
                event.stopPropagation();
                actions.deleteTemplate(t.id);
              }}
            >
              Törlés
            </button>
          </div>
        ))}
        {!data.templates.length && <p>Ments el egy összeállított kosarat szokásos rendelésként.</p>}
      </details>
      <Heading
        eyebrow="RENDELÉS"
        title="Mit készítsünk össze?"
        description={
          'Kisz\xE1ll\xEDt\xE1s: ' +
          dateLabel(next.date) +
          ' \xB7 Hat\xE1rid\u0151: ' +
          dateShort(next.cutoffDate) +
          ' ' +
          next.cutoff +
          ' \xB7 Az \xE1rak nett\xF3 \xE9rt\xE9kek'
        }
      />
      {response && !editing ? (
        <section className="success-panel">
          <h2>Erre a kiszállításra már válaszoltál.</h2>
          <p>
            <Badge status={response.status} />
          </p>
          <p>Azonosító: {response.id.slice(0, 8).toUpperCase()}</p>
          {response.canEdit && (
            <button
              className="button primary"
              data-action="edit-order"
              data-id={response.id}
              onClick={(event) => {
                event.stopPropagation();
                actions.edit(response.id);
              }}
            >
              Válasz / rendelés módosítása
            </button>
          )}
          <a className="button secondary" href="#history">
            Rendeléseim megtekintése
          </a>
        </section>
      ) : !next.open ? (
        <div className="notice warning">
          A rendelési határidő lejárt. Módosítás vagy új rendelés miatt keresd a Kebpro
          munkatársait.
        </div>
      ) : (
        <>
          {editing && (
            <p className="notice">
              Meglévő válasz módosítása. Csak a véglegesítéssel mentődik.
              <button
                className="button text-button"
                data-action="cancel-edit"
                onClick={(event) => {
                  event.stopPropagation();
                  actions.cancelEdit();
                }}
              >
                Mégsem
              </button>
            </p>
          )}
          <div className="card">
            <form
              id="add-product"
              className="product-add"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (actions.add(new FormData(event.currentTarget))) setSelectedProduct(null);
              }}
              key={JSON.stringify(cart)}
            >
              <div className="field">
                <label htmlFor="product">Termék</label>
                <input
                  type="hidden"
                  id="product"
                  name="productId"
                  value={selectedProduct?.id || ''}
                />
                <button
                  className="button secondary product-trigger"
                  type="button"
                  data-action="choose-product"
                  onClick={(event) => {
                    event.stopPropagation();
                    actions.chooseProduct(setSelectedProduct);
                  }}
                  id="product-label"
                >
                  {selectedProduct ? selectedProduct.name : 'Válassz terméket… ▾'}
                </button>
              </div>
              <div className="field">
                <label htmlFor="quantity">Mennyiség</label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0.01"
                  max="10000"
                  step="0.01"
                  defaultValue="1"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="unit">Egység</label>
                <select id="unit" name="unit">
                  <option>kg</option>
                  <option>db</option>
                  <option>karton</option>
                </select>
              </div>
              <button className="button primary" type="submit">
                Hozzáadom
              </button>
            </form>
            {unavailable.length > 0 && (
              <p className="notice warning" role="alert">
                <strong>Most nem rendelhető:</strong> {unavailable.map((i) => i.name).join(', ')}.
                Távolítsd el ezeket a kosárból a beküldés előtt. A többi tétel megmarad.
              </p>
            )}
            <div className="cart-items">
              {cart.length ? (
                cart.map((item, index) => (
                  <div
                    className="cart-line"
                    key={item.productId + ':' + item.unit + ':' + cartRevision}
                  >
                    <strong>{item.name}</strong>
                    <label>
                      Mennyiség
                      <input
                        type="number"
                        min="0.01"
                        max="10000"
                        step="0.01"
                        data-cart-quantity={index}
                        onInput={(event) => {
                          event.stopPropagation();
                          actions.quantity(index, event.currentTarget.value);
                          setCartVersion((v) => v + 1);
                        }}
                        defaultValue={item.quantity}
                        aria-label={item.name + ' mennyis\xE9ge'}
                      />
                    </label>
                    <span>{item.unit}</span>
                    <span data-line-price={index}>
                      {money(price(item))} / {item.unit} · {money(line(item))}
                    </span>
                    <button
                      data-action="remove-item"
                      data-index={index}
                      onClick={(event) => {
                        event.stopPropagation();
                        actions.remove(index);
                      }}
                      aria-label={item.name + ' elt\xE1vol\xEDt\xE1sa'}
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty">
                  Még üres a rendelésed. Válassz terméket a fenti listából.
                </div>
              )}
            </div>
            <label htmlFor="order-note">Megjegyzés a rendeléshez</label>
            <textarea
              id="order-note"
              maxLength={1000}
              rows={3}
              placeholder="Van valami, amire figyeljünk?"
              value={noteValue}
              onChange={(event) => {
                event.stopPropagation();
                setNoteValue(event.target.value);
                actions.note(event.target.value);
              }}
            />
            <button
              type="button"
              className="button secondary section-gap"
              data-action="save-template"
              onClick={(event) => {
                event.stopPropagation();
                actions.saveTemplate();
              }}
              disabled={!cart.length}
            >
              ★ Kosár mentése listaként
            </button>
            <div className="cart-footer">
              <p>
                {cart.length} különböző termék · <strong id="cart-total">{summary}</strong>
              </p>
              <button
                className="button primary"
                data-action="review"
                onClick={(event) => {
                  event.stopPropagation();
                  actions.review();
                }}
                disabled={!cart.length}
              >
                Rendelés áttekintése →
              </button>
            </div>
          </div>
          <div className="skip-delivery-panel section-gap">
            <div>
              <strong>Most nincs szükséged szállításra?</strong>
              <p>Jelezd itt, és a Kebpro munkatársai látják a válaszodat.</p>
            </div>
            <button
              className="button skip-delivery"
              data-action="skip"
              onClick={(event) => {
                event.stopPropagation();
                actions.skip();
              }}
            >
              <span aria-hidden="true">✓</span> Most nem kérek szállítást
            </button>
          </div>
        </>
      )}
    </>
  );
}
export { Order };
