const test = require('node:test');
const assert = require('node:assert/strict');
const { location, untilMidnight } = require('../portal/tracking-service');
const now = new Date('2026-11-10T12:00:00Z');
test('Budapest midnight accounts for daylight-saving changes', () => {
  assert.equal(untilMidnight(new Date('2026-03-28T23:00:00Z')), 23 * 3600000);
  assert.equal(untilMidnight(new Date('2026-10-24T22:00:00Z')), 25 * 3600000);
});
function fixture() {
  return {
    sessions: [
      { hash: 's', userId: 'u', partnerId: 'p', role: 'partner', expires: now.getTime() + 100000 },
    ],
    users: [{ id: 'u', partnerId: 'p', role: 'partner', status: 'approved' }],
    routes: [{ id: 'r', days: [2] }],
    responses: [
      {
        id: 'o',
        partnerId: 'p',
        routeId: 'r',
        date: '2026-11-10',
        kind: 'order',
        address: 'A',
        trackingAddress: { address: 'A', verified: true, latitude: 47, longitude: 19 },
      },
    ],
    trackingAssignments: [{ id: 'a', routeId: 'r', date: '2026-11-10', vehicleId: 'v' }],
    trackingVehicles: [{ id: 'v', deviceId: '1' }],
  };
}
test('rechecks assignment, address and session after the upstream request', async () => {
  for (const mutate of [
    (s) => {
      s.trackingAssignments[0].id = 'replacement';
    },
    (s) => {
      s.responses[0].address = 'B';
    },
    (s) => {
      s.sessions = [];
    },
  ]) {
    const state = fixture();
    const result = await location({
      store: { read: async () => structuredClone(state) },
      sessionHash: 's',
      now: () => now,
      provider: {
        position: async () => {
          mutate(state);
          return { latitude: 47, longitude: 19, timestamp: now.toISOString() };
        },
      },
    });
    assert.deepEqual(result, { status: 'unavailable' });
  }
});
test('only requests the server-selected device and returns a minimal response', async () => {
  const state = fixture();
  const result = await location({
    store: { read: async () => structuredClone(state) },
    sessionHash: 's',
    now: () => now,
    provider: {
      position: async (device) => {
        assert.equal(device, '1');
        return { latitude: 47, longitude: 19, timestamp: now.toISOString(), speed: 100 };
      },
    },
  });
  assert.deepEqual(result, {
    status: 'available',
    latitude: 47,
    longitude: 19,
    timestamp: now.toISOString(),
  });
});
test('registration appears only for an authorized nearby vehicle', async () => {
  const state = fixture();
  let latitude = 47;
  const provider = {
    position: async () => ({ latitude, longitude: 19, timestamp: now.toISOString() }),
    plate: async () => 'ABC-123',
  };
  const args = {
    store: { read: async () => structuredClone(state) },
    sessionHash: 's',
    now: () => now,
    provider,
  };
  assert.equal((await location(args)).licensePlate, 'ABC-123');
  provider.plate = async () => null;
  state.trackingVehicles[0].licensePlate = 'MAN-123';
  assert.equal((await location(args)).licensePlate, 'MAN-123');
  latitude = 48;
  assert.deepEqual(await location(args), { status: 'waiting' });
  latitude = 47;
  provider.plate = async () => {
    state.sessions = [];
    return 'ABC-123';
  };
  assert.deepEqual(await location(args), { status: 'unavailable' });
});
