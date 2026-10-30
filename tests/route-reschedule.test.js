const test = require('node:test');
const assert = require('node:assert/strict');
const d = require('../portal/domain');

function setup() {
  const state = d.seed();
  state.routes = [{ id: 'mon', name: 'Hétfői túra', days: [1] }];
  state.partners = [
    { id: 'p', name: 'Partner', routeId: 'mon', preferences: { reminders: true, news: false } },
  ];
  state.responses = [];
  state.outbox = [];
  return state;
}

test('rescheduling changes only the selected occurrence and calculates the preceding-day deadline', () => {
  const state = setup();
  d.rescheduleRoute(
    state,
    { routeId: 'mon', from: '2026-11-02', to: '2026-11-03' },
    new Date('2026-10-28T08:00:00Z'),
  );
  const options = d.deliveries(state, state.partners[0], new Date('2026-10-28T08:00:00Z'));
  assert.equal(
    options.some((o) => o.date === '2026-11-02'),
    false,
  );
  assert.equal(options.find((o) => o.date === '2026-11-03').cutoffDate, '2026-11-02');
  assert.equal(
    options.some((o) => o.date === '2026-11-09'),
    true,
  );
  assert.equal(d.runReminders(state, new Date('2026-11-01T16:00:00Z')), 1);
  assert.equal(d.runReminders(state, new Date('2026-11-02T09:00:00Z')), 1);
  assert.equal(d.callSchedule(state, new Date('2026-11-02T09:00:00Z'))[0].date, '2026-11-03');
});

test('a delivery moved to Monday has the explicitly requested Sunday deadline', () => {
  const state = setup();
  state.routes[0].days = [2];
  d.rescheduleRoute(
    state,
    { routeId: 'mon', from: '2026-11-03', to: '2026-11-02' },
    new Date('2026-10-28T08:00:00Z'),
  );
  assert.equal(d.orderCutoffDate('2026-11-02', state.routes[0]), '2026-11-01');
  assert.equal(d.callSchedule(state, new Date('2026-11-01T09:00:00Z'))[0].date, '2026-11-02');
});

test('route exceptions survive PostgreSQL record serialization', () => {
  const state = setup();
  d.rescheduleRoute(
    state,
    { routeId: 'mon', from: '2026-11-02', to: '2026-11-03' },
    new Date('2026-10-28T08:00:00Z'),
  );
  const records = require('../portal/postgres/model').split(state).records;
  assert.deepEqual(JSON.parse(records.routes.get('mon').body).reschedules, [
    { from: '2026-11-02', to: '2026-11-03' },
  ]);
});

test('invalid, overlapping or expired changes leave schedules unchanged', () => {
  const state = setup();
  for (const change of [
    { routeId: 'missing', from: '2026-11-02', to: '2026-11-03' },
    { routeId: 'mon', from: '2026-11-04', to: '2026-11-05' },
    { routeId: 'mon', from: '2026-11-02', to: '2026-11-02' },
    { routeId: 'mon', from: '2026-11-02', to: '2026-10-29' },
  ])
    assert.throws(() => d.rescheduleRoute(state, change, new Date('2026-10-28T13:00:00Z')));
  assert.equal(state.routes[0].reschedules, undefined);
});

test('an additional route on the destination day does not block the move or duplicate calls', () => {
  const state = setup();
  state.routes.push({ id: 'tue', name: 'Keddi túra', days: [2] });
  state.partners[0].routeIds = ['mon', 'tue'];
  d.rescheduleRoute(
    state,
    { routeId: 'mon', from: '2026-11-02', to: '2026-11-03' },
    new Date('2026-10-28T08:00:00Z'),
  );
  const calls = d.callSchedule(state, new Date('2026-11-02T09:00:00Z'));
  assert.equal(calls[0].routes.length, 1);
  assert.equal(calls[0].routes[0].id, 'mon');
  assert.equal(calls[0].routes[0].pending.length, 1);
  assert.equal(
    d
      .deliveries(state, state.partners[0], new Date('2026-10-30T08:00:00Z'))
      .filter((d) => d.date === '2026-11-03').length,
    1,
  );
});

