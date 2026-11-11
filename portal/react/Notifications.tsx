import React, { useEffect, useRef, useState } from 'react';
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
  onEnable(): Promise<unknown>;
  onDisable(): Promise<unknown>;
  onStatus(): Promise<'on' | 'off' | 'denied' | 'unsupported'>;
  onGroup(group: string, open: boolean): void;
}
function Notifications({
  data,
  audit,
  openGroups,
  onReminder,
  onEnable,
  onDisable,
  onStatus,
  onGroup,
}: NotificationProps) {
  const [deviceStatus, setDeviceStatus] = useState<
    'checking' | 'on' | 'off' | 'denied' | 'unsupported' | 'error'
  >('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;
  async function refreshStatus() {
    setDeviceStatus('checking');
    try {
      setDeviceStatus(await statusRef.current());
    } catch {
      setDeviceStatus('error');
    }
  }
  useEffect(() => {
    void refreshStatus();
    const visible = () => {
      if (!document.hidden) void refreshStatus();
    };
    document.addEventListener('visibilitychange', visible);
    return () => document.removeEventListener('visibilitychange', visible);
  }, []);
  async function changeDevice() {
    setBusy(true);
    setError('');
    try {
      await (deviceStatus === 'on' ? onDisable() : onEnable());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'A művelet nem sikerült.');
    } finally {
      await refreshStatus();
      setBusy(false);
    }
  }
  const retention = data.retention || {},
    operations = data.operations || {},
    operationTime = (value: string) =>
      new Date(value).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' });
  return (
    <div className="staff-workspace notifications-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ÉRTESÍTÉSI KÖZPONT</span>
          <h1>Értesítési napló</h1>
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
        <p role="status" className={deviceStatus === 'on' ? 'settings-success' : 'muted'}>
          {deviceStatus === 'checking' && 'Az eszköz állapotának ellenőrzése…'}
          {deviceStatus === 'on' && 'Az admin értesítések ezen az eszközön be vannak kapcsolva.'}
          {deviceStatus === 'off' && 'Az admin értesítések ezen az eszközön nincsenek bekapcsolva.'}
          {deviceStatus === 'denied' &&
            'A telefon vagy a böngésző tiltja az értesítéseket. Engedélyezd az alkalmazást a telefon beállításaiban.'}
          {deviceStatus === 'unsupported' &&
            'Az értesítések itt nem támogatottak. iPhone-on a főképernyőre telepített alkalmazást nyisd meg.'}
          {deviceStatus === 'error' && 'Az eszköz állapotát nem sikerült ellenőrizni.'}
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="settings-actions">
          {(deviceStatus === 'on' || deviceStatus === 'off') && (
            <button
              className="button secondary"
              data-action={deviceStatus === 'on' ? 'staff-disable-push' : 'staff-enable-push'}
              disabled={busy}
              onClick={() => void changeDevice()}
            >
              {deviceStatus === 'on'
                ? 'Értesítések kikapcsolása ezen az eszközön'
                : 'Admin értesítések bekapcsolása'}
            </button>
          )}
          {(deviceStatus === 'error' ||
            deviceStatus === 'denied' ||
            deviceStatus === 'unsupported') && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void refreshStatus()}
            >
              Állapot újraellenőrzése
            </button>
          )}
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
        <p className="muted">Legfeljebb 400 esemény, legfrissebb elöl, 20-as csoportokban.</p>
        {audit.length ? (
          Array.from({ length: Math.ceil(audit.length / 20) }, (_, index) => {
            const start = index * 20,
              chunk = audit.slice(start, start + 20),
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
    </div>
  );
}
export { Notifications };
