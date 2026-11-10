import React, { useState, useRef } from 'react';
import { Heading } from './Heading';
import { AddressPicker } from './AddressPicker';
interface Application {
  id: string;
  status: string;
  company: string;
  contact: string;
  phone: string;
  address: string;
  username: string;
  trackingAddressSuggestion?: { id: string; address: string; latitude: number; longitude: number; source?: string };
}
interface Route {
  id: string;
  name: string;
}
interface Actions {
  onApprove(id: string, routes: FormDataEntryValue[], addressCheck?: { suggestionId: string; address: string; latitude: number; longitude: number }): Promise<unknown>;
  onReject(id: string): void;
  onError(error: unknown): void;
}
function ApplicationCard({
  user,
  routes,
  onApprove,
  onReject,
  onError,
}: Actions & { user: Application; routes: Route[] }) {
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    pending = useRef(false);
  const suggestion = user.trackingAddressSuggestion?.address === user.address ? user.trackingAddressSuggestion : undefined;
  const [point, setPoint] = useState(suggestion ? { latitude: suggestion.latitude, longitude: suggestion.longitude } : null);
  const [confirmed, setConfirmed] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const routeIds = new FormData(event.currentTarget).getAll('routeIds');
    pending.current = true;
    setBusy(true);
    try {
      await onApprove(user.id, routeIds, confirmed && suggestion && point ? { suggestionId: suggestion.id, address: user.address, ...point } : undefined);
      setDirty(false);
    } catch (error) {
      onError(error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="card application-card">
      <span className="badge amber">Jóváhagyásra vár</span>
      <h2>{user.company}</h2>
      <p>
        {user.contact} · {user.phone}
      </p>
      <p>{user.address}</p>
      <p className="muted">Felhasználónév: {user.username}</p>
      {suggestion && <div className="application-map">
        <strong>Szállítási pont ellenőrzése</strong>
        <p className="small muted">A jelölő a partner címválasztását mutatja. Ha szükséges, kattintással pontosíthatod.</p>
        <AddressPicker key={user.id + ':' + suggestion.id} compact initialPoint={suggestion} onSelect={(latitude, longitude) => { setPoint({latitude, longitude}); setConfirmed(false); setDirty(true); }} />
        <label className="check-line"><input type="checkbox" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setDirty(true); }} /> Ellenőriztem, hogy a jelölő a szállítási címet mutatja.</label>
        <p className="small muted">A pontot a hozzáféréssel együtt hagyhatod jóvá. Ha most nem ellenőrzöd, később is megteheted.</p>
      </div>}
      <form
        id={'application-' + user.id}
        data-application={user.id}
        data-dirty={dirty ? 'true' : undefined}
        className="section-gap"
        onChange={() => setDirty(true)}
        onSubmit={submit}
      >
        <fieldset className="application-routes">
          <legend>Kiszállítási napok (legalább egy)</legend>
          <div className="route-checks">
            {routes.map((route) => (
              <label className="check-line" key={route.id}>
                <input type="checkbox" name="routeIds" value={route.id} />
                {route.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="button-row">
          <button className="button primary" disabled={busy}>
            Hozzáférés jóváhagyása
          </button>
          <button
            type="button"
            className="button secondary"
            data-action="reject-application"
            data-id={user.id}
            disabled={busy}
            onClick={() => onReject(user.id)}
          >
            Elutasítás
          </button>
        </div>
      </form>
    </section>
  );
}
export function Applications({
  data,
  onApprove,
  onReject,
  onError,
}: Actions & { data: { applications: Application[]; routes: Route[] } }) {
  const pending = data.applications.filter((u) => u.status === 'pending');
  return (
    <div className="staff-workspace applications-page">
      <Heading
        eyebrow="PARTNERHOZZÁFÉRÉSEK"
        title="Regisztrációk"
        description={
          pending.length +
          ' kérelem vár elbírálásra. Jóváhagyáskor jelöld ki a partner kiszállítási napjait.'
        }
      />
      <div className="staff-section-title">
        <h2>Elbírálásra vár</h2>
        <span className="staff-count">{pending.length}</span>
      </div>
      <div className="stack">
        {pending.length ? (
          pending.map((user) => (
            <ApplicationCard
              key={user.id}
              user={user}
              routes={data.routes}
              onApprove={onApprove}
              onReject={onReject}
              onError={onError}
            />
          ))
        ) : (
          <div className="card empty">Nincs jóváhagyásra váró regisztráció.</div>
        )}
      </div>
      <section className="card section-gap application-reviewed">
        <h2>Elbírált kérelmek</h2>
        {!data.applications.some((u) => u.status !== 'pending') && (
          <p className="muted">Még nincs elbírált kérelem.</p>
        )}
        {data.applications
          .filter((u) => u.status !== 'pending')
          .map((u) => (
            <p key={u.id}>
              {u.company} · {u.username} — {u.status === 'approved' ? 'Jóváhagyva' : 'Elutasítva'}
            </p>
          ))}
      </section>
    </div>
  );
}