test('an existing destination order remains assigned to its original route if no source order exists', () => {
  const state = setup();
  state.routes.push({ id: 'tue', name: 'Keddi túra', days: [2] });
  state.partners[0].routeIds = ['mon', 'tue'];
  state.responses.push({
    id: 'existing',
    partnerId: 'p',
    routeId: 'tue',
    date: '2026-11-03',
    kind: 'order',
    items: [],
  });
  d.rescheduleRoute(
    state,
    { routeId: 'mon', from: '2026-11-02', to: '2026-11-03' },
    new Date('2026-10-28T08:00:00Z'),
  );
  assert.equal(d.routeFor(state, state.partners[0], '2026-11-03').id, 'tue');
  assert.equal(state.responses[0].routeId, 'tue');
});

test('existing orders move atomically and keep their contents, status and history', () => {
  const state = setup();
  state.responses.push({
    id: 'order-1',
    partnerId: 'p',
    routeId: 'mon',
    date: '2026-11-02',
    kind: 'order',
    items: [{ productId: 'x', name: 'Gyros', quantity: 2, unit: 'kg', unitPrice: 1500 }],
    revision: 2,
    status: 'archived',
    archivedAt: '2026-10-27T12:00:00Z',
    total: 3000,
  });
  d.rescheduleRoute(
    state,
    { routeId: 'mon', from: '2026-11-02', to: '2026-11-03' },
    new Date('2026-10-28T08:00:00Z'),
  );
  const order = state.responses[0];
  assert.equal(order.date, '2026-11-03');
  assert.equal(order.revision, 3);
  assert.equal(order.total, 3000);
  assert.equal(order.items[0].unitPrice, 1500);
  assert.equal(order.status, 'archived');
  assert.equal(order.changes.at(-1).date, '2026-11-02');
  assert.equal(order.changes.at(-1).reason, 'route-reschedule');
});

test('two existing orders on different routes remain separate and can be edited independently', () => {
  const state = setup();
  state.routes.push({ id: 'another', name: 'Másik túra', days: [2] });
  state.partners[0].routeIds = ['mon', 'another'];
  state.responses.push(
    {
      id: 'old',
      partnerId: 'p',
      routeId: 'mon',
      date: '2026-11-02',
      kind: 'order',
      items: [],
      revision: 1,
      createdAt: '2026-10-27T08:00:00Z',
    },
    {
      id: 'other',
      partnerId: 'p',
      routeId: 'another',
      date: '2026-11-03',
      kind: 'order',
      items: [],
      revision: 1,
      createdAt: '2026-10-27T09:00:00Z',
    },
  );
  const now = new Date('2026-10-28T08:00:00Z');
  d.rescheduleRoute(state, { routeId: 'mon', from: '2026-11-02', to: '2026-11-03' }, now);
  assert.deepEqual(
    state.responses.map((r) => [r.id, r.routeId, r.date]),
    [
      ['old', 'mon', '2026-11-03'],
      ['other', 'another', '2026-11-03'],
    ],
  );
  const modified = d.submitResponse(
    state,
    'p',
    {
      responseId: 'other',
      revision: 1,
      date: '2026-11-03',
      kind: 'skip',
      requestId: '00000000-0000-4000-8000-000000000001',
    },
    now,
  );
  assert.equal(modified.id, 'other');
  assert.equal(state.responses[0].kind, 'order');
  assert.equal(state.responses[1].kind, 'skip');
  assert.equal(d.safePartner(state, state.partners[0], now).history.length, 2);
  assert.equal(
    require('../portal/listing').select(state.responses, require('../portal/listing').options())
      .rows[0].sameDayOrderCount,
    2,
  );
});

