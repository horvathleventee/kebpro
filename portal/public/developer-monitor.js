(() => {
  const get = (id) => document.getElementById(id);
  let messages = [];
  const element = (tag, value) => {
    const e = document.createElement(tag);
    e.textContent = value ?? 'Unknown';
    return e;
  };
  function history() {
    const target = get('history');
    target.replaceChildren();
    const query = get('filter').value.toLowerCase();
    for (const item of messages.filter((m) =>
      [m.partner, m.category, m.status, ...m.deliveries.map((d) => d.status)].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(query),
      ),
    )) {
      const details = document.createElement('details');
      details.append(
        element(
          'summary',
          `${item.createdAt} · ${item.partner || 'Staff / unknown'} · ${item.category} · ${item.status}`,
        ),
      );
      if (!item.deliveries.length) details.append(element('p', 'No device delivery records.'));
      for (const d of item.deliveries)
        details.append(
          element(
            'p',
            `Device ${d.device}: ${d.status}; attempts: ${d.attempts}; last update: ${d.updatedAt || 'unknown'}; reason: ${d.reason || d.httpStatus || 'not recorded'}`,
          ),
        );
      target.append(details);
    }
  }
  async function refresh() {
    try {
      const response = await fetch('/partner-admin/api/developer-monitor', { cache: 'no-store' });
      if (!response.ok) throw Error('Status unavailable. Check your session and access.');
      const data = await response.json();
      get('error').textContent = '';
      get('checked').textContent = `Last checked: ${new Date(data.checkedAt).toLocaleString()}`;
      const cards = get('health');
      cards.replaceChildren();
      for (const [name, value, detail] of [
        ['Database', data.database, 'Read succeeded'],
        ['Worker', data.worker, data.lastTick],
        ['Backup age', data.backup, data.backupAt],
        ['Push mode', data.pushMode, ''],
      ]) {
        const card = element('div', '');
        card.className = 'card';
        card.append(
          element('strong', name),
          element('p', value),
          element('small', detail || 'Unknown'),
        );
        cards.append(card);
      }
      messages = data.messages;
      history();
    } catch (error) {
      get('error').textContent = error.message;
      get('checked').textContent = 'Status unknown';
      get('health').replaceChildren();
    }
  }
  get('refresh').addEventListener('click', refresh);
  get('filter').addEventListener('input', history);
  refresh();
  setInterval(refresh, 60000);
})();
