const crypto = require('node:crypto');
const { localTime } = require('./domain');
const { eligibility, disclosure } = require('./tracking');
const { sameCandidate } = require('./tracking-service');

async function monitorTracking({ store, provider, now = () => new Date(), live = false }) {
  if (!provider) return 0;
  const snapshot = await store.read();
  const partnerIds = [...new Set((snapshot.responses || []).map((r) => r.partnerId))];
  let queued = 0;
  const requests = new Map();
  for (const partnerId of partnerIds) {
    const candidate = eligibility(snapshot, partnerId, now());
    if (
      !candidate ||
      !snapshot.users?.some(
        (u) => u.partnerId === partnerId && u.role === 'partner' && u.status === 'approved',
      ) ||
      !snapshot.subscriptions?.some((s) => s.partnerId === partnerId)
    )
      continue;
    let request = requests.get(candidate.vehicle.deviceId);
    if (!request) {
      request = Promise.resolve()
        .then(() => provider.position(candidate.vehicle.deviceId))
        .catch(() => null);
      requests.set(candidate.vehicle.deviceId, request);
    }
    const position = await request;
    queued += await store.change((state) => {
      const clock = now();
      const current = eligibility(state, partnerId, clock);
      if (
        !sameCandidate(candidate, current) ||
        disclosure(current, position, clock).status !== 'available' ||
        !state.users?.some(
          (u) => u.partnerId === partnerId && u.role === 'partner' && u.status === 'approved',
        ) ||
        !state.subscriptions?.some((s) => s.partnerId === partnerId)
      )
        return 0;
      const date = localTime(clock).date;
      const key = 'tracking:' + date;
      const previous = state.outbox.find((m) => m.partnerId === partnerId && m.key === key);
      if (previous) {
        const deliveries = Object.values(previous.deliveries || {});
        const unsent = deliveries.every((d) => d.status === 'cancelled' || d.status === 'expired');
        if (!['cancelled', 'no_devices', 'complete'].includes(previous.status) || !unsent) return 0;
        state.outbox = state.outbox.filter((m) => m !== previous);
      }
      state.outbox.push({
        id: crypto.randomUUID(),
        partnerId,
        key,
        category: 'tracking',
        trackingAssignmentId: current.assignment.id,
        trackingOrderId: current.order.id,
        createdAt: clock.toISOString(),
        title: 'Közeledik a kiszállítás',
        body: 'A kiszállító jármű a közelben van.',
        url: '/partner/',
        status: live ? 'pending' : 'simulation',
      });
      return 1;
    });
  }
  return queued;
}
module.exports = { monitorTracking };
