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
  Pager,
  SessionSettings,
} from './shared';
interface HistoryItem {
  productId: string;
  name: string;
  quantity: number;
  spitWeight?: number;
  unit: import('../client/ts/types').OrderUnit;
  unitPrice?: number | null;
  lineTotal?: number | null;
}
interface HistoryOrder {
  id: string;
  status: string;
  kind: string;
  date: string;
  createdAt: string;
  archivedAt?: string | null;
  statusUpdatedAt?: string | null;
  items: HistoryItem[];
  total?: number | null;
  note?: string;
  canEdit?: boolean;
  revision?: number;
  requestId?: string;
  changeIds?: string[];
  routeName?: string;
  delivery?: { date: string; route: string; cutoffDate: string; cutoff: string; open: boolean };
}
interface ComplaintActions {
  onSend(id: string, values: FormData): Promise<unknown>;
  onRefresh(): Promise<unknown>;
  onError(error: unknown): void;
}
function ComplaintForm({
  orderId,
  onSend,
  onRefresh,
  onError,
}: ComplaintActions & { orderId: string }) {
  const [busy, setBusy] = React.useState(false),
    [dirty, setDirty] = React.useState(false),
    [success, setSuccess] = React.useState(false),
    [errorMessage, setErrorMessage] = React.useState(''),
    pending = React.useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget,
      values = new FormData(form);
    pending.current = true;
    setBusy(true);
    setSuccess(false);
    setErrorMessage('');
    try {
      await onSend(orderId, values);
      form.reset();
      setDirty(false);
      setSuccess(true);
    } catch (error) {
      setErrorMessage(
        (error instanceof Error ? error.message : 'A küldés nem sikerült.') +
          ' Az üzenet és a kiválasztott képek megmaradtak; ellenőrizd az adatokat, majd próbáld újra.',
      );
      onError(error);
      return;
    } finally {
      pending.current = false;
      setBusy(false);
    }
    try {
      await onRefresh();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <form
      id={'complaint-' + orderId}
      data-complaint-order={orderId}
      data-dirty={dirty ? 'true' : undefined}
      onChange={() => setDirty(true)}
      onSubmit={submit}
    >
      {success && (
        <p className="complaint-submit-success" role="status">
          ✓ A bejelentésedet sikeresen elküldtük.
        </p>
      )}
      <label>
        Írd le, mi volt a probléma
        <textarea name="message" maxLength={2000} required rows={4} disabled={busy} />
      </label>
      <label>
        Kép a termékről vagy a problémáról
        <input name="photo" type="file" accept="image/*" required disabled={busy} />
      </label>
      <label>
        Kép a termékjelölő címkéről
        <input name="labelPhoto" type="file" accept="image/*" required disabled={busy} />
        <small>A képeket feltöltés előtt automatikusan tömörítjük.</small>
      </label>
      {errorMessage && (
        <p className="notice warning" role="alert">
          {errorMessage}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? 'Küldés…' : 'Bejelentés elküldése'}
      </button>
    </form>
  );
}
function History({
  data,
  onEdit,
  onRepeat,
  onPage,
  onSend,
  onRefresh,
  onError,
}: ComplaintActions & {
  data: {
    history: HistoryOrder[];
    historyPage: React.ComponentProps<typeof Pager>['info'];
    complaints?: { orderId?: string | null }[];
  };
  onEdit(id: string): void;
  onRepeat(id: string): void;
  onPage(page: number): void;
}) {
  return (
    <>
      <Heading
        eyebrow="KORÁBBI RENDELÉSEK"
        title="Rendeléseim"
        description="Az archivált rendelések 3 hónapig maradnak meg. A mentett rendelési listáid nem törlődnek."
      />
      <div className="stack">
        {data.history.length ? (
          data.history.map((r) => (
            <article className="card history-card" key={r.id}>
              <div>
                <div className="history-badges">
                  <Badge status={r.status} />
                  {data.complaints?.some((complaint) => complaint.orderId === r.id) && (
                    <span className="badge amber">Bejelentve</span>
                  )}
                </div>
                <h3>{dateLabel(r.date)}</h3>
                {r.routeName && <p className="muted small">Túra: {r.routeName}</p>}
                <p className="muted small">Azonosító: {r.id.slice(0, 8).toUpperCase()}</p>
                <OrderProgress order={r} />
                {r.kind === 'order' ? (
                  <ul className="history-items">
                    {r.items.map((item, index) => (
                      <li key={index}>
                        {item.name} · {quantity(item.quantity)}{' '}
                        {item.spitWeight
                          ? `nyárs · ${item.spitWeight} kg / nyárs · ${item.spitWeight * item.quantity} kg`
                          : item.unit}{' '}
                        ·{' '}
                        {item.unitPrice === null || item.unitPrice === void 0
                          ? '\xC1r egyeztetend\u0151'
                          : money(item.unitPrice) +
                            ' / ' +
                            (item.spitWeight ? 'nyárs' : item.unit) +
                            ' \xB7 ' +
                            money(item.lineTotal)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Erre a kiszállításra nem kértél árut.</p>
                )}
                {r.kind === 'order' && (
                  <p>
                    <strong>Összesen: {money(r.total)}</strong>
                  </p>
                )}
                {r.note && <p className="muted small section-gap">{r.note}</p>}
              </div>
              <div className="stack">
                {r.canEdit && (
                  <button
                    className="button primary"
                    data-action="edit-order"
                    data-id={r.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(r.id);
                    }}
                  >
                    Módosítás a határidőig
                  </button>
                )}
                {r.kind === 'order' && (
                  <>
                    <details>
                      <summary>Probléma bejelentése</summary>
                      <ComplaintForm
                        orderId={r.id}
                        onSend={onSend}
                        onRefresh={onRefresh}
                        onError={onError}
                      />
                    </details>
                    <button
                      className="button secondary"
                      data-action="repeat"
                      data-id={r.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRepeat(r.id);
                      }}
                    >
                      Újrarendelés ↺
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="empty">Itt jelennek meg majd a rögzített rendeléseid.</div>
        )}
      </div>
      <Pager info={data.historyPage} kind="history" onPage={onPage} />
    </>
  );
}
export { History };
