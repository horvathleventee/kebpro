import React from 'react';
import { Heading, dateLabel, timeLabel, ComplaintPhotos } from './shared';

type StaffComplaint = {
  id: string;
  status: string;
  resolvedAt?: string | null;
  revision?: number;
  reply?: string | null;
  orderId?: string | null;
  orderDate?: string | null;
  partnerName: string;
  createdAt: string;
  message: string;
  photoId?: string | null;
  labelPhotoId?: string | null;
};
interface ComplaintActions {
  onReply(values: {
    id: string;
    reply: FormDataEntryValue | null;
    status: FormDataEntryValue | null;
    expectedRevision: number;
  }): Promise<unknown>;
  onError(error: unknown): void;
}
function RetentionInfo({ complaint: c }: { complaint: StaffComplaint }) {
  if (c.status !== 'resolved') return null;
  const closed = Date.parse(c.resolvedAt || '');
  if (!Number.isFinite(closed))
    return (
      <p className="notice">
        A lezárt bejelentés megőrzési ideje a következő háttérellenőrzéskor indul. A mentéshez
        használd a letöltés gombot.
      </p>
    );
  const expiry = closed + 28 * 864e5;
  const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 864e5));
  return (
    <p className={remaining <= 7 ? 'notice complaint-retention-warning' : 'small muted'}>
      {remaining <= 7 ? '⚠ ' : ''}Automatikus törlés leghamarabb:{' '}
      {new Date(expiry).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })}.{' '}
      {remaining <= 7
        ? 'Ha szükséged van rá, töltsd le: törlés után már nem lesz elérhető.'
        : 'A bejelentés és a képek letölthetők a törlés előtt.'}
    </p>
  );
}
type Draft = { reply: string; status: string; revision: number };
const draftKey = (id: string) => 'kebpro-complaint-draft-' + id;
function readDraft(c: StaffComplaint): Draft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(draftKey(c.id)) || 'null');
    if (
      value &&
      typeof value.reply === 'string' &&
      ['open', 'resolved'].includes(value.status) &&
      Number.isInteger(value.revision)
    )
      return value;
  } catch {
    /* Storage is optional. */
  }
  return null;
}
function writeDraft(id: string, draft: Draft | null) {
  try {
    if (draft) sessionStorage.setItem(draftKey(id), JSON.stringify(draft));
    else sessionStorage.removeItem(draftKey(id));
  } catch {
    /* The in-memory draft remains available. */
  }
}
function ReplyForm({
  complaint,
  onReply,
  onError,
  onSaved,
}: ComplaintActions & { complaint: StaffComplaint; onSaved(message: string): void }) {
  const [draft, setDraft] = React.useState<Draft>(
    () =>
      readDraft(complaint) || {
        reply: complaint.reply || '',
        status: complaint.status,
        revision: complaint.revision || 1,
      },
  );
  const [dirty, setDirty] = React.useState(() => Boolean(readDraft(complaint)));
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const pending = React.useRef(false);
  React.useEffect(() => {
    if (!dirty && !busy)
      setDraft({
        reply: complaint.reply || '',
        status: complaint.status,
        revision: complaint.revision || 1,
      });
  }, [complaint.reply, complaint.status, complaint.revision, dirty, busy]);
  function change(next: Draft) {
    setDraft(next);
    setDirty(true);
    setMessage('');
    writeDraft(complaint.id, next);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      await onReply({
        id: complaint.id,
        reply: draft.reply,
        status: draft.status,
        expectedRevision: draft.revision,
      });
      writeDraft(complaint.id, null);
      setDirty(false);
      onSaved('A válasz és az állapot mentve: ' + complaint.partnerName + '.');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'A mentés nem sikerült.';
      setMessage(text + ' A nem mentett válasz megmaradt.');
      onError(error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      id={'complaint-reply-' + complaint.id}
      data-complaint-reply={complaint.id}
      data-revision={draft.revision}
      data-dirty={dirty ? 'true' : undefined}
      className="complaint-reply"
      onSubmit={submit}
    >
      <h3>Válasz a partnernek</h3>
      {complaint.status === 'resolved' && (
        <p className="small">
          Mentett válasz:{' '}
          <span className="complaint-saved-reply">{complaint.reply || 'Még nincs válasz.'}</span>
        </p>
      )}
      <label>
        Válasz szövege
        <textarea
          name="reply"
          maxLength={2000}
          rows={4}
          value={draft.reply}
          disabled={busy}
          onChange={(event) => change({ ...draft, reply: event.target.value })}
        />
      </label>
      <div className="complaint-reply-actions">
        <label>
          Állapot
          <select
            name="status"
            value={draft.status}
            disabled={busy}
            onChange={(event) => change({ ...draft, status: event.target.value })}
          >
            <option value="open">Nyitott</option>
            <option value="resolved">Lezárva</option>
          </select>
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? 'Mentés…' : 'Válasz és állapot mentése'}
        </button>
      </div>
      {dirty && (
        <div className="complaint-draft-actions">
          <span className="small muted">Nem mentett módosítások</span>
          <button
            type="button"
            className="button text-button"
            disabled={busy}
            onClick={() => {
              writeDraft(complaint.id, null);
              setDraft({
                reply: complaint.reply || '',
                status: complaint.status,
                revision: complaint.revision || 1,
              });
              setDirty(false);
              setMessage('');
            }}
          >
            Módosítások elvetése
          </button>
        </div>
      )}
      {message && (
        <p role="alert" className="notice warning">
          {message}
        </p>
      )}
    </form>
  );
}
function StaffComplaints({
  data,
  onReply,
  onPhoto,
  onExport,
  onError,
}: ComplaintActions & {
  data: { allPartners: { complaints?: StaffComplaint[] }[] };
  onPhoto(id: string, label: string): void;
  onExport(id: string): Promise<unknown>;
}) {
  const [view, setView] = React.useState<'open' | 'resolved'>('open');
  const [search, setSearch] = React.useState('');
  const [feedback, setFeedback] = React.useState('');
  const list = data.allPartners
    .flatMap((p) => p.complaints || [])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const counts = {
    open: list.filter((c) => c.status !== 'resolved').length,
    resolved: list.filter((c) => c.status === 'resolved').length,
  };
  const query = search.trim().toLocaleLowerCase('hu-HU');
  const visible = (c: StaffComplaint) =>
    (c.status === 'resolved' ? 'resolved' : 'open') === view &&
    (!query ||
      [
        c.partnerName,
        c.message,
        c.reply,
        c.orderId,
        c.orderDate,
        c.createdAt,
        c.orderId ? 'rendelés reklamáció' : 'általános visszajelzés',
      ].some((value) => (value || '').toLocaleLowerCase('hu-HU').includes(query)));
  const shown = list.filter(visible).length;
  return (
    <>
      <Heading
        eyebrow="PARTNERI VISSZAJELZÉSEK"
        title="Bejelentések"
        description="Partneri visszajelzések és reklamációk kezelése."
      />
      <div className="complaint-toolbar">
        <div className="complaint-views" role="group" aria-label="Bejelentések nézete">
          <button
            type="button"
            className={'button ' + (view === 'open' ? 'primary' : 'secondary')}
            aria-pressed={view === 'open'}
            onClick={() => setView('open')}
          >
            Aktív bejelentések <span>{counts.open}</span>
          </button>
          <button
            type="button"
            className={'button ' + (view === 'resolved' ? 'primary' : 'secondary')}
            aria-pressed={view === 'resolved'}
            onClick={() => setView('resolved')}
          >
            Lezárt bejelentések <span>{counts.resolved}</span>
          </button>
        </div>
        <p className="small muted">A lezárt bejelentések a megőrzési idő után törlődhetnek.</p>
      </div>
      <label className="complaint-search">
        Keresés a bejelentések között
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Partner, üzenet, válasz vagy rendelés"
        />
      </label>
      <p role="status" className="small">
        {feedback}
      </p>
      <div className="stack">
        {!shown && (
          <p className="card">
            {query
              ? 'Nincs a keresésnek megfelelő bejelentés ebben a nézetben.'
              : view === 'open'
                ? 'Nincs aktív bejelentés.'
                : 'Nincs lezárt bejelentés.'}
          </p>
        )}
        {list.map((c) => (
          <article
            hidden={!visible(c)}
            className={
              'card complaint-card ' + (c.status === 'open' && c.orderId ? 'complaint-urgent' : '')
            }
            key={c.id}
          >
            <div className="complaint-card-heading">
              <h2>{c.partnerName}</h2>
              <span
                className={
                  'badge ' +
                  (c.status === 'resolved' ? 'green' : c.orderId ? 'complaint-alert' : 'amber')
                }
              >
                {c.status === 'resolved'
                  ? 'Lezárt'
                  : c.orderId
                    ? '❗ Nyitott reklamáció'
                    : 'Nyitott'}
              </span>
            </div>
            <div className="complaint-meta">
              <p>
                {c.orderId
                  ? 'Rendelés: ' +
                    (c.orderDate ? dateLabel(c.orderDate) : '–') +
                    ' · #' +
                    c.orderId.slice(0, 8).toUpperCase()
                  : 'Általános visszajelzés'}
              </p>
              <p>Beérkezett: {timeLabel(c.createdAt)}</p>
            </div>
            <div className="complaint-panels">
              <section className="complaint-panel">
                <h3>Partner üzenete</h3>
                <p className="complaint-message">{c.message}</p>
                <div className="complaint-photos">
                  <ComplaintPhotos complaint={c} admin onView={onPhoto} />
                </div>
              </section>
              <section className="complaint-panel">
                <ReplyForm
                  complaint={c}
                  onReply={onReply}
                  onError={onError}
                  onSaved={setFeedback}
                />
              </section>
            </div>
            <RetentionInfo complaint={c} />
            <button
              type="button"
              className="button secondary section-gap"
              data-action="export-complaint"
              data-id={c.id}
              onClick={() => onExport(c.id).catch(onError)}
            >
              Bejelentés mentése képekkel
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
export { StaffComplaints };
