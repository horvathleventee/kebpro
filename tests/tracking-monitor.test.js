const test = require('node:test');
const assert = require('node:assert/strict');
const { monitorTracking } = require('../portal/tracking-monitor');
const now = new Date('2026-11-10T12:00:00Z');
function fixture() {
  return {
    users: [{ id: 'u', partnerId: 'p', role: 'partner', status: 'approved' }],
    subscriptions: [{ partnerId: 'p' }],
    outbox: [],
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
    trackingVehicles: [{ id: 'v', deviceId: '1' }],
    trackingAssignments: [{ id: 'a', routeId: 'r', date: '2026-11-10', vehicleId: 'v' }],
  };
}
test('background monitoring queues once per partner per day and keeps coordinates out of push', async () => {
  const state = fixture();
  const store = { read: async () => structuredClone(state), change: async (fn) => fn(state) };
  const provider = {
    position: async () => ({ latitude: 47, longitude: 19, timestamp: now.toISOString() }),
  };
  assert.equal(await monitorTracking({ store, provider, now: () => now, live: true }), 1);
  assert.equal(await monitorTracking({ store, provider, now: () => now, live: true }), 0);
  assert.equal(state.outbox[0].status, 'pending');
  assert.equal(JSON.stringify(state.outbox).includes('latitude'), false);
});
test('background monitoring discards a position if assignment changes while fetching', async () => {
  const state = fixture();
  const store = { read: async () => structuredClone(state), change: async (fn) => fn(state) };
  const provider = {
    position: async () => {
      state.trackingAssignments[0].id = 'new';
      return { latitude: 47, longitude: 19, timestamp: now.toISOString() };
    },
  };
  assert.equal(await monitorTracking({ store, provider, now: () => now, live: true }), 0);
  assert.equal(state.outbox.length, 0);
});

test('dispatch rechecks proximity and sends only generic payload', async () => {
  const state = fixture();
  state.partners = [{ id: 'p', preferences: {} }];
  state.vapid = { publicKey: 'public', privateKey: 'private' };
  state.subscriptions = [
    {
      partnerId: 'p',
      endpoint: 'https://fcm.googleapis.com/send/test',
      keys: { auth: 'a'.repeat(22), p256dh: 'b'.repeat(87) },
      createdAt: '2026-11-09T00:00:00Z',
    },
  ];
  const store = { read: async () => structuredClone(state), change: async (fn) => fn(state) };
  let latitude = 47,
    payload;
  const provider = {
    position: async () => ({ latitude, longitude: 19, timestamp: now.toISOString() }),
  };
  await monitorTracking({ store, provider, now: () => now, live: true });
  latitude = 48;
  const dispatch = require('../portal/notifications').dispatchNotifications;
  const send = async (_subscription, body) => {
    payload = JSON.parse(body);
  };
  await dispatch(store, {
    dryRun: false,
    subject: 'mailto:test@example.com',
    now: () => now,
    send,
    trackingProvider: provider,
  });
  assert.equal(payload, undefined);
  latitude = 47;
  assert.equal(await monitorTracking({ store, provider, now: () => now, live: true }), 1);
  await dispatch(store, {
    dryRun: false,
    subject: 'mailto:test@example.com',
    now: () => now,
    send,
    trackingProvider: provider,
  });
  assert.equal(payload.title, 'Közeledik a kiszállítás');
  assert.equal(JSON.stringify(payload).includes('latitude'), false);
  assert.equal(await monitorTracking({ store, provider, now: () => now, live: true }), 0);
});
