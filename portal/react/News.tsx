import React from 'react';
interface NewsItem {
  id: string;
  kind: string;
  createdAt: string;
  title: string;
  body: string;
}
interface NewsProps {
  news: readonly NewsItem[];
  onRefresh(): void;
}
function News({ news, onRefresh }: NewsProps) {
  const dateShort2 = (value: string) =>
    new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Europe/Budapest',
    }).format(new Date(value));
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">HÍREK ÉS AJÁNLATOK</span>
          <h1>Frissen a Kebprótól</h1>
          <p>Akciók, újdonságok és fontos tudnivalók.</p>
        </div>
        <button className="button secondary" data-action="refresh" onClick={onRefresh}>
          Frissítés
        </button>
      </div>
      <div className="news-list">
        {news.map((item) => (
          <article className="card news-card" key={item.id}>
            <div className="news-meta">
              <span className={'badge ' + (item.kind === 'Akci\xF3' ? 'amber' : 'blue')}>
                {item.kind}
              </span>
              <time>{dateShort2(item.createdAt)}</time>
            </div>
            <h3>{item.title}</h3>
            <p className="news-body">{item.body}</p>
          </article>
        ))}
      </div>
    </>
  );
}
export { News };
