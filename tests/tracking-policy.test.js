const test = require('node:test');
const assert = require('node:assert/strict');
const tracking = require('../portal/tracking');

const now = new Date('2026-11-10T12:00:00Z');
function fixture() {
  return {
    partners: [{ id: 'p' }],
    routes: [{ id: 'r', days: [2], reschedules: [] }],
    responses: [
      {
        id: 'o',
        partnerId: 'p',
        routeId: 'r',
        date: '2026-11-10',
        kind: 'order',
        address: 'Test address',
        trackingAddress: { address: 'Test address', verified: true, latitude: 47, longitude: 19 },
      },
    ],
    trackingVehicles: [{ id: 'v', deviceId: '123' }],
    trackingAssignments: [{ id: 'a', routeId: 'r', date: '2026-11-10', vehicleId: 'v' }],
  };
}
test('requires an unambiguous order, route, assignment and verified matching address', () => {
  const s = fixture();
  assert.ok(tracking.eligibility(s, 'p', now));
  s.responses[0].archivedAt = now.toISOString();
  assert.ok(tracking.eligibility(s, 'p', now));
  s.responses[0].address = 'Changed';
  assert.equal(tracking.eligibility(s, 'p', now), null);
  s.responses[0].address = 'Test address';
  s.trackingAssignments.push({ ...s.trackingAssignments[0], id: 'b' });
  assert.equal(tracking.eligibility(s, 'p', now), null);
  s.trackingAssignments.pop();
  s.routes[0].reschedules.push({ from: '2026-11-10', to: '2026-11-11' });
  assert.equal(tracking.eligibility(s, 'p', now), null);
});
test('discloses only fresh positions within 20 km', () => {
  const candidate = tracking.eligibility(fixture(), 'p', now);
  const position = { latitude: 47, longitude: 19, timestamp: now.toISOString(), speed: 99 };
  assert.deepEqual(tracking.disclosure(candidate, position, now), {
    status: 'available',
    latitude: 47,
    longitude: 19,
    timestamp: now.toISOString(),
  });
  assert.deepEqual(tracking.disclosure(candidate, { ...position, latitude: 48 }, now), {
    status: 'waiting',
  });
  assert.deepEqual(
    tracking.disclosure(candidate, { ...position, timestamp: '2026-11-10T11:54:59Z' }, now),
    { status: 'unavailable' },
  );
  assert.deepEqual(tracking.disclosure(candidate, { ...position, latitude: NaN }, now), {
    status: 'unavailable',
  });
  const longitude20 = 20 / ((6371.0088 * Math.PI) / 180);
  assert.ok(
    Math.abs(
      tracking.distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: longitude20 }) -
        20,
    ) < 1e-9,
  );
});
test('Budapest delivery date controls eligibility across midnight', () => {
  const s = fixture();
  assert.ok(tracking.eligibility(s, 'p', new Date('2026-11-09T23:00:00Z')));
  assert.equal(tracking.eligibility(s, 'p', new Date('2026-11-10T23:00:00Z')), null);
});

test('route-specific distance controls disclosure and invalid limits fail closed', () => {
  const state = fixture();
  const position = { latitude: 47.3, longitude: 19, timestamp: now.toISOString() };
  assert.equal(
    tracking.disclosure(tracking.eligibility(state, 'p', now), position, now).status,
    'waiting',
  );
  state.routes[0].trackingRadiusKm = 50;
  assert.equal(
    tracking.disclosure(tracking.eligibility(state, 'p', now), position, now).status,
    'available',
  );
  state.routes[0].trackingRadiusKm = 10;
  assert.equal(
    tracking.disclosure(tracking.eligibility(state, 'p', now), position, now).status,
    'waiting',
  );
  state.routes[0].trackingRadiusKm = -1;
  assert.equal(tracking.eligibility(state, 'p', now), null);
});

test('route settings validate and retain the configured distance', () => {
  const domain = require('../portal/domain');
  const state = fixture();
  const input = {
    id: 'r',
    name: 'Teszt',
    days: [2],
    reminder: '10:00',
    cutoff: '14:00',
    trackingRadiusKm: 50,
  };
  domain.updateRoute(state, input);
  assert.equal(state.routes[0].trackingRadiusKm, 50);
  for (const invalid of [0, 501, NaN, '50'])
    assert.throws(() => domain.updateRoute(state, { ...input, trackingRadiusKm: invalid }));
  assert.equal(state.routes[0].trackingRadiusKm, 50);
});

