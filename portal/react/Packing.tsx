import React from 'react';
import { Heading } from './Heading';
interface Item {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  spitWeight?: number;
}
interface PackingData {
  responses: {
    id: string;
    kind: string;
    partnerName: string;
    contactPhone?: string;
    followUp?: string | null;
    address: string;
    items: Item[];
    note?: string;
  }[];
  totals: Pick<Item, 'name' | 'quantity' | 'unit'>[];
  routes: { id: string; name: string }[];
}
interface PackingProps {
  data: PackingData;
  date: string;
  route: string;
  onFilter(date: string, route: string): void;
}
function Packing({ data, date, route, onFilter }: PackingProps) {
  const responses = data.responses.filter((r) => r.kind === 'order');
  const quantity2 = (n: number) =>
    new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 2 }).format(n);
  return (
    <div className="staff-workspace packing-page">
      <Heading
        eyebrow="KISZÁLLÍTÁS"
        title="Összekészítési lista"
        description="A kiválasztott nap és túra rendelései alapján, az archivált rendelésekkel együtt."
      />
      <form id="filters" className="filters staff-filter-bar" onSubmit={(e) => e.preventDefault()}>
        <label>
          Kiszállítás napja
          <input
            name="date"
            type="date"
            value={date}
            required
            onChange={(e) => {
              if (e.target.value) onFilter(e.target.value, route);
            }}
          />
        </label>
        <label>
          Túra
          <select name="route" value={route} onChange={(e) => onFilter(date, e.target.value)}>
            <option value="">Minden túra</option>
            {data.routes.map((r) => (
              <option value={r.id} key={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </form>
      <section className="card section-gap packing-summary">
        <div className="staff-section-title">
          <div>
            <span className="staff-kicker">ÖSSZEKÉSZÍTENDŐ</span>
            <h2>Termékek összesen</h2>
          </div>
          <span className="staff-count">{responses.length} rendelés</span>
        </div>
        <div className="stack section-gap">
          {data.totals.length ? (
            data.totals.map((i) => (
              <div className="total-line" key={i.name + ':' + i.unit}>
                <strong>{i.name}</strong>
                <strong>
                  {quantity2(i.quantity)} {i.unit}
                </strong>
              </div>
            ))
          ) : (
            <p className="staff-empty-copy">
              Erre a kiválasztásra nincs rendelés. Válassz másik napot vagy túrát.
            </p>
          )}
        </div>
      </section>
      <div className="staff-section-title section-gap">
        <h2>Partnerenként</h2>
        <span className="staff-count">{responses.length} rendelés</span>
      </div>
      <div className="order-grid section-gap">
        {responses.map((r) => (
          <article className="card packing-partner" key={r.id}>
            <h3>{r.partnerName}</h3>
            <p className="muted">{r.address}</p>
            <p>
              Kapcsolattartó:{' '}
              {r.contactPhone ? (
                <a href={'tel:' + r.contactPhone.replace(/[^+0-9]/g, '')}>{r.contactPhone}</a>
              ) : (
                'Nincs megadva telefonszám'
              )}
            </p>
            {r.followUp && r.followUp !== 'ok' && (
              <p className="notice warning">
                <strong>Telefonos egyeztetés szükséges lehet:</strong>{' '}
                {r.followUp === 'below'
                  ? 'a mennyiség várhatóan kevés'
                  : 'a mennyiség ellenőrzést igényel'}
              </p>
            )}
            <ul className="history-items">
              {r.items.map((i) => (
                <li key={i.productId + ':' + i.unit + ':' + i.spitWeight}>
                  {i.name} · {quantity2(i.quantity)}{' '}
                  {i.spitWeight
                    ? `nyárs · ${i.spitWeight} kg / nyárs · ${i.spitWeight * i.quantity} kg`
                    : i.unit}
                </li>
              ))}
            </ul>
            {r.note && (
              <p>
                <strong>Megjegyzés:</strong> {r.note}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
export { Packing };
