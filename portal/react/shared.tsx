import React from "react";
import { Heading } from './Heading';
const dateLabel = (value: string) => new Intl.DateTimeFormat("hu-HU", { month: "long", day: "numeric", weekday: "long", timeZone: "Europe/Budapest" }).format(/* @__PURE__ */ new Date(value + "T12:00:00Z"));
const dateShort = (value: string) => new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric", timeZone: "Europe/Budapest" }).format(new Date(value.length === 10 ? value + "T12:00:00Z" : value));
const timeLabel = (value: string) => new Date(value).toLocaleString("hu-HU", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" });
function Badge({ status }: {status: string}) {
  const classes: Record<string, string> = { received: "blue", confirmed: "amber", ready: "green", archived: "green", skip: "gray" }, labels: Record<string, string> = { received: "Be\xE9rkezett", archived: "Feldolgozva", skip: "Nem k\xE9r sz\xE1ll\xEDt\xE1st" };
  return <span className={"badge " + (classes[status] || "gray")}>{labels[status] || status}</span>;
}
function OrderProgress({ order }: {order: {kind: string; status: string; createdAt: string; archivedAt?: string | null; statusUpdatedAt?: string | null}}) {
  if (order.kind !== "order") return null;
  const descriptions: Record<string, string> = { received: "A rendel\xE9sed be\xE9rkezett. A Kebpro munkat\xE1rsainak feldolgoz\xE1s\xE1ra v\xE1r.", archived: "A Kebpro feldolgozta \xE9s archiv\xE1lta a rendel\xE9sedet. Ez \xF6nmag\xE1ban nem jelenti, hogy m\xE1r kisz\xE1ll\xEDtott\xE1k." };
  return <div className="order-progress"><Badge status={order.status} /><p>{descriptions[order.status] || "A rendel\xE9s \xE1llapot\xE1t a Kebpro friss\xEDti."}</p><p className="small muted">{order.statusUpdatedAt ? "\xC1llapot friss\xEDtve: " : order.archivedAt ? "Feldolgozva: " : "Bek\xFCldve: "}{timeLabel(order.statusUpdatedAt || order.archivedAt || order.createdAt)}</p></div>;
}
function NewsCard({ item }: {item: {kind: string; createdAt: string; title: string; body: string}}) {
  return <article className="card news-card"><div className="news-meta"><span className={"badge " + (item.kind === "Akci\xF3" ? "amber" : "blue")}>{item.kind}</span><time>{dateShort(item.createdAt)}</time></div><h3>{item.title}</h3><p className="news-body">{item.body}</p></article>;
}
const money = (value: number | null | undefined) => value === null || value === void 0 ? "\xC1r egyeztetend\u0151" : new Intl.NumberFormat("hu-HU").format(value) + " Ft";
const quantity = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(value);
interface Complaint {id:string; status:string; createdAt:string; message:string; orderId?:string | null; orderDate?:string | null; reply?:string | null; photoId?:string | null; labelPhotoId?:string | null;}
type PhotoHandler = (id:string, label:string) => void;
function ComplaintPhotos({ complaint, admin = false, onView }: {complaint: Pick<Complaint, 'photoId' | 'labelPhotoId'>; admin?:boolean; onView?:PhotoHandler}) {
  return ([[complaint.photoId, "Term\xE9k vagy probl\xE9ma"], [complaint.labelPhotoId, "Term\xE9kjel\xF6l\u0151 c\xEDmke"]] as [string | null | undefined, string][]).filter((entry): entry is [string, string] => Boolean(entry[0])).map(([id, label]) => <p className="section-gap" key={id}>{label}<br /><button type="button" className="complaint-photo-button" data-action="view-photo" data-photo-id={id} data-photo-label={label} onClick={onView ? () => onView(id,label) : undefined} aria-label={label + " k\xE9p nagy\xEDt\xE1sa"}><img className="complaint-photo" src={(admin ? "/partner-admin" : "/partner") + "/api/complaint-photo/" + encodeURIComponent(id)} alt={label} loading="lazy" /></button></p>);
}
function PartnerComplaints({ complaints, onView }: {complaints?: Complaint[]; onView?: PhotoHandler}) {
  const list = [...complaints || []].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <section className="section-gap"><h2>Bejelentéseim</h2><p className="muted">A bejelentésedre itt válaszolnak a munkatársak.</p><div className="stack section-gap">{list.length ? list.map((c) => <article className="card" key={c.id}><span className={"badge " + (c.status === "resolved" ? "green" : "amber")}>{c.status === "resolved" ? "Lez\xE1rva" : "Feldolgoz\xE1sra v\xE1r"}</span><p><strong>{c.orderId ? "Rendel\xE9s: " + dateLabel(c.orderDate!) + " \xB7 #" + c.orderId.slice(0, 8).toUpperCase() : "\xC1ltal\xE1nos visszajelz\xE9s"}</strong></p><p className="complaint-message">{c.message}</p><ComplaintPhotos complaint={c} onView={onView} />{c.reply ? <><p className="section-gap"><strong>Kebpro válasza:</strong></p><p className="complaint-message">{c.reply}</p></> : <p className="muted">Még nem érkezett válasz.</p>}</article>) : <p className="muted">Még nincs bejelentésed.</p>}</div></section>;
}
function Pager({ info, kind, onPage }: {info?: {pages:number;page:number;total:number} | null; kind:string; onPage?:(page:number)=>void}) {
  if (!info || info.pages < 2) return null;
  return <div className="button-row section-gap" aria-label="Lapozás"><button className="button secondary" data-action="page" data-kind={kind} data-page={info.page - 1} onClick={onPage ? event => {event.stopPropagation();onPage(info.page - 1);} : undefined} disabled={info.page <= 1}>← Előző</button><span>{info.page} / {info.pages} oldal · {info.total} rendelés</span><button className="button secondary" data-action="page" data-kind={kind} data-page={info.page + 1} onClick={onPage ? event => {event.stopPropagation();onPage(info.page + 1);} : undefined} disabled={info.page >= info.pages}>Következő →</button></div>;
}
import { SessionExplanation } from './SessionExplanation';
function SessionSettings({ session, staff = false, onExtend }: {session?: {expiresAt:string;canExtend?:boolean} | null; staff?:boolean; onExtend?:()=>void}) {
  if (!session) return null;
  return <section className="card section-gap"><h2>Bejelentkezve maradás</h2><p>Ezen az eszközön eddig maradsz bejelentkezve: <strong>{new Date(session.expiresAt).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })}</strong>.</p>{session.canExtend ? <button className="button primary" data-action="extend-session" onClick={onExtend}>Belépés hosszabbítása {staff ? 7 : 90} napra</button> : <p>A hosszabbítás a lejárat előtti {staff ? 2 : 7} napban válik elérhetővé.</p>}<SessionExplanation staff={staff}/></section>;
}
export {
  Badge,
  ComplaintPhotos,
  Heading,
  NewsCard,
  OrderProgress,
  Pager,
  PartnerComplaints,
  SessionSettings,
  SessionExplanation,
  dateLabel,
  dateShort,
  money,
  quantity,
  timeLabel
};
