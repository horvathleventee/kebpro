import React from 'react';
import * as maplibregl from 'maplibre-gl';
import { MapAttribution } from './MapAttribution';
maplibregl.setWorkerUrl('/partner/assets/maplibre-gl-worker.mjs');

export function AddressPicker({
  onSelect,
  initialPoint,
  referencePoint,
  compact = false,
}: {
  onSelect(latitude: number, longitude: number): void;
  initialPoint?: { latitude: number; longitude: number };
  referencePoint?: { latitude: number; longitude: number };
  compact?: boolean;
}) {
  const host = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const choosePoint = React.useRef<((latitude: number, longitude: number) => void) | null>(null);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<
    { label: string; latitude: number; longitude: number }[]
  >([]);
  const [searching, setSearching] = React.useState(false);
  const [searchMessage, setSearchMessage] = React.useState('');
  const [ready, setReady] = React.useState(false);
  const selectRef = React.useRef(onSelect);
  selectRef.current = onSelect;
  React.useEffect(() => {
    if (!host.current) return;
    const map = new maplibregl.Map({
      container: host.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: initialPoint ? [initialPoint.longitude, initialPoint.latitude] : [19.5033, 47.1625],
      zoom: initialPoint ? 15 : 6.5,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      setReady(true);
      if (initialPoint && referencePoint)
        map.fitBounds(
          new maplibregl.LngLatBounds(
            [initialPoint.longitude, initialPoint.latitude],
            [referencePoint.longitude, referencePoint.latitude],
          ),
          { padding: 60, maxZoom: 15, duration: 0 },
        );
    });
    let marker: maplibregl.Marker | null = null;
    const referenceMarker = referencePoint
      ? new maplibregl.Marker({ color: '#235fa0' })
          .setLngLat([referencePoint.longitude, referencePoint.latitude])
          .addTo(map)
      : null;
    choosePoint.current = (lat, lng) => {
      if (!marker)
        marker = new maplibregl.Marker({ color: '#d36427' }).setLngLat([lng, lat]).addTo(map);
      else marker.setLngLat([lng, lat]);
      selectRef.current(lat, lng);
    };
    if (initialPoint)
      marker = new maplibregl.Marker({ color: '#d36427' })
        .setLngLat([initialPoint.longitude, initialPoint.latitude])
        .addTo(map);
    map.on('click', (event) => {
      const { lat, lng } = event.lngLat;
      if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return;
      choosePoint.current?.(lat, lng);
    });
    return () => {
      marker?.remove();
      referenceMarker?.remove();
      choosePoint.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);
  async function search() {
    if (searching || query.trim().length < 3) return;
    setSearching(true);
    setResults([]);
    setSearchMessage('');
    try {
      const csrf =
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
      const base = location.pathname.startsWith('/partner-admin') ? '/partner-admin' : '/partner';
      const response = await fetch(base + '/api/address-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ query }),
      });
      if (!response.headers.get('content-type')?.toLowerCase().includes('application/json'))
        throw new Error(
          'A címkereső jelenleg nem érhető el. Frissítsd az oldalt, vagy jelöld ki a helyet a térképen.',
        );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'A címkeresés nem sikerült.');
      if (!Array.isArray(data.results))
        throw new Error(
          'A címkeresés nem sikerült. Próbáld újra, vagy jelöld ki a helyet a térképen.',
        );
      setResults(data.results);
      if (!data.results.length)
        setSearchMessage(
          'Nincs találat. Próbáld másképp megadni a címet, vagy jelöld ki a térképen.',
        );
    } catch (error) {
      setSearchMessage(
        error instanceof Error && !(error instanceof SyntaxError) && error.name !== 'TypeError'
          ? error.message
          : 'A címkereső jelenleg nem érhető el. Próbáld újra, vagy jelöld ki a helyet a térképen.',
      );
    } finally {
      setSearching(false);
    }
  }
  return (
    <div className="address-picker">
      {!compact && (
        <>
          <label>
            Cím keresése{' '}
            <input
              type="search"
              value={query}
              disabled={searching}
              maxLength={200}
              placeholder="Település, utca, házszám"
              onChange={(e) => {
                setQuery(e.target.value);
                setResults([]);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void search();
                }
              }}
            />
          </label>{' '}
          <button
            type="button"
            disabled={searching || query.trim().length < 3 || !ready}
            onClick={() => void search()}
          >
            {searching ? 'Keresés…' : 'Keresés'}
          </button>
          <p className="small muted">
            A keresett címet{' '}
            {document.body.dataset.geoapifySearch === 'true' ? (
              <>
                <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">
                  Geoapify
                </a>{' '}
                címkeresője
              </>
            ) : (
              'az OpenStreetMap Nominatim címkeresője'
            )}{' '}
            kapja meg.
          </p>
          {searchMessage && <p role="status">{searchMessage}</p>}
          {results.length > 0 && (
            <div>
              <p>Válaszd ki a megfelelő találatot:</p>
              <ul>
                {results.map((result, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => {
                        choosePoint.current?.(result.latitude, result.longitude);
                        const map = mapRef.current;
                        map?.flyTo({ center: [result.longitude, result.latitude], zoom: 16 });
                        setResults([]);
                        setSearchMessage(
                          'Ellenőrizd a jelölőt, és szükség esetén kattintással pontosítsd.',
                        );
                      }}
                    >
                      {result.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <p>Húzással mozgasd, a + / − gombokkal nagyítsd, majd kattints a pontos szállítási pontra.</p>
      <div className="vehicle-map-frame">
        <div
          ref={host}
          className="vehicle-map address-select-map"
          aria-label="Szállítási pont kijelölése a térképen"
        />
        <MapAttribution ready={ready} />
      </div>
      <small>
        <a href="https://openfreemap.org/privacy/" target="_blank" rel="noreferrer">
          Térképszolgáltató adatkezelése
        </a>
      </small>
    </div>
  );
}
