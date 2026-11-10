import React from 'react';

export function MapAttribution({ ready }: { ready: boolean }) {
  const [expanded, setExpanded] = React.useState(true);
  const interacted = React.useRef(false);
  const timer = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!ready || interacted.current) return;
    timer.current = window.setTimeout(() => setExpanded(false), 5000);
    return () => { if (timer.current !== null) window.clearTimeout(timer.current); };
  }, [ready]);
  return (
    <div className="map-attribution">
      {expanded && <span className="map-attribution-text">
        © <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a>
        {' · '}adatok: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
      </span>}
      <button type="button" className="map-attribution-toggle" aria-label="Térkép forrásainak megjelenítése"
        aria-expanded={expanded} title="Térkép forrásai" onClick={() => { interacted.current = true; if (timer.current !== null) window.clearTimeout(timer.current); setExpanded((value) => !value); }}>ⓘ</button>
    </div>
  );
}
