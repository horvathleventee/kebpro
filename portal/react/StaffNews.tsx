import React from "react";
import { Heading } from './Heading';
interface NewsItem {id:string;kind:string;createdAt:string;title:string;body:string;}
interface StaffNewsProps {data:{subscribedPartners:number;news:NewsItem[]};onPublish(values:{title:FormDataEntryValue|null;body:FormDataEntryValue|null;kind:FormDataEntryValue|null}):Promise<unknown>;onError(error:unknown):void;}
function StaffNews({ data, onPublish, onError }: StaffNewsProps) {
  const [sending, setSending] = React.useState(false), inFlight = React.useRef(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget, values = new FormData(form);
    inFlight.current = true;
    setSending(true);
    try {
      await onPublish({ title: values.get("title"), body: values.get("body"), kind: values.get("kind") });
      form.reset();
    } catch (error) {
      onError(error);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };
  const dateShort2 = (value: string) => new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric", timeZone: "Europe/Budapest" }).format(new Date(value));
  return <><Heading eyebrow="KOMMUNIKÁCIÓ" title="Hírek és akciók" description="A megjelent híreket minden partner láthatja; push azoknak készül, akik kérték." /><div className="grid equal-col"><section className="card"><h2>Új közlemény</h2><form id="publish-news" className="section-gap" onSubmit={submit}><div className="field"><label htmlFor="news-kind">Típus</label><select id="news-kind" name="kind"><option>Hír</option><option>Akció</option><option>Tájékoztató</option></select></div><div className="field"><label htmlFor="news-title">Cím</label><input id="news-title" name="title" maxLength={140} placeholder="Például: Akciós az 1 kg-os gyros" required /></div><div className="field"><label htmlFor="news-body">Szöveg</label><textarea id="news-body" name="body" rows={7} maxLength={4000} placeholder="Írd le az ajánlatot, az árat, az érvényességet és a feltételeket." required /></div><p className="notice">{data.subscribedPartners} partner kért hírekről értesítést. A küldés a háttérfolyamat működésétől függ.</p><button className="button primary" disabled={sending}>{sending ? "K\xF6zz\xE9t\xE9tel folyamatban\u2026" : "K\xF6zz\xE9t\xE9tel \u2192"}</button></form></section><div className="news-list">{data.news.map((item) => <article className="card news-card" key={item.id}><div className="news-meta"><span className={"badge " + (item.kind === "Akci\xF3" ? "amber" : "blue")}>{item.kind}</span><time>{dateShort2(item.createdAt)}</time></div><h3>{item.title}</h3><p className="news-body">{item.body}</p></article>)}</div></div></>;
}
export {
  StaffNews
};
