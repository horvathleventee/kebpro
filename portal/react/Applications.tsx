import React, { useState, useRef } from 'react';
import { Heading } from './Heading';
interface Application {
  id: string;
  status: string;
  company: string;
  contact: string;
  phone: string;
  address: string;
  username: string;
}
interface Route {
  id: string;
  name: string;
}
interface Actions {
  onApprove(id: string, routes: FormDataEntryValue[]): Promise<unknown>;
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
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const routeIds = new FormData(event.currentTarget).getAll('routeIds');
    pending.current = true;
    setBusy(true);
    try {
      await onApprove(user.id, routeIds);
      setDirty(false);
    } catch (error) {
      onError(error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <span className="badge amber">Jóváhagyásra vár</span>
      <h2>{user.company}</h2>
      <p>
        {user.contact} · {user.phone}
      </p>
      <p>{user.address}</p>
      <p className="muted">Felhasználónév: {user.username}</p>
      <form
        id={'application-' + user.id}
        data-application={user.id}
        data-dirty={dirty ? 'true' : undefined}
        className="section-gap"
        onChange={() => setDirty(true)}
        onSubmit={submit}
      >
        <p>Kiszállítási napok (legalább egy)</p>
        <div className="route-checks">
          {routes.map((route) => (
            <label className="check-line" key={route.id}>
              <input type="checkbox" name="routeIds" value={route.id} />
              {route.name}
            </label>
          ))}
        </div>
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
    <>
      <Heading
        eyebrow="PARTNERHOZZÁFÉRÉSEK"
        title="Regisztrációk"
        description={
          pending.length +
          ' kérelem vár elbírálásra. Jóváhagyáskor jelöld ki a partner kiszállítási napjait.'
        }
      />
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
      <section className="card section-gap">
        <h2>Elbírált kérelmek</h2>
        {data.applications
          .filter((u) => u.status !== 'pending')
          .map((u) => (
            <p key={u.id}>
              {u.company} · {u.username} — {u.status === 'approved' ? 'Jóváhagyva' : 'Elutasítva'}
            </p>
          ))}
      </section>
    </>
  );
}
