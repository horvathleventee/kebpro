import React, { useEffect, useRef } from 'react';
const staffLinks = [
  ['dashboard', '▦', 'Túrák és rendelések'],
  ['tracking', '◉', 'Járműkövetés'],
  ['delivery-planning', '▦', 'Kiszállítások tervezése'],
  ['delivery-locations', '⌖', 'Szállítási helyek'],
  ['packing', '☷', 'Összekészítés'],
  ['complaints', '✉', 'Bejelentések'],
  ['products', '▤', 'Termékek'],
  ['calls', '☎', 'Kit hívjunk?'],
  ['news', '▤', 'Hírek és akciók'],
  ['settings', '⚙', 'Túrák és partnerek'],
  ['applications', '✓', 'Regisztrációk'],
  ['notifications', '◉', 'Értesítési napló'],
];
const partnerLinks = [
  ['home', '▦', 'Áttekintés'],
  ['order', '＋', 'Új rendelés'],
  ['news', '▤', 'Hírek'],
  ['history', '↺', 'Rendeléseim'],
  ['reports', '✉', 'Bejelentéseim'],
  ['settings', '⚙', 'Beállítások'],
];
function Link({
  id,
  icon,
  label,
  active,
  children,
}: {
  id: string;
  icon: string;
  label: string;
  active: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={'#' + id}
      data-nav={id}
      className={active === id ? 'active' : undefined}
      aria-current={active === id ? 'page' : undefined}
    >
      <span aria-hidden="true">{icon}</span> {label}
      {children}
    </a>
  );
}
function Count({ id, count, className }: { id: string; count: number; className: string }) {
  return (
    <span id={id} className={className} hidden={!count}>
      {count > 99 ? '99+' : count || ''}
    </span>
  );
}
export function Navigation({ role, active }: { role: 'staff' | 'partner'; active: string }) {
  return (
    <>
      {(role === 'staff' ? staffLinks : partnerLinks).map(([id, icon, label]) => (
        <Link key={id} id={id} icon={icon} label={label} active={active} />
      ))}
    </>
  );
}
export function MobileNavigation({
  active,
  complaints,
  applications,
}: {
  active: string;
  complaints: number;
  applications: number;
}) {
  const [group, setGroup] = React.useState('');
  const groups = [
    {
      name: 'Kiszállítások',
      ids: ['tracking', 'delivery-planning', 'delivery-locations'],
      count: 0,
    },
    { name: 'Termékek és hírek', ids: ['products', 'news'], count: 0 },
    {
      name: 'Ügyintézés',
      ids: ['complaints', 'settings', 'applications', 'notifications'],
      count: complaints + applications,
    },
  ];
  const more = useRef<HTMLDetailsElement>(null),
    total = complaints + applications;
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (more.current?.open && !event.composedPath().includes(more.current))
        more.current.open = false;
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && more.current?.open) {
        more.current.open = false;
        more.current.querySelector('summary')?.focus();
      }
    };
    const hash = () => {
      if (more.current) more.current.open = false;
    };
    document.addEventListener('click', closeOutside);
    document.addEventListener('keydown', key);
    window.addEventListener('hashchange', hash);
    return () => {
      document.removeEventListener('click', closeOutside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('hashchange', hash);
    };
  }, []);
  return (
    <>
      <Link id="dashboard" icon="▦" label="Rendelések" active={active} />
      <Link id="packing" icon="☷" label="Összekészítés" active={active} />
      <Link id="calls" icon="☎" label="Kit hívjunk?" active={active} />
      <details
        id="mobile-more"
        ref={more}
        onToggle={(e) => {
          if (!e.currentTarget.open) setGroup('');
        }}
        onClick={(event) => {
          if ((event.target as Element).closest('a') && more.current) more.current.open = false;
        }}
      >
        <summary
          className={!['dashboard', 'packing', 'calls'].includes(active) ? 'active' : undefined}
          aria-label={
            'További menüpontok' +
            (total
              ? ' · ' +
                complaints +
                ' nyitott bejelentés, ' +
                applications +
                ' várakozó regisztráció'
              : '')
          }
        >
          <span aria-hidden="true">•••</span>
          <span>Továbbiak</span>
          <Count id="mobile-more-count" className="mobile-count" count={total} />
        </summary>
        <div className="mobile-more-panel" aria-label="További menüpontok">
          {group ? (
            <button type="button" className="mobile-menu-group" onClick={() => setGroup('')}>
              ‹ Vissza
            </button>
          ) : (
            groups.map((item) => (
              <button
                type="button"
                className="mobile-menu-group"
                key={item.name}
                onClick={() => setGroup(item.name)}
              >
                {item.name}
                {item.count > 0 && <span className="mobile-item-count">{item.count}</span>}
                <span aria-hidden="true">›</span>
              </button>
            ))
          )}
          {groups
            .find((item) => item.name === group)
            ?.ids.map((id) => {
              const [, icon, label] = staffLinks.find((link) => link[0] === id)!;
              return (
                <Link
                  key={id}
                  id={id}
                  icon={icon}
                  label={id === 'products' ? 'Termékek és árak' : label}
                  active={active}
                >
                  {id === 'complaints' && (
                    <Count
                      id="mobile-complaints-count"
                      className="mobile-item-count"
                      count={complaints}
                    />
                  )}
                  {id === 'applications' && (
                    <Count
                      id="mobile-applications-count"
                      className="mobile-item-count"
                      count={applications}
                    />
                  )}
                </Link>
              );
            })}
        </div>
      </details>
    </>
  );
}
