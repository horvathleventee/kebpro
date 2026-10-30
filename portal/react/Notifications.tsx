import React from 'react';
import { dateShort } from './shared';
interface AuditField {
  key: string;
  label: string;
  before: string;
  after: string;
}
interface AuditEvent {
  id: string;
  label: string;
  at: string;
  actorName: string;
  changes: { label: string; fields: AuditField[] }[];
}
interface NotificationsData {
  retention?: { lastRun?: string; deleted?: number };
  operations?: { lastTick?: string; backupAt?: string; pushMode?: string; lastError?: string };
  outbox: {
    id: string;
    staffUserId?: string;
    partnerId?: string;
    title: string;
    body: string;
    createdAt: string;
    status: string;
  }[];
  allPartners: { id: string; name: string }[];
}
interface NotificationProps {
  data: NotificationsData;
  audit: AuditEvent[];
  openGroups: string[];
  onReminder(): void;
  onEnable(): void;
  onDisable(): void;
  onGroup(group: string, open: boolean): void;
}
function Notifications({
  data,
  audit,
  openGroups,
  onReminder,
  onEnable,
  onDisable,
  onGroup,
}: NotificationProps) {
  const retention = data.retention || {},
    operations = data.operations || {},
    operationTime = (value: string) =>
      new Date(value).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' }),
    statuses: Record<string, string> = {
      simulation: 'Helyi pr\xF3ba',
      pending: 'K\xFCld\xE9sre v\xE1r',
      complete: 'K\xFCld\xE9si k\xEDs\xE9rletek lez\xE1rva',
      cancelled: 'Visszavonva',
      no_devices: 'Nincs feliratkozott eszk\xF6z',
    };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ÉRTESÍTÉSI KÖZPONT</span>
          <h1>Küldési napló</h1>
          <p>Itt követheted az elkészített értesítéseket és a küldési módot.</p>
        </div>
        <button className="button secondary" data-action="reminders" onClick={onReminder}>
          Emlékeztetők ellenőrzése
        </button>
      </div>
      <section className="card section-gap">
        <h2>Admin értesítések ezen az eszközön</h2>
        <p>
          Új rendelésről, bejelentésről és regisztrációról értesítést kaphatsz. iPhone-on előbb add
          az adminfelületet a főképernyőhöz, és onnan nyisd meg.
        </p>
        <div className="settings-actions">
          <button className="button primary" data-action="staff-enable-push" onClick={onEnable}>
            Admin értesítések bekapcsolása
          </button>
          <button className="button secondary" data-action="staff-disable-push" onClick={onDisable}>
            Értesítések kikapcsolása ezen az eszközön
          </button>
        </div>
        <p className="small muted">A háttérben küldés állapotát lent ellenőrizheted.</p>
      </section>
      <p className="notice">
        A még nem válaszoló partnerek a rendelési nap előtti este 17:00-kor és a rendelési napon
        10:00-kor kapnak emlékeztetőt. Hétfői kiszállításnál a rendelési nap péntek. A kézbesítés a
        háttérfolyamat és az eszköz működésétől függ.
      </p>
      <section className="card section-gap">
        <h2>Rendelési előzmények megőrzése</h2>
        <p>
          A legalább 3 hónapja archivált, elmúlt kiszállítású rendelések automatikusan törlődnek. A
          kezeletlen rendelések és a mentett rendelési listák megmaradnak.
        </p>
        <p>
          Törlés naponta, csak friss, sikeres adatmentés után történik. A mentések saját megőrzési
          idejük szerint járnak le.
        </p>
        <p>
          Utolsó ellenőrzés:{' '}
          {retention.lastRun ? operationTime(retention.lastRun) : 'M\xE9g nem futott'} · Legutóbb
          törölve: {retention.deleted || 0}
        </p>
      </section>
      <section className="card section-gap">
        <h2>Háttérfolyamatok</h2>
        <p>
          Utolsó ellenőrzés:{' '}
          {operations.lastTick ? operationTime(operations.lastTick) : 'M\xE9g nem futott'}
        </p>
        <p>
          Utolsó adatmentés:{' '}
          {operations.backupAt
            ? operationTime(operations.backupAt)
            : 'M\xE9g nincs sikeres ment\xE9s'}
        </p>
        <p>
          Push:{' '}
          {operations.pushMode === 'live'
            ? 'T\xE1voli k\xFCld\xE9s bekapcsolva'
            : 'Helyi szimul\xE1ci\xF3'}
        </p>
        {operations.lastError && <p className="notice">{operations.lastError}</p>}
      </section>
      <section className="card section-gap">
        <h2>Munkatársi eseménynapló</h2>
        <p className="muted">Legfeljebb 400 esemény, legfrissebb elöl, 50-es csoportokban.</p>
        {audit.length ? (
          Array.from({ length: Math.ceil(audit.length / 50) }, (_, index) => {
            const start = index * 50,
              chunk = audit.slice(start, start + 50),
              group = String(index);
            return (
              <details
                data-audit-group={group}
                onToggle={(event) => onGroup(group, event.currentTarget.open)}
                open={openGroups.includes(group)}
                key={group}
              >
                <summary>
                  {start + 1}–{start + chunk.length}. esemény
                </summary>
                {chunk.map((e) => (
                  <details className="audit-entry" key={e.id}>
                    <summary>
                      <strong>{e.label}</strong>
                      <span>
                        {operationTime(e.at)} · {e.actorName}
                      </span>
                    </summary>
                    {e.changes.map((c, i) => (
                      <section className="audit-change" key={i}>
                        <strong>{c.label}</strong>
                        {c.fields.length ? (
                          c.fields.map((f) => (
                            <div className="audit-field" key={f.key}>
                              <span>{f.label}</span>
                              <div>
                                <span className="audit-before">{f.before}</span>
                                <span aria-hidden="true"> → </span>
                                <strong>{f.after}</strong>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="small muted">Rögzített módosítás</p>
                        )}
                      </section>
                    ))}
                  </details>
                ))}
              </details>
            );
          })
        ) : (
          <p>Még nincs naplózott módosítás.</p>
        )}
      </section>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Partner</th>
              <th>Értesítés</th>
              <th>Időpont</th>
              <th>Állapot</th>
            </tr>
          </thead>
          <tbody>
            {data.outbox.map((n) => (
              <tr key={n.id}>
                <td>
                  {n.staffUserId
                    ? 'C\xE9ges munkat\xE1rs'
                    : data.allPartners.find((p) => p.id === n.partnerId)?.name}
                </td>
                <td>
                  <strong>{n.title}</strong>
                  {n.body}
                </td>
                <td>{dateShort(n.createdAt)}</td>
                <td>
                  <span className="badge amber">{statuses[n.status] || n.status} </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.outbox.length && <div className="empty">Még nem készült értesítés.</div>}
      </div>
    </>
  );
}
export { Notifications };
