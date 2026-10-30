import React from 'react';
import { Heading } from './Heading';
interface Item {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
}
interface PackingData {
  responses: {
    id: string;
    kind: string;
    partnerName: string;
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
    <>
      <Heading
        eyebrow="KISZÁLLÍTÁS"
        title="Összekészítési lista"
        description="A kiválasztott nap és túra rendelései alapján, az archivált rendelésekkel együtt."
      />
      <form id="filters" className="filters" onSubmit={(e) => e.preventDefault()}>
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
      <section className="card section-gap">
        <h2>Összesen · {responses.length} rendelés</h2>
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
            <p>Erre a kiválasztásra nincs rendelés.</p>
          )}
        </div>
      </section>
      <h2 className="section-gap">Partnerenként</h2>
      <div className="order-grid section-gap">
        {responses.map((r) => (
          <article className="card" key={r.id}>
            <h3>{r.partnerName}</h3>
            <p className="muted">{r.address}</p>
            <ul className="history-items">
              {r.items.map((i) => (
                <li key={i.productId + ':' + i.unit}>
                  {i.name} · {quantity2(i.quantity)} {i.unit}
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
    </>
  );
}
export { Packing };
