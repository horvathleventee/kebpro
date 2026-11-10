// Tracking policy is deliberately independent of the provider and HTTP layer.
// Address coordinates must be explicitly verified against the order's address.
const domain = require('./domain');
const { randomUUID } = require('node:crypto');

function validateState(state) {
  for (const key of ['trackingVehicles', 'trackingAssignments'])
    if (state[key] !== undefined && !Array.isArray(state[key]))
      throw Error('Invalid tracking data');
  const keys = new Set();
  for (const a of state.trackingAssignments || []) {
    if (!a.id || !a.routeId || !domain.validDate(a.date) || !a.vehicleId)
      throw Error('Invalid tracking assignment');
    const key = JSON.stringify([a.routeId, a.date]);
    if (keys.has(key)) throw Error('Duplicate tracking assignment');
    keys.add(key);
  }
}

function saveVehicle(state, input) {
  domain.assert(
    typeof input.label === 'string' && input.label.trim().length > 0 && input.label.length <= 100,
    'Érvénytelen járműnév.',
  );
  domain.assert(
    typeof input.deviceId === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(input.deviceId),
    'Érvénytelen eszközazonosító.',
  );
  domain.assert(
    input.licensePlate === undefined ||
      (typeof input.licensePlate === 'string' &&
        (input.licensePlate.trim() === '' ||
          /^[\p{L}\p{N} -]{1,30}$/u.test(input.licensePlate.trim()))),
    'Érvénytelen rendszám.',
  );
  const vehicles = (state.trackingVehicles ||= []);
  const vehicle = input.id && vehicles.find((v) => v.id === input.id);
  domain.assert(!input.id || vehicle, 'Ismeretlen jármű.', 404);
  domain.assert(
    !vehicles.some((v) => v.deviceId === input.deviceId && v.id !== input.id),
    'Az eszköz már szerepel.',
    409,
  );
  const registration =
    input.licensePlate === undefined ? vehicle?.licensePlate || '' : input.licensePlate.trim();
  if (vehicle)
    Object.assign(vehicle, {
      label: input.label.trim(),
      deviceId: input.deviceId,
      licensePlate: registration,
    });
  else
    vehicles.push({
      id: randomUUID(),
      label: input.label.trim(),
      deviceId: input.deviceId,
      licensePlate: registration,
    });
}

function assign(state, input) {
  domain.assert(
    domain.validDate(input.date) &&
      state.routes.some(
        (r) =>
          r.id === input.routeId && (input.vehicleId === null || domain.deliveryOn(r, input.date)),
      ),
    'Érvénytelen túra vagy nap.',
  );
  domain.assert(
    input.vehicleId === null ||
      (state.trackingVehicles || []).some((v) => v.id === input.vehicleId),
    'Ismeretlen jármű.',
  );
  const assignments = (state.trackingAssignments ||= []);
  domain.assert(
    assignments.filter((a) => a.routeId === input.routeId && a.date === input.date).length <= 1,
    'Ütköző hozzárendelések.',
    409,
  );
  state.trackingAssignments = assignments.filter(
    (a) => a.routeId !== input.routeId || a.date !== input.date,
  );
  if (input.vehicleId !== null)
    state.trackingAssignments.push({
      id: randomUUID(),
      routeId: input.routeId,
      date: input.date,
      vehicleId: input.vehicleId,
    });
}

function verifyAddress(state, input) {
  const order = state.responses.find((r) => r.id === input.orderId);
  domain.assert(
    order && order.kind === 'order' && typeof order.address === 'string' && order.address.trim(),
    'Ismeretlen rendelés vagy szállítási cím.',
  );
  domain.assert(
    input.address === order.address && point(input),
    'A cím vagy a koordináta érvénytelen.',
    409,
  );
  order.trackingAddress = {
    address: order.address,
    verified: true,
    verificationId: randomUUID(),
    latitude: input.latitude,
    longitude: input.longitude,
  };
  const partner = state.partners.find((p) => p.id === order.partnerId);
  domain.assert(partner, 'Ismeretlen partner.', 404);
  partner.trackingAddresses ||= [];
  partner.trackingAddresses = partner.trackingAddresses.filter(
    (entry) => entry.address !== order.address,
  );
  partner.trackingAddresses.push({ ...order.trackingAddress });
  if (partner.address === order.address) delete partner.trackingPointRequired;
}

function suggestPartnerAddress(state, partnerId, input, now = new Date()) {
  const partner = state.partners.find((p) => p.id === partnerId);
  domain.assert(
    partner && typeof partner.address === 'string' && partner.address.trim(),
    'A szállítási cím nem található.',
    404,
  );
  domain.assert(
    input.address === partner.address && point(input),
    'A szállítási cím időközben megváltozott vagy a pont érvénytelen.',
    409,
  );
  partner.trackingAddressSuggestion = {
    address: partner.address,
    latitude: input.latitude,
    longitude: input.longitude,
    submittedAt: now.toISOString(),
    id: randomUUID(),
  };
  delete partner.trackingPointRequired;
}

