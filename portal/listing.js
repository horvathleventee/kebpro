const { assert, validDate, localTime } = require('./domain');
const SIZE = 25;
function options(query = {}, partner = false) {
  const page = Number(query.page || 1);
  assert(Number.isInteger(page) && page >= 1 && page <= 100000, 'Érvénytelen oldalszám.');
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  assert(search.length <= 100, 'Túl hosszú keresés.');
  const day = query.day || '';
  assert(!day || validDate(day), 'Érvénytelen napszűrés.');
  return {
    page,
    size: SIZE,
    partner,
    view: query.view === 'archived' ? 'archived' : 'new',
    sort: query.sort === 'archivedAt' ? 'archivedAt' : 'createdAt',
    search,
    day,
  };
}
const isOrder = (r) =>
  r.kind === 'order' || (r.modifiedAt && r.changes?.some((c) => c.kind === 'order'));
function pageInfo(total, o) {
  const pages = Math.max(1, Math.ceil(total / o.size)),
    page = Math.min(o.page, pages);
  return { page, pages, total, size: o.size };
}
function select(rows, o) {
  const orders = o.partner ? rows : rows.filter(isOrder),
    counts = {
      new: orders.filter((r) => !r.archivedAt).length,
      archived: orders.filter((r) => r.archivedAt).length,
    };
  const field = !o.partner && o.view === 'archived' ? o.sort : 'createdAt';
  const filtered = orders
    .filter(
      (r) =>
        o.partner ||
        (Boolean(r.archivedAt) === (o.view === 'archived') &&
          (!o.search ||
            [r.partnerName, r.address, r.id]
              .join(' ')
              .toLocaleLowerCase('hu')
              .includes(o.search.toLocaleLowerCase('hu'))) &&
          (!o.day || o.view !== 'archived' || localTime(new Date(r[field])).date === o.day)),
    )
    .sort((a, b) => b[field].localeCompare(a[field]) || b.id.localeCompare(a.id));
  const pagination = pageInfo(filtered.length, o);
  return {
    rows: filtered.slice((pagination.page - 1) * o.size, pagination.page * o.size),
    pagination,
    counts,
  };
}
async function sqlPage(client, o, partnerId) {
  const values = [],
    bind = (v) => {
      values.push(v);
      return '$' + values.length;
    };
  const order =
    "(body->>'kind'='order' OR (body ? 'modifiedAt' AND body->'changes' @> '[{\"kind\":\"order\"}]'::jsonb))";
  const archived = "COALESCE(body->>'archivedAt','')<>''";
  const where = o.partner
    ? ["body->>'partnerId'=" + bind(partnerId)]
    : [order, o.view === 'archived' ? archived : 'NOT (' + archived + ')'];
  const field = !o.partner && o.view === 'archived' ? o.sort : 'createdAt';
  if (!o.partner && o.search)
    where.push(
      "strpos(lower(concat_ws(' ',body->>'partnerName',body->>'address',id)),lower(" +
        bind(o.search) +
        '))>0',
    );
  if (!o.partner && o.view === 'archived' && o.day)
    where.push(
      "((body->>'" +
        field +
        "')::timestamptz AT TIME ZONE 'Europe/Budapest')::date=" +
        bind(o.day) +
        '::date',
    );
  const predicate = where.join(' AND '),
    count = await client.query(
      'SELECT count(*)::int AS n FROM kebpro_portal.orders WHERE ' + predicate,
      values,
    );
  const pagination = pageInfo(count.rows[0].n, o);
  const result = await client.query(
    'SELECT body FROM kebpro_portal.orders WHERE ' +
      predicate +
      " ORDER BY body->>'" +
      field +
      "' DESC,id DESC LIMIT " +
      bind(o.size) +
      ' OFFSET ' +
      bind((pagination.page - 1) * o.size),
    values,
  );
  let counts;
  if (!o.partner) {
    const totals = await client.query(
      'SELECT count(*) FILTER(WHERE NOT (' +
        archived +
        '))::int AS new,count(*) FILTER(WHERE ' +
        archived +
        ')::int AS archived FROM kebpro_portal.orders WHERE ' +
        order,
    );
    counts = totals.rows[0];
  }
  return { rows: result.rows.map((r) => r.body), pagination, counts };
}
module.exports = { options, select, sqlPage, isOrder };
