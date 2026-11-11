import React from 'react';
import { AddressPicker } from './AddressPicker';
import { VehicleMap } from './VehicleMap';

type Position = {
  status: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  licensePlate?: string;
};
export function PartnerTracking() {
  const [position, setPosition] = React.useState<Position>({ status: 'unavailable' });
  React.useEffect(() => {
    let active = true,
      serial = 0,
      expiry = 0;
    const refresh = async () => {
      const id = ++serial;
      if (document.hidden) {
        setPosition({ status: 'unavailable' });
        return;
      }
      try {
        const started = performance.now();
        const response = await fetch('/partner/api/tracking', { cache: 'no-store' });
        const next = response.ok ? await response.json() : { status: 'unavailable' };
        if (active && id === serial) {
          window.clearTimeout(expiry);
          const ttl =
            Number(response.headers.get('X-Tracking-Valid-Ms')) - (performance.now() - started);
          if (next.status === 'available' && Number.isFinite(ttl) && ttl > 0) {
            setPosition(next);
            expiry = window.setTimeout(() => setPosition({ status: 'unavailable' }), ttl);
          } else setPosition(next.status === 'available' ? { status: 'unavailable' } : next);
        }
      } catch {
        if (active && id === serial) setPosition({ status: 'unavailable' });
      }
    };
    const visibility = () => {
      void refresh();
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      active = false;
      serial++;
      window.clearInterval(timer);
      window.clearTimeout(expiry);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  const { latitude: lat, longitude: lon } = position;
  const available =
    position.status === 'available' && typeof lat === 'number' && typeof lon === 'number';
  return (
    <section className="card section-gap partner-tracking">
      <span className="fleet-kicker">KISZÁLLÍTÁS KÖVETÉSE</span>
      <h2>Kiszállító jármű</h2>
      <p className="partner-tracking-intro">Kövesd a hozzád tartó járművet a térképen.</p>
      {available ? (
        <>
          <VehicleMap
            selection="partner"
            vehicles={[
              {
                id: 'delivery',
                label: position.licensePlate || 'Kiszállító jármű',
                latitude: lat!,
                longitude: lon!,
              },
            ]}
          />
          <p>
            Rendszám: <strong>{position.licensePlate || 'nem áll rendelkezésre'}</strong>
            <br />
            Utolsó helyadat:{' '}
            {position.timestamp
              ? new Date(position.timestamp).toLocaleString('hu-HU', {
                  timeZone: 'Europe/Budapest',
                })
              : '—'}
          </p>
          <small>
            <a href="https://openfreemap.org/privacy/" target="_blank" rel="noreferrer">
              Térképszolgáltató adatkezelése
            </a>
          </small>
        </>
      ) : (
        <div className="partner-tracking-empty" role="status">
          <span aria-hidden="true">⌖</span>
          <div><strong>{position.status === 'waiting' ? 'A jármű még nincs a közelben' : 'A helyadat jelenleg nem érhető el'}</strong>
          <p>{position.status === 'waiting' ? 'A térkép akkor jelenik meg, amikor a jármű a beállított távolságon belülre ér.' : 'Ha a kiszállítás követhetővé válik, itt láthatod majd a járművet.'}</p></div>
        </div>
      )}
    </section>
  );
}

type AdminData = {
  vehicles: { id: string; label: string; deviceId: string; licensePlate?: string }[];
  routes: { id: string; name: string; days: number[]; reschedules?: { from: string; to: string }[] }[];
  assignments: { id: string; date: string; routeId: string; vehicleId: string; routeName?: string }[];
  partners: {
    id: string;
    name: string;
    address: string;
    verified: boolean;
    verifiedPoint: { latitude: number; longitude: number } | null;
    suggestion: { id: string; latitude: number; longitude: number; source?: string; resultLabel?: string } | null;
  }[];
  orders: { id: string; date: string; address: string; partnerId: string; verified: boolean; verifiedPoint: { latitude: number; longitude: number } | null }[];
};
function tomorrowBudapest() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (name: string) => parts.find((p) => p.type === name)?.value;
  const today = `${get('year')}-${get('month')}-${get('day')}`;
  return new Date(Date.parse(today + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
}
function routeOnDate(route: AdminData['routes'][number], date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const day = new Date(date + 'T12:00:00Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) return false;
  const changes = route.reschedules || [];
  if (changes.some((change) => change.from === date)) return false;
  if (changes.some((change) => change.to === date)) return true;
  return route.days.includes(day.getUTCDay());
}
export function StaffTracking({ fleet }: { fleet: { id: string; label: string }[] }) {
  const [data, setData] = React.useState<AdminData | null>(null);
  const [devices, setDevices] = React.useState<{ id: string; label: string }[]>([]);
  const [devicesUnavailable, setDevicesUnavailable] = React.useState(false);
  const [error, setError] = React.useState('');
  const [date, setDate] = React.useState(tomorrowBudapest);
  const [routeId, setRoute] = React.useState('');
  const [vehicleId, setVehicle] = React.useState('');
  const [label, setLabel] = React.useState('');
  const [deviceId, setDevice] = React.useState('');
  const [editingVehicle, setEditingVehicle] = React.useState('');
  const [registration, setRegistration] = React.useState('');
  const [orderId, setOrder] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');
  const [confirmed, setConfirmed] = React.useState(false);
  const [partnerId, setPartner] = React.useState('');
  const [addressDraft, setAddressDraft] = React.useState('');
  const [partnerPoint, setPartnerPoint] = React.useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [partnerConfirmed, setPartnerConfirmed] = React.useState(false);
  const [suggestionId, setSuggestionId] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const load = async () => {
    const r = await fetch('/partner-admin/api/tracking', { cache: 'no-store' });
    if (!r.ok) throw Error('Az adatok nem érhetők el.');
    setData(await r.json());
    try {
      const response = await fetch('/partner-admin/api/tracking-devices', { cache: 'no-store' });
      if (!response.ok) throw Error('unavailable');
      const result = await response.json();
      if (!Array.isArray(result.devices)) throw Error('unavailable');
      setDevices(result.devices);
      setDevicesUnavailable(false);
    } catch {
      setDevices([]);
      setDevicesUnavailable(true);
    }
  };
  React.useEffect(() => {
    void load().catch(() => setError('Az adatok nem érhetők el.'));
  }, []);
  const save = async (operation: string, body: object) => {
    if (busy) return;
    try {
      setError('');
      setMessage('');
      setBusy(true);
      const csrf =
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
      const r = await fetch('/partner-admin/api/tracking/' + operation, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const result = await r.json();
        throw Error(result.error || 'A mentés sikertelen.');
      }
      await load();
      if (operation === 'assign-device' || operation === 'assignment') setVehicle('');
      if (operation === 'partner-address' || operation === 'delivery-address') {
        setPartnerPoint(null);
        setPartnerConfirmed(false);
        setSuggestionId('');
      }
      setMessage('A módosítást elmentettük.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'A mentés sikertelen.');
    } finally {
      setBusy(false);
    }
  };
  const order = data?.orders.find((o) => o.id === orderId);
  const selectedPartner = data?.partners.find((p) => p.id === partnerId);
  const selectable = devices.length ? devices : fleet;
  const assignment = data?.assignments.find((a) => a.routeId === routeId && a.date === date);
  const assignedVehicle = assignment && data?.vehicles.find((v) => v.id === assignment.vehicleId);
  const routesForDate = data?.routes.filter((r) => routeOnDate(r, date) || data.assignments.some((a) => a.date === date && a.routeId === r.id)) || [];
  const selectedRoute = data?.routes.find((r) => r.id === routeId);
  const routeActive = !!selectedRoute && routeOnDate(selectedRoute, date);
  return (
    <details className="card section-gap tracking-settings">
      <summary><div><h2>Kiszállítások beállítása</h2><p>Túrák, járművek és szállítási pontok kezelése</p></div></summary>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <div className="tracking-settings-content">
      <section className="tracking-panel tracking-assignment">
      <div className="tracking-panel-heading"><span className="tracking-panel-icon" aria-hidden="true">↗</span><div><span className="tracking-panel-kicker">NAPI BEOSZTÁS</span><h3>Túrához rendelés</h3></div></div>
      <p>
        Válaszd ki a kiszállítás napját, a túrát és a hozzá tartozó járművet. A beosztás csak erre a
        napra érvényes.
      </p>
      <div className="tracking-form-grid">
      <label>
        Nap{' '}
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setRoute('');
            setVehicle('');
            setError('');
            setMessage('');
          }}
        />
      </label>{' '}
      <label>
        Túra{' '}
        <select
          value={routeId}
          onChange={(e) => {
            setRoute(e.target.value);
            setVehicle('');
          }}
        >
          <option value="">Válassz</option>
          {routesForDate.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}{routeOnDate(r, date) ? '' : ' · áthelyezve, csak eltávolítás'}
            </option>
          ))}
        </select>
      </label>{' '}
      <label>
        Jármű{' '}
        <select value={vehicleId} onChange={(e) => setVehicle(e.target.value)}>
          <option value="">Válassz járművet</option>
          {assignment && <option value="remove">Hozzárendelés eltávolítása</option>}
          {routeActive && selectable.map((v) => (
            <option key={'fleet:' + v.id} value={'fleet:' + v.id}>
              {v.label}
            </option>
          ))}
          {routeActive && data?.vehicles
            .filter((v) => !selectable.some((f) => f.id === v.deviceId))
            .map((v) => (
              <option key={v.id} value={'saved:' + v.id}>
                {v.label}
              </option>
            ))}
        </select>
      </label>{' '}
      </div>
      {date && data && !routesForDate.length && <p className="small muted">Erre a napra nincs tervezett túra.</p>}
      {selectedRoute && !routeActive && <p className="small muted">Ezt a túrát áthelyezték; a korábbi beosztás itt eltávolítható.</p>}
      <button className="tracking-primary"
        type="button"
        disabled={busy || !date || !routeId || !vehicleId}
        onClick={() =>
          void (vehicleId.startsWith('fleet:')
            ? save('assign-device', { date, routeId, deviceId: vehicleId.slice(6) })
            : save('assignment', {
                date,
                routeId,
                vehicleId: vehicleId.startsWith('saved:') ? vehicleId.slice(6) : null,
              }))
        }
      >
        Hozzárendelés mentése
      </button>
      {routeId && date && (
        <p className="small muted">
          Jelenleg:{' '}
          {assignment
            ? assignedVehicle?.licensePlate || assignedVehicle?.label || 'ismeretlen jármű'
            : 'nincs hozzárendelt jármű'}
        </p>
      )}
      {devicesUnavailable && (
        <p className="small muted">
          A teljes járműlista most nem érhető el; a térképen vagy a helyi katalógusban szereplő
          járművek választhatók.
        </p>
      )}
      <div className="tracking-assignments"><div className="tracking-list-title">Rögzített beosztások <span>{data?.assignments.length ?? 0}</span></div>
      {data && data.assignments.length === 0 && <p className="tracking-list-empty">Még nincs rögzített beosztás.</p>}
      <ul>
        {data?.assignments.map((a) => (
          <li key={a.id}>
            {a.date} · {a.routeName || data.routes.find((r) => r.id === a.routeId)?.name} ·{' '}
            {data.vehicles.find((v) => v.id === a.vehicleId)?.label}
          </li>
        ))}
      </ul></div>
      </section>
      <section className="tracking-panel">
      <div className="tracking-panel-heading"><span className="tracking-panel-icon" aria-hidden="true">⌖</span><div><span className="tracking-panel-kicker">PARTNEREK</span><h3>Partner szállítási pontja</h3></div></div>
      <p>
        Az ellenőrzött pont a partner azonos szállítási című későbbi rendeléseinél is használható.
      </p>
      <label>
        Partner{' '}
        <select
          value={partnerId}
          onChange={(e) => {
            const id = e.target.value,
              selected = data?.partners.find((p) => p.id === id),
              suggestion = selected?.suggestion;
            setPartner(id);
            setAddressDraft(selected?.address || '');
            setPartnerPoint(
              suggestion
                ? { latitude: suggestion.latitude, longitude: suggestion.longitude }
                : null,
            );
            setSuggestionId(suggestion?.id || '');
            setPartnerConfirmed(false);
          }}
        >
          <option value="">Válassz</option>
          {data?.partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.address}{' '}
              {p.suggestion ? '· ellenőrzésre vár' : p.verified ? '· ellenőrzött' : ''}
            </option>
          ))}
        </select>
      </label>
      {selectedPartner && (
        <>
          <label>
            Nyilvántartott szállítási cím{' '}
            <input
              value={addressDraft}
              maxLength={250}
              onChange={(e) => setAddressDraft(e.target.value)}
            />
          </label>{' '}
          <button
            type="button"
            disabled={
              busy || !addressDraft.trim() || addressDraft.trim() === selectedPartner.address
            }
            onClick={() =>
              void save('delivery-address', {
                partnerId,
                expectedAddress: selectedPartner.address,
                address: addressDraft,
              })
            }
          >
            Cím módosítása
          </button>
          <p className="small muted">
            A módosítás a következő rendeléseknél érvényes; a korábban leadott rendelések címét nem
            írja át.
          </p>
          <p>
            <strong>{selectedPartner.address}</strong>
            {selectedPartner.suggestion ? ' · Ellenőrzésre váró javaslat' : ''}
          </p>
          {selectedPartner.suggestion?.source === 'address-search' && <p className="small muted">Automatikus találat: {selectedPartner.suggestion.resultLabel}. Ellenőrizd, hogy valóban a szállítási helyet mutatja.</p>}
          {selectedPartner.suggestion && selectedPartner.verifiedPoint ? <p className="small muted">Narancs: új javaslat. Kék: jelenleg jóváhagyott pont, amely a követéshez érvényes.</p> : selectedPartner.verifiedPoint ? <p className="small muted">A térképen a jelenleg jóváhagyott szállítási pont látható. A módosításhoz jelölj ki új pontot, és hagyd jóvá.</p> : null}
          <AddressPicker
            key={
              selectedPartner.id +
              ':' +
              selectedPartner.address +
              ':' +
              (selectedPartner.suggestion?.id || '') + ':' + JSON.stringify(selectedPartner.verifiedPoint)
            }
            initialPoint={selectedPartner.suggestion || selectedPartner.verifiedPoint || undefined}
            referencePoint={selectedPartner.suggestion ? selectedPartner.verifiedPoint || undefined : undefined}
            onSelect={(latitude, longitude) => {
              setPartnerPoint({ latitude, longitude });
              setSuggestionId('');
              setPartnerConfirmed(false);
            }}
          />
          <label className="tracking-confirm">
            <input
              type="checkbox"
              checked={partnerConfirmed}
              onChange={(e) => setPartnerConfirmed(e.target.checked)}
              disabled={!partnerPoint || busy}
            />{' '}
            Ellenőriztem, hogy a pont ehhez a címhez tartozik.
          </label>{' '}
          <button
            type="button"
            disabled={!partnerPoint || !partnerConfirmed || busy}
            onClick={() =>
              void save('partner-address', {
                partnerId,
                address: selectedPartner.address,
                ...partnerPoint,
                ...(suggestionId ? { suggestionId } : {}),
              })
            }
          >
            Szállítási pont jóváhagyása
          </button>
        </>
      )}
      </section>
      <details className="tracking-panel tracking-order-panel">
      <summary><span className="tracking-panel-icon" aria-hidden="true">⌖</span><span><span className="tracking-panel-kicker">ELTÉRŐ CÍM ESETÉN</span><strong>Rendelés szállítási pontja</strong><small>Ha egy rendelés címe eltér a partner szokásos címétől</small></span></summary>
      <h3>Szállítási cím koordinátáinak ellenőrzése</h3>
      <p>
        Válaszd ki a rendelést, majd jelöld a térképen a szállítás pontos helyét. A helyet elég
        egyszer ellenőrizni.
      </p>
      <label>
        Rendelés{' '}
        <select
          value={orderId}
          onChange={(e) => {
            setOrder(e.target.value);
            setConfirmed(false);
            setLatitude('');
            setLongitude('');
          }}
        >
          <option value="">Válassz</option>
          {data?.orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.date} · {o.address} {o.verified ? '✓' : ''}
            </option>
          ))}
        </select>
      </label>{' '}
      {order && (<>
        {order.verifiedPoint && <p className="small muted">A térképen a rendelés címéhez jelenleg használt ellenőrzött pont látható.</p>}
        <AddressPicker
          key={order.id + ':' + JSON.stringify(order.verifiedPoint)}
          initialPoint={order.verifiedPoint || undefined}
          onSelect={(lat, lon) => {
            setLatitude(lat.toFixed(6));
            setLongitude(lon.toFixed(6));
            setConfirmed(false);
          }}
        />
      <div className="tracking-coordinate-grid">
      <label>
        Szélesség{' '}
        <input
          type="number"
          step="any"
          value={latitude}
          onChange={(e) => {
            setLatitude(e.target.value);
            setConfirmed(false);
          }}
        />
      </label>{' '}
      <label>
        Hosszúság{' '}
        <input
          type="number"
          step="any"
          value={longitude}
          onChange={(e) => {
            setLongitude(e.target.value);
            setConfirmed(false);
          }}
        />
      </label>{' '}
      </div>
      <label className="tracking-confirm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />{' '}
        Ellenőriztem, hogy a kijelölt pont a rendelés szállítási címe.
      </label>{' '}
      <button
        type="button"
        disabled={!order || !latitude || !longitude || !confirmed}
        onClick={() =>
          void save('address', {
            orderId,
            address: order?.address,
            latitude: Number(latitude),
            longitude: Number(longitude),
          })
        }
      >
        Cím ellenőrzése
      </button>
      </>)}
      </details>
      <details className="tracking-advanced">
        <summary>Jármű adatainak kézi kezelése</summary>
        <h3>Jármű felvétele vagy módosítása</h3>
        <label>
          Meglévő jármű{' '}
          <select
            value={editingVehicle}
            onChange={(e) => {
              const id = e.target.value,
                vehicle = data?.vehicles.find((v) => v.id === id);
              setEditingVehicle(id);
              setLabel(vehicle?.label || '');
              setDevice(vehicle?.deviceId || '');
              setRegistration(vehicle?.licensePlate || '');
            }}
          >
            <option value="">Új jármű</option>
            {data?.vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>{' '}
        <label>
          Jármű neve <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>{' '}
        <label>
          Eszközazonosító <input value={deviceId} onChange={(e) => setDevice(e.target.value)} />
        </label>{' '}
        <label>
          Rendszám (ha az API-ban hiányzik){' '}
          <input value={registration} onChange={(e) => setRegistration(e.target.value)} />
        </label>{' '}
        <button
          type="button"
          onClick={() =>
            void save('vehicle', {
              ...(editingVehicle ? { id: editingVehicle } : {}),
              label,
              deviceId,
              licensePlate: registration,
            })
          }
        >
          Jármű mentése
        </button>
      </details>
      </div>
    </details>
  );
}