function updatePartnerDeliveryAddress(state, input) {
  const partner = state.partners.find((p) => p.id === input.partnerId);
  domain.assert(partner, 'Ismeretlen partner.', 404);
  domain.assert(
    input.expectedAddress === partner.address,
    'A cím időközben megváltozott. Frissítsd az oldalt.',
    409,
  );
  domain.assert(
    typeof input.address === 'string' &&
      input.address.trim().length > 0 &&
      input.address.length <= 250,
    'Adj meg érvényes szállítási címet.',
  );
  const address = input.address.trim();
  if (address !== partner.address) {
    partner.address = address;
    delete partner.trackingAddressSuggestion;
  }
}

function verifyPartnerAddress(state, input) {
  const partner = state.partners.find((p) => p.id === input.partnerId);
  domain.assert(
    partner && typeof partner.address === 'string' && partner.address.trim(),
    'Ismeretlen partner vagy szállítási cím.',
    404,
  );
  domain.assert(
    input.address === partner.address && point(input),
    'A szállítási cím időközben megváltozott vagy a pont érvénytelen.',
    409,
  );
  if (input.suggestionId) {
    const suggestion = partner.trackingAddressSuggestion;
    domain.assert(
      suggestion &&
        suggestion.id === input.suggestionId &&
        suggestion.address === partner.address &&
        suggestion.latitude === input.latitude &&
        suggestion.longitude === input.longitude,
      'A javaslat időközben megváltozott.',
      409,
    );
  }
  const verified = {
    address: partner.address,
    verified: true,
    verificationId: randomUUID(),
    latitude: input.latitude,
    longitude: input.longitude,
  };
  partner.trackingAddresses = (partner.trackingAddresses || []).filter(
    (entry) => entry.address !== partner.address,
  );
  partner.trackingAddresses.push(verified);
  delete partner.trackingPointRequired;
  if (partner.trackingAddressSuggestion?.address === partner.address)
    delete partner.trackingAddressSuggestion;
}

function point(value) {
  return (
    value &&
    typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

function distanceKm(a, b) {
  const radians = (n) => (n * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude),
    dLon = radians(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}

function verifiedAddress(state, partnerId, address, ownAddress) {
  if (typeof address !== 'string' || !address.trim()) return null;
  const valid = (entry) =>
    entry && entry.address === address && entry.verified === true && point(entry);
  const cached = (state.partners || [])
    .filter((p) => p.id === partnerId)
    .flatMap((p) => p.trackingAddresses || [])
    .filter(valid);
  if (cached.length > 1) return null;
  if (cached.length === 1) return cached[0];
  if (valid(ownAddress)) return ownAddress;
  const legacy = (state.responses || [])
    .filter((r) => r.partnerId === partnerId && r.address === address)
    .map((r) => r.trackingAddress)
    .filter(valid);
  const unique = new Map(
    legacy.map((entry) => [JSON.stringify([entry.latitude, entry.longitude]), entry]),
  );
  return unique.size === 1 ? [...unique.values()][0] : null;
}

function eligibility(state, partnerId, now) {
  const date = domain.localTime(now).date;
  const orders = (state.responses || []).filter(
    (r) => r.partnerId === partnerId && r.date === date,
  );
  // Any conflict is ambiguous, including an order alongside a skip.
  if (orders.length !== 1 || orders[0].kind !== 'order' || !orders[0].routeId) return null;
  const order = orders[0];
  const routes = (state.routes || []).filter((r) => r.id === order.routeId);
  if (routes.length !== 1 || !domain.deliveryOn(routes[0], date)) return null;
  const assignments = (state.trackingAssignments || []).filter(
    (a) => a.routeId === order.routeId && a.date === date,
  );
  if (assignments.length !== 1) return null;
  const assignment = assignments[0];
  const vehicles = (state.trackingVehicles || []).filter((v) => v.id === assignment.vehicleId);
  const address = verifiedAddress(state, partnerId, order.address, order.trackingAddress);
  if (
    vehicles.length !== 1 ||
    !vehicles[0].deviceId ||
    !address ||
    address.address !== order.address ||
    address.verified !== true ||
    !point(address)
  )
    return null;
  const configuredRadius = routes[0].trackingRadiusKm;
  if (configuredRadius !== undefined && (typeof configuredRadius !== 'number' || !Number.isFinite(configuredRadius) || configuredRadius < 1 || configuredRadius > 500)) return null;
  return { order, assignment, vehicle: vehicles[0], address, radiusKm: configuredRadius ?? 20 };
}

function disclosure(candidate, position, now, maxAgeMs = 300000) {
  if (!candidate || !point(position) || typeof position.timestamp !== 'string')
    return { status: 'unavailable' };
  const timestamp = Date.parse(position.timestamp);
  const age = now.getTime() - timestamp;
  if (!Number.isFinite(timestamp) || age < 0 || age > maxAgeMs) return { status: 'unavailable' };
  if (distanceKm(candidate.address, position) > (candidate.radiusKm ?? 20)) return { status: 'waiting' };
  return {
    status: 'available',
    latitude: position.latitude,
    longitude: position.longitude,
    timestamp: position.timestamp,
  };
}

module.exports = {
  point,
  distanceKm,
  eligibility,
  disclosure,
  saveVehicle,
  assign,
  verifyAddress,
  suggestPartnerAddress,
  updatePartnerDeliveryAddress,
  verifyPartnerAddress,
  verifiedAddress,
  validateState,
};
