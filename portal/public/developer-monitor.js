(() => {
  const get = (id) => document.getElementById(id);
  let messages = [];
  const element = (tag, value, className) => {
    const e = document.createElement(tag);
    if (value != null) e.textContent = value;
    if (className) e.className = className;
    return e;
  };
  const date = (value) => {
    const parsed = new Date(value);
    return value && Number.isFinite(parsed.getTime())
      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
          parsed,
        )
      : 'Not available';
  };
  const title = (value) =>
    String(value || 'Unknown')
      .replace(/[-_]/g, ' ')
      .replace(/^./, (c) => c.toUpperCase());
  function deliveryState(item) {
    const statuses = item.deliveries.map((d) => d.status);
    if (statuses.some((s) => ['failed', 'expired'].includes(s))) return ['Attention', 'bad'];
    if (item.status === 'no_devices') return ['No devices', 'neutral'];
    if (statuses.some((s) => ['pending', 'sending'].includes(s)) || item.status === 'pending')
      return ['Pending', 'pending'];
    if (statuses.length && statuses.every((s) => s === 'sent')) return ['Accepted', 'good'];
    return [title(item.status), 'neutral'];
  }
  function badge(label, tone) {
    const b = element('span', null, `badge badge--${tone}`);
    b.append(element('span', null, 'status-dot'), document.createTextNode(label));
    return b;
  }
  function history() {
    const target = get('history');
    target.replaceChildren();
    const query = get('filter').value.trim().toLowerCase();
    const filtered = messages.filter((m) =>
      [
        m.partner,
        m.category,
        m.status,
        deliveryState(m)[0],
        ...m.deliveries.map((d) => d.status),
      ].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(query),
      ),
    );
    get('history-count').textContent =
      `${filtered.length} ${filtered.length === 1 ? 'notification' : 'notifications'}`;
    if (!filtered.length)
      target.append(
        element(
          'p',
          query ? 'No notifications match your search.' : 'No recent notifications to show.',
          'empty',
        ),
      );
    for (const item of filtered) {
      const details = element('details', null, 'history-item');
      const summary = element('summary', null, 'history-summary');
      const icon = element('span', '↗', 'activity-icon');
      icon.setAttribute('aria-hidden', 'true');
      const main = element('span', null, 'history-main');
      main.append(
        element('strong', item.partner || 'Staff / unknown'),
        element('span', `${title(item.category)} · ${date(item.createdAt)}`, 'history-meta'),
      );
      const [label, tone] = deliveryState(item);
      summary.append(icon, main, badge(label, tone), element('span', '⌄', 'chevron'));
      details.append(summary);
      const content = element('div', null, 'delivery-list');
      if (!item.deliveries.length)
        content.append(element('p', 'No device delivery records.', 'delivery-empty'));
      for (const d of item.deliveries) {
        const row = element('div', null, 'delivery');
        const identity = element('div');
        identity.append(
          element('strong', `Device ${d.device}`),
          element('span', `Updated ${date(d.updatedAt)}`, 'delivery-meta'),
        );
        const info = element('div', null, 'delivery-info');
        info.append(
          badge(
            title(d.status === 'sent' ? 'accepted' : d.status),
            d.status === 'sent'
              ? 'good'
              : ['failed', 'expired'].includes(d.status)
                ? 'bad'
                : 'neutral',
          ),
          element(
            'span',
            `${d.attempts ?? 0} attempts · Reason: ${d.reason || d.httpStatus || 'not recorded'}`,
            'delivery-meta',
          ),
        );
        row.append(identity, info);
        content.append(row);
      }
      details.append(content);
      target.append(details);
    }
  }
  function card(name, status, detail, symbol) {
    const tone =
      status === 'healthy' || status === 'live'
        ? 'good'
        : status === 'warning' || status === 'failed'
          ? 'bad'
          : 'neutral';
    const label =
      status === 'healthy'
        ? 'Healthy'
        : status === 'warning'
          ? 'Attention needed'
          : status === 'live'
            ? 'Live'
            : title(status);
    const result = element('article', null, `health-card health-card--${tone}`);
    const top = element('div', null, 'card-top');
    top.append(element('span', symbol, 'card-icon'), badge(label, tone));
    result.append(top, element('h3', name), element('p', detail, 'card-detail'));
    return result;
  }
  async function refresh() {
    get('refresh').disabled = true;
    try {
      const response = await fetch('/partner-admin/api/developer-monitor', { cache: 'no-store' });
      if (!response.ok) throw Error('Unable to load status. Check your connection and sign-in.');
      const data = await response.json();
      get('error').hidden = true;
      get('checked').textContent = `Last checked ${date(data.checkedAt)}`;
      get('health').replaceChildren(
        card('Database', data.database, 'Connection successful', '▤'),
        card('Background worker', data.worker, `Last active ${date(data.lastTick)}`, '◷'),
        card('Backup', data.backup, `Last created ${date(data.backupAt)}`, '▱'),
        card(
          'Push mode',
          data.pushMode,
          data.pushMode === 'live'
            ? 'Live delivery enabled'
            : data.pushMode === 'simulation'
              ? 'Simulation only; no live push'
              : 'Mode not available',
          '◉',
        ),
      );
      messages = data.messages;
      history();
    } catch (error) {
      get('error').textContent = error.message;
      get('error').hidden = false;
      get('checked').textContent = 'Status unavailable';
      get('health').replaceChildren();
      messages = [];
      get('history').replaceChildren(element('p', 'Push history is unavailable.', 'empty'));
      get('history-count').textContent = '';
    } finally {
      get('refresh').disabled = false;
    }
  }
  get('refresh').addEventListener('click', refresh);
  get('filter').addEventListener('input', history);
  refresh();
  setInterval(refresh, 60000);
})();
