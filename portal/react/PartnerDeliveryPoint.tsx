import React from 'react';
import { AddressPicker } from './AddressPicker';

export function PartnerDeliveryPoint({ requiredOnly = false }: { requiredOnly?: boolean }) {
  const [state, setState] = React.useState<{
    address: string;
    pending: boolean;
    verified: boolean;
    required: boolean;
  } | null>(null);
  const wasRequired = React.useRef(false);
  const [editing, setEditing] = React.useState(false);
  const [point, setPoint] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  async function load() {
    const response = await fetch('/partner/api/tracking-address', { cache: 'no-store' });
    if (!response.ok) throw Error('A szállítási hely nem érhető el.');
    const next = await response.json();
    if (next.required) {
      wasRequired.current = true;
      setEditing(true);
    }
    setState(next);
  }
  React.useEffect(() => {
    void load().catch(() => setMessage('A szállítási hely nem érhető el.'));
  }, []);
  async function submit() {
    if (!state || !point || !confirmed || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const csrf =
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
      const response = await fetch('/partner/api/tracking-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ address: state.address, ...point }),
      });
      if (!response.ok)
        throw Error('A helyet nem sikerült beküldeni. Frissítsd az oldalt, és próbáld újra.');
      await load();
      setEditing(false);
      setPoint(null);
      setConfirmed(false);
      setMessage('A javaslatot elküldtük ellenőrzésre.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'A mentés nem sikerült.');
    } finally {
      setBusy(false);
    }
  }
  if (requiredOnly && state && !state.required && !wasRequired.current) return null;
  return (
    <section className="card section-gap">
      <span className="partner-section-label">SZÁLLÍTÁSI HELY</span>
      <h2>Szállítási pont a térképen</h2>
      {state?.required && (
        <p className="notice">
          Az első rendelés előtt kötelező megjelölni és beküldeni a szállítás pontos helyét. A
          beküldés után rendelhetsz, a pontot munkatársunk ellenőrzi.
        </p>
      )}
      {state ? (
        <>
          <p>{state.address || 'Nincs megadott szállítási cím.'}</p>
          <p className="small muted">Ha a cím nem megfelelő, kérd munkatársunkat a javítására.</p>
          <p className="small muted">
            {state.pending
              ? 'A javaslat munkatársi ellenőrzésre vár.'
              : state.verified
                ? 'A szállítási pont ellenőrizve van.'
                : 'A szállítási pont még nincs ellenőrizve.'}
          </p>
          {!state.required && (
            <button
              type="button"
              className="button secondary"
              disabled={!state.address || busy}
              onClick={() => {
                setEditing(!editing);
                setPoint(null);
                setConfirmed(false);
              }}
            >
              {editing ? 'Mégse' : 'Szállítási pont megjelölése'}
            </button>
          )}
          {editing && (
            <div>
              <p>
                Jelöld meg a fenti cím pontos szállítási helyét. Munkatársunk ellenőrzi a
                javaslatot.
              </p>
              <AddressPicker
                onSelect={(latitude, longitude) => {
                  setPoint({ latitude, longitude });
                  setConfirmed(false);
                }}
              />
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={!point || busy}
                />{' '}
                Megerősítem, hogy a jelölés a fenti szállítási címet mutatja.
              </label>
              <button
                type="button"
                className="button primary"
                disabled={!point || !confirmed || busy}
                onClick={() => void submit()}
              >
                Beküldés ellenőrzésre
              </button>
            </div>
          )}
        </>
      ) : null}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
