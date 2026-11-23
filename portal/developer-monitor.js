// Explicit projection: never expose subscription endpoints, keys, or notification bodies.
function snapshot(state, now = new Date()) {
  const time = now.getTime();
  const ageStatus = (value, limit) => {
    const parsed = Date.parse(value || '');
    if (!Number.isFinite(parsed) || parsed > time) return 'unknown';
    return time - parsed < limit ? 'healthy' : 'warning';
  };
  const operations = state.operations || {};
  const messages = (state.outbox || [])
    .filter((item) => Date.parse(item.createdAt) >= time - 30 * 86400000)
    .map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      category: item.category,
      status: item.status,
      partner: (state.partners || []).find((p) => p.id === item.partnerId)?.name || null,
      deliveries: Object.entries(item.deliveries || {}).map(([key, delivery]) => ({
        device: key.slice(0, 12),
        status: delivery.status,
        attempts: delivery.attempts,
        updatedAt: delivery.updatedAt || null,
        reason: delivery.reason || null,
        httpStatus: delivery.httpStatus || null,
      })),
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return {
    checkedAt: now.toISOString(),
    database: 'healthy',
    worker: operations.lastError ? 'warning' : ageStatus(operations.lastTick, 180000),
    lastTick: operations.lastTick || null,
    backup: ageStatus(operations.backupAt, 26 * 3600000),
    backupAt: operations.backupAt || null,
    pushMode: operations.pushMode || 'unknown',
    messages,
  };
}
module.exports = { snapshot };
