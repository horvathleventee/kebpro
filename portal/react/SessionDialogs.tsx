import React, { useLayoutEffect, useRef, useState } from 'react';
import { SessionExplanation } from './SessionExplanation';
export function PushWelcome({
  supported,
  denied,
  onEnable,
  onLater,
  onClose,
}: {
  supported: boolean;
  denied: boolean;
  onEnable(): Promise<void>;
  onLater(): void;
  onClose(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useLayoutEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function enable() {
    setBusy(true);
    setError('');
    try {
      await onEnable();
      dialog.current?.close();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'A művelet nem sikerült.');
    } finally {
      setBusy(false);
    }
  }
  function later() {
    onLater();
    dialog.current?.close();
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="push-welcome-title"
      onClose={onClose}
      onCancel={() => onLater()}
    >
      <h2 id="push-welcome-title">Szeretnél értesítéseket kapni?</h2>
      <p>
        Az engedélyezéssel a rendelési emlékeztetők mellett a hírekről és akciókról szóló
        értesítéseket is bekapcsolod. Ezeket később külön kikapcsolhatod a Beállításokban.
      </p>
      <p>
        {denied
          ? 'Az értesítéseket korábban letiltottad. Engedélyezd őket a böngésző vagy telefon beállításaiban.'
          : !supported
            ? 'iPhone-on először a Megosztás → Főképernyőhöz adás menüvel telepítsd az appot, majd onnan nyisd meg. Ha ott sem elérhető, ellenőrizd a böngésző támogatását.'
            : 'A következő lépésben a böngésző engedélyét is meg kell adnod.'}
      </p>
      <p className="small muted">
        A kézbesítés az eszköz és a háttérszolgáltatás működésétől is függ.
      </p>
      <p role="alert" id="push-welcome-error">
        {error}
      </p>
      <div className="dialog-actions">
        <button className="button secondary" id="push-later" onClick={later}>
          Most nem
        </button>
        {supported && !denied && (
          <button className="button primary" id="push-accept" disabled={busy} onClick={enable}>
            Értesítések bekapcsolása
          </button>
        )}
      </div>
    </dialog>
  );
}
export function SessionRenewal({
  staff,
  expiresAt,
  onRenew,
  onLater,
  onClose,
}: {
  staff: boolean;
  expiresAt: string;
  onRenew(): Promise<void>;
  onLater(): void;
  onClose(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    pending = useRef(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useLayoutEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function renew() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await onRenew();
      dialog.current?.close();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'A művelet nem sikerült.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function cancel(event: React.SyntheticEvent<HTMLDialogElement>) {
    if (pending.current) {
      event.preventDefault();
      return;
    }
    onLater();
  }
  return (
    <dialog ref={dialog} aria-labelledby="renew-title" onClose={onClose} onCancel={cancel}>
      <h2 id="renew-title">Hamarosan lejár a belépésed</h2>
      <p>
        A belépésed lejárata:{' '}
        <strong>
          {new Date(expiresAt).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })}
        </strong>
        .
      </p>
      <p>
        Szeretnél ezen az eszközön a megerősítéstől számított további {staff ? 7 : 90} napig
        bejelentkezve maradni?
      </p>
      <SessionExplanation staff={staff} />
      <p role="alert" id="renew-error">
        {error}
      </p>
      <div className="dialog-actions">
        <button
          className="button secondary"
          id="renew-later"
          disabled={busy}
          onClick={() => {
            onLater();
            dialog.current?.close();
          }}
        >
          Most nem
        </button>
        <button className="button primary" id="renew-accept" disabled={busy} onClick={renew}>
          Igen, maradjak bejelentkezve
        </button>
      </div>
    </dialog>
  );
}
