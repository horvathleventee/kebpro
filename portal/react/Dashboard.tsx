import React from 'react';
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
interface DashboardOrder {
  revision?: number;
  status: string;
  id: string;
  partnerName: string;
  address: string;
  date: string;
  routeId: string;
  sameDayOrderCount?: number;
  createdAt: string;
  modifiedAt?: string | null;
  archivedAt?: string | null;
  kind: string;
  items: {
    name: string;
    quantity: number;
    unit: string;
    unitPrice?: number | null;
    lineTotal?: number | null;
  }[];
  total?: number | null;
  note?: string;
}
interface DashboardData {
  allOrders?: DashboardOrder[];
  todo?: { date?: string; missing?: number; pending?: number };
  allPartners: {
    complaints?: { status: string; orderId?: string | null; resolvedAt?: string | null }[];
  }[];
  orderCounts?: { new: number; archived: number };
  routes: { id: string; name: string }[];
  orderPage: React.ComponentProps<typeof Pager>['info'];
}
interface DashboardProps {
  data: DashboardData;
  orderView: string;
  archiveSort: string;
  archiveDate: string;
  orderSearch: string;
  onView(value: string): void;
  onCalls(): void;
  onSort(value: string): void;
  onDate(value: string): void;
  onSearch(value: string): void;
  onArchive(order: DashboardOrder, archive: boolean): Promise<void>;
  onPage(page: number): void;
}
function Dashboard({
  data,
  orderView,
  archiveSort,
  archiveDate,
  orderSearch,
  onView,
  onCalls,
  onSort,
  onDate,
  onSearch,
  onArchive,
  onPage,
}: DashboardProps) {
  const [searchValue, setSearchValue] = React.useState(orderSearch);
  React.useEffect(() => setSearchValue(orderSearch), [orderSearch]);
  const all = data.allOrders || [],
    archived = orderView === 'archived',
    t = data.todo || {},
    complaints = data.allPartners.flatMap((p) => p.complaints || []),
    open = complaints.filter((c) => c.status === 'open' && c.orderId).length,
    expiring = complaints.filter(
      (c) =>
        c.status === 'resolved' &&
        Number.isFinite(Date.parse(c.resolvedAt || '')) &&
        Date.parse(c.resolvedAt!) + 28 * 864e5 <= Date.now() + 7 * 864e5,
    ).length;
  return (
    <>
      <section className="section-gap">
        <h2>Napi teendők</h2>
        <p className="muted">Mai rendelési nap: {t.date ? dateLabel(t.date) : ''}</p>
        <div className="todo-grid">
          <button className="card todo-card" data-action="todo-new" onClick={() => onView('new')}>
            <strong>{data.orderCounts?.new || 0}</strong>
            <span>Feldolgozatlan rendelés</span>
          </button>
          <button
            className="card todo-card"
            data-action="todo-calls"
            onClick={(event) => {
              event.stopPropagation();
              onCalls();
            }}
          >
            <strong>{t.missing || 0}</strong>
            <span>Mai rendelési határidőre nem válaszolt</span>
          </button>
          <a className="card todo-card" href="#applications">
            <strong>{t.pending || 0}</strong>
            <span>Jóváhagyásra váró regisztráció</span>
          </a>
        </div>
      </section>
      {expiring > 0 && (
        <p className="notice complaint-retention-warning">
          ⚠ {expiring} lezárt bejelentés hamarosan törlődik.{' '}
          <a href="#complaints">Nézd át és szükség esetén töltsd le →</a>
        </p>
      )}
      <p className="section-gap">
        <a className={open ? 'complaint-dashboard-alert' : void 0} href="#complaints">
          {open
            ? '\u2757 ' + open + ' nyitott reklam\xE1ci\xF3'
            : 'Bejelent\xE9sek: ' +
              complaints.filter((c) => c.status === 'open').length +
              ' nyitott'}{' '}
          →
        </a>
      </p>
      <Heading
        eyebrow="RENDELÉSEK"
        title="Rendelések"
        description="Az új rendeléseket a pipával helyezheted az archívumba."
      />
      <div className="order-tabs two-tabs" aria-label="Rendelési kategóriák">
        {(
          [
            ['new', '\xDAj rendel\xE9sek', data.orderCounts?.new || 0],
            ['archived', 'Archiv\xE1lt rendel\xE9sek', data.orderCounts?.archived || 0],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            className={'button ' + (orderView === key ? 'primary' : 'secondary')}
            data-action="order-view"
            data-view={key}
            onClick={() => onView(key)}
            aria-pressed={orderView === key}
          >
            {label} <span>{count}</span>
          </button>
        ))}
      </div>
      {archived ? (
        <div className="card archive-filters">
          <label>
            Rendezés és napszűrés alapja
            <select
              id="archive-sort"
              defaultValue={archiveSort}
              onChange={(e) => onSort(e.target.value)}
            >
              <option value="createdAt">Rendelés időpontja</option>
              <option value="archivedAt">Archiválás időpontja</option>
            </select>
          </label>
          <label>
            Nap (üresen: minden nap)
            <input
              id="archive-date"
              type="date"
              key={archiveDate}
              defaultValue={archiveDate}
              onChange={(e) => onDate(e.target.value)}
            />
          </label>
          <button
            className="button secondary"
            data-action="clear-archive-date"
            onClick={() => onDate('')}
          >
            Minden nap
          </button>
          <p className="small muted">
            Legfrissebb elöl. A napszűrés a fent kiválasztott időpontra vonatkozik.
          </p>
        </div>
      ) : (
        <p className="muted section-gap">
          Minden még nem archivált rendelés, kiszállítási naptól függetlenül.
        </p>
      )}
      <label className="order-search section-gap">
        Partner vagy rendelési azonosító keresése
        <input
          id="order-search"
          type="search"
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value);
            onSearch(event.target.value);
          }}
          placeholder="Keresés…"
        />
      </label>
      <div className="order-grid">
        {all.map((r) => (
          <article
            className={'card order-card ' + (archived ? 'status-ready' : 'status-received')}
            key={r.id}
          >
            <div className="card-header">
              <span className={'badge ' + (archived ? 'green' : 'blue')}>
                {archived
                  ? 'Archiv\xE1lt'
                  : r.kind === 'skip'
                    ? 'M\xF3dos\xEDtva \xB7 Lemondva'
                    : r.modifiedAt
                      ? 'M\xF3dos\xEDtva'
                      : '\xDAj rendel\xE9s'}
              </span>
              <span className="muted small">#{r.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <h2>{r.partnerName}</h2>
            {(r.sameDayOrderCount || 0) > 1 && (
              <p className="notice warning">
                Ennek a partnernek ezen a napon {r.sameDayOrderCount} külön rendelése van.
              </p>
            )}
            <p className="muted">{r.address}</p>
            <p className="order-meta">
              <strong>Kiszállítás: {dateLabel(r.date)}</strong>
              <br />
              {data.routes.find((t2) => t2.id === r.routeId)?.name}
              <br />
              Rendelés: {timeLabel(r.createdAt)}
              {r.modifiedAt && (
                <>
                  <br />
                  Módosítva: {timeLabel(r.modifiedAt)}
                </>
              )}
              {archived && (
                <>
                  <br />
                  Archiválás: {timeLabel(r.archivedAt!)}
                </>
              )}
            </p>
            <ul className="order-lines">
              {r.items.map((i, index) => (
                <li key={index}>
                  <span>{i.name}</span>
                  <strong>
                    {quantity(i.quantity)} {i.unit} ·{' '}
                    {i.unitPrice === null || i.unitPrice === void 0
                      ? '\xC1r egyeztetend\u0151'
                      : money(i.unitPrice) + ' / ' + i.unit + ' \xB7 ' + money(i.lineTotal)}
                  </strong>
                </li>
              ))}
            </ul>
            <p>
              <strong>Összesen: {money(r.total)}</strong>
            </p>
            {r.note && (
              <div className="order-note">
                <strong>Megjegyzés</strong>
                <p>{r.note}</p>
              </div>
            )}
            <button
              className={
                'button ' +
                (archived ? 'secondary' : 'primary') +
                ' full archive-button section-gap'
              }
              data-action={archived ? 'restore-order' : 'archive-order'}
              data-id={r.id}
              onClick={async (event) => {
                const button = event.currentTarget;
                button.disabled = true;
                try {
                  await onArchive(r, !archived);
                } finally {
                  button.disabled = false;
                }
              }}
            >
              {archived
                ? 'Vissza az \xFAj rendel\xE9sekhez'
                : '\u2713 Kezeltem \xB7 Archiv\xE1l\xE1s'}
            </button>
          </article>
        ))}
      </div>
      {!all.length && (
        <div className="card empty">
          {archived
            ? 'Nincs a sz\u0171r\xE9snek megfelel\u0151 archiv\xE1lt rendel\xE9s.'
            : 'Nincs \xFAj rendel\xE9s. A be\xE9rkez\u0151 rendel\xE9sek automatikusan megjelennek.'}
        </div>
      )}
      <Pager info={data.orderPage} kind="orders" onPage={onPage} />
    </>
  );
}
export { Dashboard };