test('changing a route radius invalidates an in-flight tracking decision', () => {
  const { sameCandidate } = require('../portal/tracking-service');
  const state = fixture();
  const original = tracking.eligibility(state, 'p', now);
  state.routes[0].trackingRadiusKm = 50;
  assert.equal(sameCandidate(original, tracking.eligibility(state, 'p', now)), false);
});

test('registration location suggestion follows the approved partner and remains unverified', () => {
  const auth = require('../portal/auth');
  const suggestion = { id: 'suggestion', address: 'Teszt cím', latitude: 47, longitude: 19 };
  const state = {
    routes: [{ id: 'r' }],
    partners: [],
    users: [
      {
        id: 'u',
        role: 'partner',
        status: 'pending',
        company: 'Teszt',
        address: 'Teszt cím',
        trackingAddressSuggestion: suggestion,
      },
    ],
  };
  auth.review(state, { id: 'u', status: 'approved', routeIds: ['r'] });
  assert.deepEqual(state.partners[0].trackingAddressSuggestion, suggestion);
  assert.equal(state.partners[0].trackingPointRequired, true);
  assert.equal(tracking.verifiedAddress(state, state.partners[0].id, 'Teszt cím'), null);
  tracking.suggestPartnerAddress(
    state,
    state.partners[0].id,
    { address: 'Teszt cím', latitude: 47, longitude: 19 },
    now,
  );
  assert.equal(state.partners[0].trackingPointRequired, undefined);
  assert.equal(tracking.verifiedAddress(state, state.partners[0].id, 'Teszt cím'), null);
});

test('staff can verify and adjust a registration location during account approval', () => {
  const auth = require('../portal/auth');
  const makeState = () => ({
    routes: [{ id: 'r' }],
    partners: [],
    users: [
      {
        id: 'u',
        role: 'partner',
        status: 'pending',
        company: 'Teszt',
        address: 'Teszt cím',
        trackingAddressSuggestion: {
          id: 's1',
          source: 'registration',
          address: 'Teszt cím',
          latitude: 47,
          longitude: 19,
        },
      },
    ],
  });
  const stale = makeState();
  assert.throws(
    () =>
      auth.review(stale, {
        id: 'u',
        status: 'approved',
        routeIds: ['r'],
        addressCheck: { suggestionId: 'old', address: 'Teszt cím', latitude: 47.1, longitude: 19 },
      }),
    /megváltozott/,
  );
  assert.equal(stale.users[0].status, 'pending');
  assert.equal(stale.partners.length, 0);
  const state = makeState();
  auth.review(state, {
    id: 'u',
    status: 'approved',
    routeIds: ['r'],
    addressCheck: { suggestionId: 's1', address: 'Teszt cím', latitude: 47.1, longitude: 19 },
  });
  const partner = state.partners[0];
  assert.equal(tracking.verifiedAddress(state, partner.id, partner.address).latitude, 47.1);
  assert.equal(partner.trackingAddressSuggestion, undefined);
});

test('new partner must submit a point before placing an order', () => {
  const domain = require('../portal/domain');
  const state = domain.seed();
  const partner = state.partners[0];
  partner.trackingPointRequired = true;
  const clock = new Date('2026-11-09T08:00:00Z');
  const delivery = domain.deliveries(state, partner, clock).find((d) => d.open);
  assert.ok(delivery);
  assert.throws(
    () => domain.submitResponse(state, partner.id, { date: delivery.date, kind: 'order' }, clock),
    /szállítási pontot/,
  );
  tracking.suggestPartnerAddress(
    state,
    partner.id,
    { address: partner.address, latitude: 47, longitude: 19 },
    clock,
  );
  assert.throws(
    () => domain.submitResponse(state, partner.id, { date: delivery.date, kind: 'order' }, clock),
    /kérésazonosító/,
  );
});

