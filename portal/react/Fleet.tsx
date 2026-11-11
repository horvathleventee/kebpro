import React from 'react';
import { StaffTracking } from './Tracking';
import { VehicleMap } from './VehicleMap';

type Vehicle = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timestamp: string;
};

export function Fleet(_props: { active: boolean }) {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [selected, setSelected] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [updated, setUpdated] = React.useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  React.useEffect(() => {
    let active = true,
      sequence = 0;
    const refresh = async () => {
      const serial = ++sequence;
      if (document.hidden) return;
      try {
        const r = await fetch('/partner-admin/api/tracking-fleet', { cache: 'no-store' });
        if (!r.ok) throw Error();
        const data = await r.json();
        if (!Array.isArray(data.vehicles)) throw Error();
        if (active && serial === sequence) {
          setVehicles(data.vehicles);
          setSelected((current) =>
            current && !data.vehicles.some((v: Vehicle) => v.id === current) ? '' : current,
          );
          setUpdated(new Date());
          setError('');
        }
      } catch {
        if (active && serial === sequence) {
          setVehicles([]);
          setError('A flotta helyadatai jelenleg nem érhetők el. Próbáld újra később.');
        }
      } finally {
        if (active && serial === sequence) setLoading(false);
      }
    };
    const visibility = () => {
      if (!document.hidden) void refresh();
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      active = false;
      sequence++;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [refreshKey]);
  const shown = selected ? vehicles.filter((v) => v.id === selected) : vehicles;
  const formatTime = (value: string | Date) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Nem ismert'
      : date.toLocaleString('hu-HU', {
          timeZone: 'Europe/Budapest',
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          day: 'numeric',
        });
  };
  return (
    <div className="fleet-page">
      <header className="fleet-heading">
        <div>
          <span className="eyebrow">LOGISZTIKA / JÁRMŰKÖVETÉS</span>
          <h1>Flotta áttekintése</h1>
          <p>A járművek helyzete és a kiszállítások beállításai egy helyen.</p>
        </div>
        <span className="fleet-badge">
          <span aria-hidden="true" /> MUNKATÁRSI NÉZET
        </span>
      </header>
      <section className="fleet-overview" aria-label="Flotta áttekintése">
        <div>
          <span>MEGJELENÍTHETŐ JÁRMŰVEK</span>
          <strong>{loading ? '–' : vehicles.length}</strong>
          <small>friss helyadattal</small>
        </div>
        <div>
          <span>UTOLSÓ SIKERES FRISSÍTÉS</span>
          <strong className="fleet-update">{updated ? formatTime(updated) : '–'}</strong>
          <small>automatikusan, percenként</small>
        </div>
        <button
          type="button"
          className="fleet-refresh"
          onClick={() => {
            setLoading(true);
            setRefreshKey((k) => k + 1);
          }}
          disabled={loading}
        >
          <span aria-hidden="true">↻</span> Frissítés
        </button>
      </section>
      <section className="card fleet-card">
        <div className="fleet-toolbar">
          <div>
            <span className="fleet-kicker">ÉLŐ TÉRKÉP</span>
            <h2>Járművek a térképen</h2>
            <p>Válassz járművet a listából a részletesebb nézethez.</p>
          </div>
          <div className="fleet-live">
            <span /> Percenként frissül
          </div>
        </div>
        {error ? (
          <div className="fleet-empty" role="alert">
            {error}
          </div>
        ) : loading && !updated ? (
          <div className="fleet-empty" role="status">
            Járművek betöltése…
          </div>
        ) : vehicles.length ? (
          <div className="fleet-workspace">
            <div className="fleet-sidebar">
              <div className="fleet-sidebar-heading">
                <strong>Járművek</strong>
                <span>{vehicles.length}</span>
              </div>
              <button
                type="button"
                className={'fleet-vehicle fleet-all' + (!selected ? ' is-selected' : '')}
                onClick={() => setSelected('')}
                aria-pressed={!selected}
              >
                <span className="fleet-vehicle-icon" aria-hidden="true">
                  ⌖
                </span>
                <span>
                  <strong>Összes jármű</strong>
                  <small>Teljes flotta megjelenítése</small>
                </span>
                <span aria-hidden="true">›</span>
              </button>
              <div className="fleet-vehicle-list">
                {vehicles.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    className={'fleet-vehicle' + (selected === v.id ? ' is-selected' : '')}
                    onClick={() => setSelected(v.id)}
                    aria-pressed={selected === v.id}
                  >
                    <span className="fleet-vehicle-icon" aria-hidden="true">
                      ▰
                    </span>
                    <span>
                      <strong>{v.label}</strong>
                      <small>Helyadat: {formatTime(v.timestamp)}</small>
                    </span>
                    <span aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="fleet-map-area">
              <VehicleMap vehicles={shown} selection={selected} />
              <div className="fleet-map-caption">
                <span>Húzd a térképet a mozgatáshoz, használd a + / − gombokat a nagyításhoz.</span>
                <a href="https://openfreemap.org/privacy/" target="_blank" rel="noreferrer">
                  Térképszolgáltató adatkezelése ↗
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="fleet-empty">
            <strong>Most nincs megjeleníthető jármű</strong>
            <span>Amint friss helyadat érkezik, itt megjelenik.</span>
          </div>
        )}
      </section>
      <StaffTracking fleet={vehicles} />
    </div>
  );
}
