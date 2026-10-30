import React from "react";
import { Heading } from './Heading';
interface Partner { id: string; name: string; address?: string; phone?: string; disabled?: boolean; response?: {kind: string} | null; }
interface CallRoute { id: string; name: string; pending: Partner[]; skipped: Partner[]; }
interface CallsData { partners: Partner[]; routes: {id: string; name: string}[]; calls?: {date: string; cutoff: string; routes: CallRoute[]}[]; }
interface CallsProps {data: CallsData; mode: string; date: string; route: string; onMode(mode: string): void; onFilter(date: string,route: string): void;}
const sorted = (list: readonly Partner[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, "hu"));
function PartnerCard({ partner }: {partner: Partner}) {
  const phone = String(partner.phone || "").replace(/[^+0-9]/g, "");
  return <article className="card"><h3>{partner.name}</h3><p>{partner.address}</p><p>{partner.phone || "Nincs telefonsz\xE1m megadva"}</p>{/^[+]?[0-9]{6,15}$/.test(phone) && <a className="button primary full" href={"tel:" + phone}>☎ Partner hívása</a>}</article>;
}
function Pending({ people, empty }: {people: Partner[]; empty: string}) {
  const list = sorted(people);
  return <div className="order-grid section-gap">{list.length ? list.map((p) => <PartnerCard key={p.id} partner={p} />) : <p className="card">{empty}</p>}</div>;
}
function Skipped({ people, always = false }: {people: Partner[]; always?: boolean}) {
  const list = sorted(people);
  return (always || list.length > 0) && <details className="card section-gap"><summary>Most nem kér szállítást ({list.length})</summary>{list.map((p) => <p key={p.id}>✓ {p.name}</p>)}</details>;
}
function Calls({ data, mode, date, route, onMode, onFilter }: CallsProps) {
  const label = (value: string) => new Intl.DateTimeFormat("hu-HU", { month: "long", day: "numeric", weekday: "long", timeZone: "Europe/Budapest" }).format(/* @__PURE__ */ new Date(value + "T12:00:00Z"));
  const switcher = <div className="button-row call-mode">{[["today", "Mai rendel\xE9si nap"], ["manual", "M\xE1sik kisz\xE1ll\xEDt\xE1si nap"]].map(([key, text]) => <button key={key} className={"button " + (mode === key ? "primary" : "secondary")} data-action="calls-mode" data-mode={key} aria-pressed={mode === key} onClick={() => onMode(key)}>{text}</button>)}</div>;
  if (mode === "manual") {
    const pending = data.partners.filter((p) => !p.disabled && !p.response), skipped = data.partners.filter((p) => p.response?.kind === "skip");
    return <><Heading eyebrow="PARTNEREK" title="Kit kell még hívni?" description="Válassz tetszőleges kiszállítási napot és túrát." />{switcher}<form id="filters" className="filters section-gap" onSubmit={(e) => e.preventDefault()}><label>Kiszállítás napja<input name="date" type="date" value={date} required onChange={(e) => {
      if (e.target.value) onFilter(e.target.value, route);
    }} /></label><label>Túra<select name="route" value={route} onChange={(e) => onFilter(date, e.target.value)}><option value="">Minden túra</option>{data.routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label></form><h2>Még nem válaszolt ({pending.length})</h2><Pending people={pending} empty="Minden beosztott partner válaszolt, vagy nincs partner erre a kiválasztásra." /><Skipped people={skipped} always /></>;
  }
  const groups = data.calls || [];
  return <><Heading eyebrow="MAI RENDELÉSI NAP" title="Kit kell még hívni?" description="A mai határidőhöz tartozó kiszállítások és túrák. A lista automatikusan frissül." />{switcher}{groups.length ? groups.map((g) => <section className="section-gap call-delivery" key={g.date}><h2>Kiszállítás: {label(g.date)}</h2><p className="muted">Rendelési határidő ma {g.cutoff}</p>{g.routes.map((r) => <section className="section-gap" key={r.id}><h3>{r.name} · Még nem válaszolt ({r.pending.length})</h3><Pending people={r.pending} empty="Minden partner válaszolt ezen a túrán." /><Skipped people={r.skipped} /></section>)}</section>) : <div className="card empty section-gap">Mára nincs beosztott partner rendelési határidővel. Másik kiszállítási napot fent választhatsz.</div>}</>;
}
export {
  Calls
};
