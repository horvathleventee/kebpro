import React from 'react';

export function useNewsPage<T extends { id: string }>(items: readonly T[]) {
  const [page, setPage] = React.useState(1);
  const firstId = items[0]?.id;
  React.useEffect(() => setPage(1), [firstId]);
  const pages = Math.max(1, Math.ceil(items.length / 4));
  const current = Math.min(page, pages);
  return { items: items.slice((current - 1) * 4, current * 4), page: current, pages, setPage };
}

export function NewsPager({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="news-pagination" role="navigation" aria-label="Hírek lapozása">
      <button
        type="button"
        className="button secondary"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        ← Előző
      </button>
      <span className="news-pagination-count" aria-live="polite">
        <strong>{page}</strong> / {pages} oldal
      </span>
      <button
        type="button"
        className="button secondary"
        disabled={page >= pages}
        onClick={() => setPage(page + 1)}
      >
        Következő →
      </button>
    </div>
  );
}
