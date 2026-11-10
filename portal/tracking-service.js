const { eligibility, disclosure } = require('./tracking');

function untilMidnight(now) {
  const localTime = require('./domain').localTime;
  const date = localTime(now).date;
  let low = now.getTime(),
    high = low + 27 * 3600000;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (localTime(new Date(mid)).date === date) low = mid;
    else high = mid;
  }
  return high - now.getTime();
}

// Re-read the complete state after the provider call. A fresh assignment ID
// must be used whenever a vehicle is assigned or replaced.
function sameCandidate(a, b) {
  return (
    !!a &&
    !!b &&
    a.order.id === b.order.id &&
    a.order.routeId === b.order.routeId &&
    a.order.date === b.order.date &&
    a.order.revision === b.order.revision &&
    a.assignment.id === b.assignment.id &&
    a.vehicle.id === b.vehicle.id &&
    a.vehicle.deviceId === b.vehicle.deviceId &&
    a.radiusKm === b.radiusKm &&
    JSON.stringify(a.address) === JSON.stringify(b.address)
  );
}

async function location({ store, provider, sessionHash, now = () => new Date() }) {
  function authorized(state, clock) {
    const session = (state.sessions || []).find(
      (s) => s.hash === sessionHash && s.role === 'partner' && s.expires > clock.getTime(),
    );
    const user =
      session &&
      (state.users || []).find(
        (u) =>
          u.id === session.userId &&
          u.role === 'partner' &&
          u.status === 'approved' &&
          u.partnerId === session.partnerId,
      );
    return user ? eligibility(state, session.partnerId, clock) : null;
  }
  const first = authorized(await store.read(), now());
  if (!first) return { status: 'unavailable' };
  let position;
  try {
    position = await provider.position(first.vehicle.deviceId);
  } catch {
    return { status: 'unavailable' };
  }
  let providerPlate;
  try { if (provider.plate) providerPlate = await provider.plate(first.vehicle.deviceId); } catch {}
  const state = await store.read();
  const clock = now();
  const second = authorized(state, clock);
  if (!sameCandidate(first, second)) return { status: 'unavailable' };
  const result = disclosure(second, position, clock);
  const plate = providerPlate || second.vehicle.licensePlate;
  if (result.status === 'available' && typeof plate === 'string' && /^[\p{L}\p{N} -]{1,30}$/u.test(plate))
    result.licensePlate = plate;
  return result;
}

module.exports = { location, sameCandidate, untilMidnight };
