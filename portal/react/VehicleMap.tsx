import React from 'react';
import * as maplibregl from 'maplibre-gl';
import { MapAttribution } from './MapAttribution';
maplibregl.setWorkerUrl('/partner/assets/maplibre-gl-worker.mjs');

export type MapVehicle = { id: string; label: string; latitude: number; longitude: number };

export function VehicleMap({ vehicles, selection }: { vehicles: MapVehicle[]; selection: string }) {
  const host = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const markers = React.useRef<maplibregl.Marker[]>([]);
  const lastFit = React.useRef<string | null>(null);
  const [error, setError] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    if (!host.current) return;
    const map = new maplibregl.Map({
      container: host.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [19.0402, 47.4979],
      zoom: 8,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('error', () => setError(true));
    map.on('load', () => {
      setError(false);
      setReady(true);
    });
    mapRef.current = map;
    return () => {
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((m) => m.remove());
    markers.current = vehicles.map((vehicle) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'vehicle-map-marker';
      element.setAttribute('aria-label', vehicle.label);
      element.innerHTML =
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 11l1.4-4.1A2.8 2.8 0 019 5h6a2.8 2.8 0 012.6 1.9L19 11l1.1 1.1c.6.6.9 1.3.9 2.1V18h-2v-1H5v1H3v-3.8c0-.8.3-1.5.9-2.1L5 11zm2.2-.5h9.6l-1-3A.9.9 0 0015 7H9a.9.9 0 00-.8.5l-1 3zM7 14a1.2 1.2 0 100 2.4A1.2 1.2 0 007 14zm10 0a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"/></svg>';
      const popup = new maplibregl.Popup({ offset: 24 }).setText(vehicle.label);
      return new maplibregl.Marker({ element, anchor: 'center' })
        .setLngLat([vehicle.longitude, vehicle.latitude])
        .setPopup(popup)
        .addTo(map);
    });
    const fit = selection + ':' + (vehicles.length > 0 ? 'has-vehicles' : 'empty');
    if (vehicles.length && lastFit.current !== fit) {
      if (vehicles.length === 1)
        map.jumpTo({ center: [vehicles[0].longitude, vehicles[0].latitude], zoom: 13 });
      else {
        const bounds = new maplibregl.LngLatBounds();
        vehicles.forEach((v) => bounds.extend([v.longitude, v.latitude]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 0 });
      }
      lastFit.current = fit;
    }
  }, [vehicles, selection]);
  return (
    <div className="vehicle-map-frame">
      <div ref={host} className="vehicle-map" aria-label="Mozgatható járműtérkép" />
      <MapAttribution ready={ready} />
      {error && (
        <p className="vehicle-map-error" role="status">
          A térképalap átmenetileg nem érhető el.
        </p>
      )}
    </div>
  );
}