test('staff assignment replacement and address verification bind to the order', () => {
  const s = fixture();
  const previous = s.trackingAssignments[0].id;
  tracking.assign(s, { date: '2026-11-10', routeId: 'r', vehicleId: 'v' });
  assert.notEqual(s.trackingAssignments[0].id, previous);
  assert.throws(() =>
    tracking.verifyAddress(s, { orderId: 'o', address: 'Different', latitude: 47, longitude: 19 }),
  );
  tracking.verifyAddress(s, { orderId: 'o', address: 'Test address', latitude: 47, longitude: 19 });
  assert.ok(tracking.eligibility(s, 'p', now));
  tracking.assign(s, { date: '2026-11-10', routeId: 'r', vehicleId: null });
  assert.equal(tracking.eligibility(s, 'p', now), null);
});
test('staff can add a verified manual registration without overwriting unrelated vehicles', () => {
  const s = fixture();
  tracking.saveVehicle(s, {
    id: 'v',
    label: 'Kiszállító',
    deviceId: '123',
    licensePlate: 'ABC-123',
  });
  assert.equal(s.trackingVehicles[0].licensePlate, 'ABC-123');
  assert.throws(() =>
    tracking.saveVehicle(s, {
      id: 'v',
      label: 'Kiszállító',
      deviceId: '123',
      licensePlate: '<script>',
    }),
  );
  assert.equal(s.trackingVehicles[0].licensePlate, 'ABC-123');
});
test('verified coordinates can be reused only for the same partner and exact address', () => {
  const s = fixture();
  tracking.verifyAddress(s, { orderId: 'o', address: 'Test address', latitude: 47, longitude: 19 });
  delete s.responses[0].trackingAddress;
  assert.ok(tracking.eligibility(s, 'p', now));
  s.responses[0].address = 'Different';
  assert.equal(tracking.eligibility(s, 'p', now), null);
  s.responses[0].address = 'Test address';
  s.responses[0].partnerId = 'other';
  assert.equal(tracking.eligibility(s, 'other', now), null);
});
test('a partner suggestion cannot authorize tracking until staff verifies the exact current address', () => {
  const s = fixture();
  s.partners[0].address = 'Test address';
  delete s.responses[0].trackingAddress;
  tracking.suggestPartnerAddress(
    s,
    'p',
    { address: 'Test address', latitude: 47, longitude: 19 },
    now,
  );
  const suggestion = s.partners[0].trackingAddressSuggestion;
  assert.equal(tracking.eligibility(s, 'p', now), null);
  assert.throws(() =>
    tracking.verifyPartnerAddress(s, {
      partnerId: 'p',
      address: 'Test address',
      latitude: 47,
      longitude: 19,
      suggestionId: 'old',
    }),
  );
  tracking.verifyPartnerAddress(s, {
    partnerId: 'p',
    address: 'Test address',
    latitude: 47,
    longitude: 19,
    suggestionId: suggestion.id,
  });
  assert.ok(tracking.eligibility(s, 'p', now));
  assert.equal(s.partners[0].trackingAddressSuggestion, undefined);
  s.responses[0].address = 'Different';
  assert.equal(tracking.eligibility(s, 'p', now), null);
});
test('a corrected verified partner point supersedes older coordinates for the same address', () => {
  const s = fixture();
  s.partners[0].address = 'Test address';
  tracking.verifyPartnerAddress(s, {
    partnerId: 'p',
    address: 'Test address',
    latitude: 47.1,
    longitude: 19.1,
  });
  assert.equal(tracking.eligibility(s, 'p', now).address.latitude, 47.1);
});
test('address updates do not rewrite existing orders and invalidate proposals for the old address', () => {
  const s = fixture();
  s.partners[0].address = 'Test address';
  tracking.suggestPartnerAddress(
    s,
    'p',
    { address: 'Test address', latitude: 47, longitude: 19 },
    now,
  );
  assert.throws(() =>
    tracking.updatePartnerDeliveryAddress(s, {
      partnerId: 'p',
      expectedAddress: 'stale',
      address: 'New address',
    }),
  );
  tracking.updatePartnerDeliveryAddress(s, {
    partnerId: 'p',
    expectedAddress: 'Test address',
    address: 'New address',
  });
  assert.equal(s.partners[0].address, 'New address');
  assert.equal(s.partners[0].trackingAddressSuggestion, undefined);
  assert.equal(s.responses[0].address, 'Test address');
  assert.ok(tracking.eligibility(s, 'p', now));
  assert.equal(tracking.verifiedAddress(s, 'p', 'New address'), null);
});