test('each existing order retains its own deadline when a route is moved to Monday', () => {
  const state = setup();
  state.routes[0].days = [2];
  state.routes.push({ id: 'regular', name: 'Hétfő', days: [1] });
  state.partners[0].routeIds = ['mon', 'regular'];
  state.responses.push(
    {
      id: 'moved',
      partnerId: 'p',
      routeId: 'mon',
      date: '2026-11-03',
      kind: 'skip',
      revision: 1,
      createdAt: '2026-10-27T08:00:00Z',
    },
    {
      id: 'regular',
      partnerId: 'p',
      routeId: 'regular',
      date: '2026-11-02',
      kind: 'skip',
      revision: 1,
      createdAt: '2026-10-27T09:00:00Z',
    },
  );
  d.rescheduleRoute(
    state,
    { routeId: 'mon', from: '2026-11-03', to: '2026-11-02' },
    new Date('2026-10-28T08:00:00Z'),
  );
  const now = new Date('2026-10-31T10:00:00Z');
  const history = d.safePartner(state, state.partners[0], now).history;
  assert.equal(history.find((r) => r.id === 'moved').canEdit, true);
  assert.equal(history.find((r) => r.id === 'regular').canEdit, false);
  const input = {
    date: '2026-11-02',
    kind: 'skip',
    requestId: '00000000-0000-4000-8000-000000000002',
    revision: 1,
  };
  assert.throws(
    () => d.submitResponse(state, 'p', { ...input, responseId: 'regular' }, now),
    /határidő lejárt/,
  );
  assert.equal(
    d.submitResponse(state, 'p', { ...input, responseId: 'moved', revision: 2 }, now).id,
    'moved',
  );
});

test('shifted reminders are dispatched at both new windows', async () => {
  const state = setup();
  state.pushMode = 'live';
  state.subscriptions = [
    {
      partnerId: 'p',
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      keys: { auth: 'a'.repeat(22), p256dh: 'b'.repeat(87) },
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];
  d.rescheduleRoute(
    state,
    { routeId: 'mon', from: '2026-11-02', to: '2026-11-03' },
    new Date('2026-10-28T08:00:00Z'),
  );
  const { createStore } = require('../portal/store');
  const { dispatchNotifications } = require('../portal/notifications');
  const store = createStore(':memory:', () => state);
  await store.ready;
  const sent = [];
  try {
    for (const instant of ['2026-11-01T16:00:00Z', '2026-11-02T09:00:00Z']) {
      const now = new Date(instant);
      await store.change((s) => {
        assert.equal(d.runReminders(s, now), 1);
        s.outbox.at(-1).createdAt = now.toISOString();
      });
      await dispatchNotifications(store, {
        dryRun: false,
        subject: 'mailto:test@example.invalid',
        now: () => now,
        send: async (_subscription, payload) => sent.push(JSON.parse(payload)),
      });
    }
    assert.equal(sent.length, 2);
  } finally {
    await store.close();
  }
});

test('the reschedule endpoint requires staff and CSRF, and writes an audit entry', async () => {
  const { createPortalApp } = require('../portal/app');
  const now = new Date('2026-10-28T08:00:00Z');
  const portal = createPortalApp({
    filename: ':memory:',
    now: () => now,
    adminCredentials: { username: 'admin', password: 'Password123' },
  });
  await portal.ready;
  await portal.store.change((s) => {
    s.routes = [{ id: 'mon', name: 'Hétfő', days: [1] }];
    s.partners = [];
    s.responses = [];
  });
  const server = portal.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const post = (path, body, cookie = '', csrf = '') =>
    fetch(origin + path, {
      method: 'POST',
      headers: {
        Origin: origin,
        Cookie: cookie,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
      },
      body: JSON.stringify(body),
    });
  try {
    const change = { routeId: 'mon', from: '2026-11-02', to: '2026-11-03' };
    assert.notEqual((await post('/partner-admin/api/route-reschedule', change)).status, 200);
    const login = await post('/partner-admin/api/login', {
      username: 'admin',
      password: 'Password123',
    });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const html = await (
      await fetch(origin + '/partner-admin/', { headers: { Cookie: cookie } })
    ).text();
    const csrf = html.match(/name="csrf-token" content="([^"]+)"/)[1];
    assert.equal((await post('/partner-admin/api/route-reschedule', change, cookie)).status, 403);
    assert.equal(
      (await post('/partner-admin/api/route-reschedule', change, cookie, csrf)).status,
      200,
    );
    const state = await portal.store.read();
    assert.deepEqual(state.routes[0].reschedules, [{ from: change.from, to: change.to }]);
    assert.ok(
      state.auditLog.some(
        (e) => e.action === 'route-reschedule' && e.changes.some((c) => c.collection === 'routes'),
      ),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await portal.store.close();
  }
});
