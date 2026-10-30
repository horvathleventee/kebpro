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
  const expiry = closed + 28 * 864e5,
    remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 864e5));
  return (
    <p className={remaining <= 7 ? 'notice complaint-retention-warning' : 'small muted'}>
      {remaining <= 7 ? '\u26A0 ' : ''}Automatikus törlés leghamarabb:{' '}
      {new Date(expiry).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })}.{' '}
      {remaining <= 7
        ? 'Ha sz\xFCks\xE9ged van r\xE1, t\xF6ltsd le: t\xF6rl\xE9s ut\xE1n m\xE1r nem lesz el\xE9rhet\u0151.'
        : 'A bejelent\xE9s \xE9s a k\xE9pek let\xF6lthet\u0151k a t\xF6rl\xE9s el\u0151tt.'}
    </p>
  );
}
function ReplyForm({
  complaint,
  onReply,
  onError,
}: ComplaintActions & { complaint: StaffComplaint }) {
  const [busy, setBusy] = React.useState(false),
    [dirty, setDirty] = React.useState(false),
    pending = React.useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const values = new FormData(event.currentTarget);
    pending.current = true;
    setBusy(true);
    try {
      await onReply({
        id: complaint.id,
        reply: values.get('reply'),
        status: values.get('status'),
        expectedRevision: complaint.revision || 1,
      });
      setDirty(false);
    } catch (error) {
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
      data-revision={complaint.revision || 1}
      data-dirty={dirty ? 'true' : undefined}
      className="section-gap"
      onChange={() => setDirty(true)}
      onSubmit={submit}
    >
      <label>
        Válasz a partnernek
        <textarea name="reply" maxLength={2000} rows={3} defaultValue={complaint.reply || ''} />
      </label>
      <label>
        Állapot
        <select name="status" defaultValue={complaint.status}>
          <option value="open">Nyitott</option>
          <option value="resolved">Lezárva</option>
        </select>
      </label>
      <button className="button primary" disabled={busy}>
        Válasz és állapot mentése
      </button>
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
  const list = data.allPartners
    .flatMap((p) => p.complaints || [])
    .sort(
      (a, b) =>
        Number(a.status === 'resolved') - Number(b.status === 'resolved') ||
        b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <>
      <Heading
        eyebrow="PARTNERI VISSZAJELZÉSEK"
        title="Bejelentések"
        description="A partnerek rendeléshez kapcsolódó problémáit itt lehet megválaszolni és lezárni."
      />
      <div className="stack">
        {list.length ? (
          list.map((c) => (
            <article
              className={'card ' + (c.status === 'open' && c.orderId ? 'complaint-urgent' : '')}
              key={c.id}
            >
              <span
                className={
                  'badge ' +
                  (c.status === 'resolved' ? 'green' : c.orderId ? 'complaint-alert' : 'amber')
                }
              >
                {c.status === 'resolved'
                  ? 'Lez\xE1rva'
                  : c.orderId
                    ? '\u2757 \xDAj reklam\xE1ci\xF3'
                    : '\xDAj / nyitott'}
              </span>
              <h2>{c.partnerName}</h2>
              <p>
                {c.orderId
                  ? 'Rendel\xE9s: ' +
                    dateLabel(c.orderDate!) +
                    ' \xB7 #' +
                    c.orderId.slice(0, 8).toUpperCase()
                  : '\xC1ltal\xE1nos visszajelz\xE9s'}
              </p>
              <p className="small muted">Beérkezett: {timeLabel(c.createdAt)}</p>
              <p className="complaint-message section-gap">{c.message}</p>
              <ComplaintPhotos complaint={c} admin onView={onPhoto} />
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
              <ReplyForm key={c.revision || 1} complaint={c} onReply={onReply} onError={onError} />
            </article>
          ))
        ) : (
          <p className="card">Még nincs beérkezett bejelentés.</p>
        )}
      </div>
    </>
  );
}
export { StaffComplaints };
