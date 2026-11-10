import React from 'react';
import {
  Heading,
  dateLabel,
  dateShort,
  timeLabel,
  Badge,
  OrderProgress,
  NewsCard,
  money,
  quantity,
  ComplaintPhotos,
  PartnerComplaints,
  Pager,
  SessionSettings,
} from './shared';
interface ListItem {
  id: string;
  username?: string;
}
interface ListProps<T extends ListItem> {
  items: T[];
  listKey: string;
  label(item: T): string;
  limit?: number;
  moreLabel?: string;
  expanded: string[];
  renderItem(item: T): React.ReactNode;
  onToggle(key: string): void;
}
function LimitedList<T extends ListItem>({
  items,
  listKey,
  label,
  limit = 5,
  moreLabel = 'Továbbiak',
  expanded,
  renderItem,
  onToggle,
}: ListProps<T>) {
  const collator = new Intl.Collator('hu', { sensitivity: 'base', numeric: true }),
    sorted = [...items].sort(
      (a, b) =>
        collator.compare(label(a), label(b)) ||
        collator.compare(a.username || '', b.username || '') ||
        String(a.id).localeCompare(String(b.id)),
    ),
    remaining = sorted.length - limit,
    isOpen = expanded.includes(listKey);
  return (
    <>
      {sorted.slice(0, limit).map(renderItem)}
      {remaining > 0 && (
        <>
          <div id={listKey + '-more'} className="stack" hidden={!isOpen}>
            {sorted.slice(limit).map(renderItem)}
          </div>
          <button
            type="button"
            className="button secondary section-gap"
            data-action="more-accounts"
            data-list={listKey}
            data-count={remaining}
            data-more-label={moreLabel}
            onClick={() => onToggle(listKey)}
            aria-controls={listKey + '-more'}
            aria-expanded={isOpen}
          >
            {isOpen ? 'Kevesebb' : moreLabel + ' (' + remaining + ')'}
          </button>
        </>
      )}
    </>
  );
}
import type { createStaffSettingsActions } from '../client/ts/staff-settings-actions';
interface Route {
  id: string;
  name: string;
  fixedDay: number;
  trackingRadiusKm?: number;
  reschedules?: { from: string; to: string }[];
}
interface Partner {
  id: string;
  name: string;
  routeIds?: string[];
  routeId?: string;
}
interface StaffAccount {
  id: string;
  username: string;
  email?: string | null;
  emailVerified?: boolean;
}
interface Account extends StaffAccount {
  company?: string;
  role: string;
  status: string;
}
interface StaffData {
  routes: Route[];
  allPartners: Partner[];
  staffAccounts: StaffAccount[];
  accounts?: Account[];
  invitations: { id: string; email: string; status: string; expires: string }[];
  currentUserId: string;
  loginSession: React.ComponentProps<typeof SessionSettings>['session'];
}
interface SettingsProps {
  data: StaffData;
  expanded: string[];
  routeOpen: boolean;
  daysOpen: boolean;
  actions: ReturnType<typeof createStaffSettingsActions>;
  onRouteOpen(open: boolean): void;
  onDaysOpen(open: boolean): void;
}
function StaffSettings({
  data,
  expanded,
  routeOpen,
  daysOpen,
  actions,
  onRouteOpen,
  onDaysOpen,
}: SettingsProps) {
  const days = [
      'Vas\xE1rnap',
      'H\xE9tf\u0151',
      'Kedd',
      'Szerda',
      'Cs\xFCt\xF6rt\xF6k',
      'P\xE9ntek',
      'Szombat',
    ],
    labels: Record<string, string> = {
      pending: 'Elfogad\xE1sra v\xE1r',
      sending: 'K\xFCld\xE9s folyamatban',
      accepted: 'Elfogadva',
      expired: 'Lej\xE1rt',
      revoked: 'Visszavonva',
      failed: 'Sikertelen k\xFCld\xE9s',
    };
  const [expandedLists, setExpandedLists] = React.useState(expanded),
    [busy, setBusy] = React.useState(false),
    pending = React.useRef(false);
  function toggle(key: string) {
    setExpandedLists((current) => {
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key];
      actions.setExpanded(key, next.includes(key));
      return next;
    });
  }
  function jumpTo(id: string) {
    if (id === 'route-settings') onRouteOpen(true);
    if (id === 'partner-days-settings') onDaysOpen(true);
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }
  async function submit(event: React.FormEvent<HTMLDivElement>) {
    event.preventDefault();
    const form = event.target as HTMLFormElement,
      values = new FormData(form);
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      if (form.dataset.routeForm) await actions.saveRoute(form.dataset.routeForm, values, form);
      else if (form.dataset.partnerDays)
        await actions.savePartnerDays(form.dataset.partnerDays, values, form);
      else if (form.id === 'route-reschedule') await actions.reschedule(values, form);
      else if (form.id === 'invite-staff') actions.invite(values.get('email') as string);
    } catch (error) {
      actions.error(error as Error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div
      className="staff-workspace staff-settings-page"
      onSubmit={submit}
      onInput={(event) => {
        const target = event.target as HTMLInputElement;
        if (target.form) target.form.dataset.dirty = 'true';
      }}
      onChange={(event) => {
        const target = event.target as HTMLInputElement;
        if (target.form) target.form.dataset.dirty = 'true';
      }}
    >
      <Heading
        eyebrow="BEÁLLÍTÁSOK"
        title="Túrák és partnerek"
        description="Kezeld a kiszállítási túrákat, a partnerek napjait és a céges hozzáféréseket egy helyen."
      />
      <div className="settings-overview" aria-label="Áttekintés">
        <div>
          <span className="settings-overview-icon" aria-hidden="true">
            ▦
          </span>
          <span>
            <strong>{data.routes.length}</strong>Túra
          </span>
        </div>
        <div>
          <span className="settings-overview-icon" aria-hidden="true">
            ♙
          </span>
          <span>
            <strong>{data.allPartners.length}</strong>Partner
          </span>
        </div>
        <div>
          <span className="settings-overview-icon" aria-hidden="true">
            ◷
          </span>
          <span>
            <strong>14:00</strong>Rendelési határidő
          </span>
        </div>
      </div>
      <p className="settings-deadline">
        A határidő általában a kiszállítás előtti nap 14:00; a szokásos hétfői kiszállításnál
        péntek. Az egyszeri áthelyezés határideje az új kiszállítás előtti nap 14:00. Emlékeztetők a
        határidő előtti este 17:00-kor és a határidő napján 10:00-kor.
      </p>
      <div className="settings-jump" role="navigation" aria-label="Oldal szakaszai">
        <button type="button" onClick={() => jumpTo('route-settings')}>
          Túrák
        </button>
        <button type="button" onClick={() => jumpTo('route-reschedules')}>
          Áthelyezés
        </button>
        <button type="button" onClick={() => jumpTo('partner-days-settings')}>
          Partnernapok
        </button>
        <button type="button" onClick={() => jumpTo('staff-invitations')}>
          Munkatársak
        </button>
        <button type="button" onClick={() => jumpTo('account-access')}>
          Hozzáférések
        </button>
      </div>
      <div className="settings-section-heading">
        <div>
          <span className="staff-kicker">KISZÁLLÍTÁS</span>
          <h2>Túrák és beosztások</h2>
          <p>A heti menetrend és a partnerek kiszállítási napjai.</p>
        </div>
      </div>
      <details
        id="route-settings"
        className="card section-gap"
        open={routeOpen}
        onToggle={(event) => onRouteOpen(event.currentTarget.open)}
      >
        <summary>
          <span className="settings-summary-icon" aria-hidden="true">
            ▦
          </span>
          <span>
            <strong>Túrák szerkesztése</strong>
            <small>A heti túrák elnevezése · {data.routes.length} túra</small>
          </span>
        </summary>
        <p className="muted small">Itt módosíthatod a túrák elnevezését és a járműkövetés távolságát.</p>
        <div className="settings-route-grid section-gap">
          {data.routes.map((r) => (
            <section className="settings-route-card" key={r.id}>
              <div className="settings-route-top">
                <span className="settings-day-icon" aria-hidden="true">
                  ▦
                </span>
                <div>
                  <span className="staff-kicker">HETI TÚRA</span>
                  <h3>{days[r.fixedDay] || r.name}</h3>
                </div>
              </div>
              <form data-route-form={r.id} key={r.name + ':' + (r.trackingRadiusKm ?? 20)}>
                <label htmlFor={'route-name-' + r.id}>Túra neve</label>
                <input
                  id={'route-name-' + r.id}
                  name="name"
                  maxLength={100}
                  defaultValue={r.name}
                  required
                />
                <label htmlFor={'route-radius-' + r.id}>Jármű láthatósága (km)</label>
                <input id={'route-radius-' + r.id} name="trackingRadiusKm" type="number" min="1" max="500" step="0.1" defaultValue={r.trackingRadiusKm ?? 20} required />
                <small>A partner ettől a légvonalban mért távolságtól láthatja a járművet.</small>
                <input type="hidden" name="days" value={r.fixedDay} />
                <input type="hidden" name="reminder" value="10:00" />
                <input type="hidden" name="cutoff" value="14:00" />
                <button className="button primary" disabled={busy}>
                  Túra mentése
                </button>
              </form>
            </section>
          ))}
        </div>
      </details>
      <details className="card section-gap" id="route-reschedules">
        <summary>
          <span className="settings-summary-icon" aria-hidden="true">
            ↗
          </span>
          <span>
            <strong>Túra egyszeri áthelyezése</strong>
            <small>Egy kiszállítási nap módosítása a heti menetrend megtartásával</small>
          </span>
        </summary>
        <p className="muted">
          A heti menetrend megmarad. Az új határidő az új kiszállítás előtti nap 14:00, az
          emlékeztetők ehhez igazodnak.
        </p>
        <p className="small muted">
          Az érintett túrára már leadott rendelések és válaszok átkerülnek az új napra. Ha egy
          partner mindkét napra már válaszolt, a válaszok külön megmaradnak.
        </p>
        <form id="route-reschedule" className="settings-reschedule-form section-gap">
          <label>
            Túra
            <select name="routeId" required defaultValue="">
              <option value="" disabled>
                Válassz túrát
              </option>
              {data.routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Eredeti kiszállítási nap
            <input name="from" type="date" required />
          </label>
          <label>
            Új kiszállítási nap
            <input name="to" type="date" required />
          </label>
          <button className="button primary" disabled={busy}>
            Áthelyezés mentése
          </button>
        </form>
        {data.routes.flatMap((route) =>
          (route.reschedules || []).map((change) => (
            <p key={route.id + change.from} className="section-gap">
              {route.name}: {change.from} → {change.to}
            </p>
          )),
        )}
      </details>
      <details
        id="partner-days-settings"
        className="card section-gap"
        open={daysOpen}
        onToggle={(event) => onDaysOpen(event.currentTarget.open)}
      >
        <summary>
          <span className="settings-summary-icon" aria-hidden="true">
            ♙
          </span>
          <span>
            <strong>Partnerek kiszállítási napjai</strong>
            <small>Túrák hozzárendelése · {data.allPartners.length} partner</small>
          </span>
        </summary>
        <p className="muted small">
          Jelöld ki, mely túrákon kapjon kiszállítást a partner, majd mentsd a módosítást.
        </p>
        <LimitedList
          items={data.allPartners}
          listKey="partner-delivery-days"
          label={(p) => p.name}
          limit={3}
          moreLabel="További partnerek"
          expanded={expandedLists}
          onToggle={toggle}
          renderItem={(p) => (
            <form
              id={'partner-days-' + p.id}
              data-partner-days={p.id}
              className="partner-days"
              key={p.id + JSON.stringify(p.routeIds || [p.routeId])}
            >
              <div className="settings-partner-title">
                <span className="settings-avatar" aria-hidden="true">
                  {p.name.charAt(0).toLocaleUpperCase('hu')}
                </span>
                <div>
                  <span className="staff-kicker">PARTNER</span>
                  <h3>{p.name}</h3>
                </div>
              </div>
              <fieldset className="settings-partner-routes">
                <legend>Kiszállítási túrák</legend>
                <div className="route-checks">
                  {data.routes.map((r) => (
                    <label className="check-line" key={r.id}>
                      <input
                        type="checkbox"
                        name="routeIds"
                        value={r.id}
                        defaultChecked={(p.routeIds || [p.routeId]).includes(r.id)}
                      />
                      {r.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="button primary" disabled={busy}>
                Kiszállítási napok mentése
              </button>
            </form>
          )}
        />
      </details>
      <div className="settings-section-heading settings-access-heading">
        <div>
          <span className="staff-kicker">HOZZÁFÉRÉSEK</span>
          <h2>Munkatársak és fiókok</h2>
          <p>Meghívók és hozzáférések kezelése.</p>
        </div>
      </div>
      <section id="staff-invitations" className="card section-gap settings-access-card">
        <div className="settings-card-heading">
          <span className="settings-summary-icon" aria-hidden="true">
            ✉
          </span>
          <div>
            <h2>Céges munkatársak meghívása</h2>
            <p>Új munkatárs hozzáadása és meglévő meghívók követése.</p>
          </div>
        </div>
        <p className="muted">
          A meghívott teljes céges hozzáférést kap: rendeléseket, partnereket, híreket és
          meghívásokat kezelhet.
        </p>
        <form id="invite-staff" className="section-gap">
          <label htmlFor="staff-email">Munkatárs e-mail-címe</label>
          <input
            id="staff-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="off"
          />
          <p className="small muted">
            24 óráig érvényes linket kap, ahol saját felhasználónevet és legalább 8 karakteres
            jelszót állíthat be.
          </p>
          <button className="button primary" disabled={busy}>
            Meghívó küldése e-mailben
          </button>
        </form>
        <h3 className="section-gap">Céges fiókok</h3>
        <LimitedList
          items={data.staffAccounts}
          listKey="staff-accounts"
          label={(u) => u.username}
          expanded={expandedLists}
          onToggle={toggle}
          renderItem={(u) => (
            <p className="settings-account-row" key={u.id}>
              <strong>{u.username}</strong> · {u.email || 'Nincs e-mail-c\xEDm'}{' '}
              <span className="badge gray">
                {u.emailVerified ? 'E-mail igazolva' : 'K\xFCl\xF6n l\xE9trehozott fi\xF3k'}
              </span>
            </p>
          )}
        />
        <h3 className="section-gap">Meghívások</h3>
        <div className="stack">
          {data.invitations.length ? (
            data.invitations.map((i) => (
              <div className="total-line" key={i.id}>
                <div>
                  <strong>{i.email}</strong>
                  <p>
                    {labels[i.status]} · Lejárat:{' '}
                    {new Date(i.expires).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })}
                  </p>
                </div>
                {['pending', 'sending'].includes(i.status) && (
                  <button
                    className="button secondary"
                    data-action="revoke-invitation"
                    data-id={i.id}
                    onClick={() => actions.revoke(i.id)}
                  >
                    Visszavonás
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="muted">Még nincs meghívás.</p>
          )}
        </div>
      </section>
      <section id="account-access" className="card section-gap settings-access-card">
        <div className="settings-card-heading">
          <span className="settings-summary-icon" aria-hidden="true">
            ♙
          </span>
          <div>
            <h2>Fiókok hozzáférése</h2>
            <p>Az aktív és letiltott fiókok kezelése.</p>
          </div>
        </div>
        <p>
          A letiltás megszünteti a belépéseket és az eszközértesítéseket. A korábbi rendelések
          megmaradnak.
        </p>
        <div className="stack">
          <LimitedList
            items={data.accounts || []}
            listKey="access-accounts"
            label={(u) => u.company || u.username}
            expanded={expandedLists}
            onToggle={toggle}
            renderItem={(u) => (
              <div className="saved-list" key={u.id}>
                <div>
                  <strong>{u.company || u.username}</strong>
                  <p>
                    {u.username} · {u.role === 'staff' ? 'Munkat\xE1rs' : 'Partner'} ·{' '}
                    {u.status === 'disabled' ? 'Letiltva' : 'Akt\xEDv'}
                  </p>
                </div>
                {u.id !== data.currentUserId ? (
                  <button
                    className="button secondary"
                    data-action="account-status"
                    data-id={u.id}
                    onClick={() => actions.accountStatus(u.id)}
                  >
                    {u.status === 'disabled' ? 'Visszaenged\xE9s' : 'Letilt\xE1s'}
                  </button>
                ) : (
                  <span>Saját fiók</span>
                )}
              </div>
            )}
          />
        </div>
      </section>
      <SessionSettings session={data.loginSession} staff onExtend={actions.extend} />
    </div>
  );
}
export { StaffSettings };
