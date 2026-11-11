const test = require('node:test');
const assert = require('node:assert/strict');
const d = require('../portal/domain');
const now = new Date('2026-11-11T08:00:00Z');
const input = {
  name: 'Új túra',
  days: [1, 3],
  reminder: '10:00',
  cutoff: '14:00',
  trackingRadiusKm: 50,
};

test('new routes can be assigned to partners and vehicles on selected days', () => {
  const state = d.seed();
  const route = d.updateRoute(state, input, now);
  d.updatePartner(state, { id: state.partners[0].id, routeIds: [route.id] });
  assert.equal(d.routeFor(state, state.partners[0], '2026-11-16').id, route.id);
  assert.equal(d.routeFor(state, state.partners[0], '2026-11-17'), undefined);
  assert.equal(d.routeFor(state, state.partners[0], '2026-11-18').id, route.id);
  state.trackingVehicles = [{ id: 'v', deviceId: '123' }];
  require('../portal/tracking').assign(state, {
    routeId: route.id,
    date: '2026-11-18',
    vehicleId: 'v',
  });
  assert.equal(state.trackingAssignments[0].routeId, route.id);
  assert.equal(route.trackingRadiusKm, 50);
});

test('route limit counts active routes, and deleted history remains intact', () => {
  const state = d.seed();
  while (state.routes.filter((r) => !r.archivedAt).length < 20) d.updateRoute(state, input, now);
  assert.throws(() => d.updateRoute(state, input, now), /20 túra/);
  const last = state.routes.at(-1);
  state.responses.push({
    id: 'historic',
    partnerId: state.partners[0].id,
    routeId: last.id,
    date: '2026-11-01',
    kind: 'order',
    items: [],
  });
  d.deleteRoute(state, { id: last.id }, now);
  assert.ok(last.archivedAt);
  assert.equal(state.responses.at(-1).routeId, last.id);
  assert.equal(
    d.adminView(state, '2026-11-16').routes.some((r) => r.id === last.id),
    false,
  );
  assert.equal(require('../portal/postgres/model').split(state).records.routes.has(last.id), true);
  assert.ok(d.updateRoute(state, input, now).id);
});

test('editing and removal protect assigned partners, upcoming orders and vehicle schedules', () => {
  const state = d.seed();
  const route = d.updateRoute(state, input, now);
  state.partners[0].routeIds = [route.id];
  assert.throws(() => d.deleteRoute(state, { id: route.id }, now), /partnerek/);
  state.partners[0].routeIds = [state.routes[0].id];
  state.responses.push({ id: 'future', routeId: route.id, date: '2026-11-16', kind: 'order' });
  assert.throws(
    () => d.updateRoute(state, { ...input, id: route.id, days: [3] }, now),
    /rendelést/,
  );
  assert.throws(() => d.deleteRoute(state, { id: route.id }, now), /rendelés/);
  state.responses.pop();
  state.trackingAssignments = [{ routeId: route.id, date: '2026-11-16', vehicleId: 'v' }];
  assert.throws(
    () => d.updateRoute(state, { ...input, id: route.id, days: [3] }, now),
    /járműbeosztást/,
  );
  assert.throws(() => d.deleteRoute(state, { id: route.id }, now), /járműbeosztás/);
  state.trackingAssignments = [];
  d.updateRoute(state, { ...input, id: route.id, days: [2, 4] }, now);
  assert.deepEqual(route.days, [2, 4]);
  d.deleteRoute(state, { id: route.id }, now);
  assert.throws(() => d.updatePartner(state, { id: state.partners[0].id, routeIds: [route.id] }));
});

test('daily route migration does not undo changes after restart', () => {
  const state = d.seed();
  require('../portal/migrations').migrateDailyRoutes(state, now);
  const route = state.routes[0];
  d.updateRoute(state, { ...input, id: route.id, days: [2, 4] }, now);
  require('../portal/migrations').migrateDailyRoutes(state, now);
  assert.deepEqual(state.routes.find((r) => r.id === route.id).days, [2, 4]);
});

test('registration approval rejects multiple routes on the same weekday', () => {
  const state = d.seed();
  while (state.routes.length < 10) d.updateRoute(state, input, now);
  state.users = [
    { id: 'u', role: 'partner', status: 'pending', company: 'Teszt', address: 'Teszt cím' },
  ];
  const overlapping = state.routes
    .filter((r) => r.days.includes(1))
    .slice(0, 2)
    .map((r) => r.id);
  assert.throws(
    () =>
      require('../portal/auth').review(
        state,
        { id: 'u', status: 'approved', routeIds: overlapping },
        now,
      ),
    /ugyanarra a napra/,
  );
  assert.equal(state.users[0].status, 'pending');
});

test('different partners may be assigned to different routes on the same weekday', () => {
  const state = d.seed();
  const first = d.updateRoute(state, { ...input, name: 'A túra', days: [1] }, now);
  const second = d.updateRoute(state, { ...input, name: 'B túra', days: [1] }, now);
  d.updatePartner(state, { id: state.partners[0].id, routeIds: [first.id] }, now);
  d.updatePartner(state, { id: state.partners[1].id, routeIds: [second.id] }, now);
  assert.throws(
    () =>
      d.updatePartner(state, { id: state.partners[0].id, routeIds: [first.id, second.id] }, now),
    /ugyanarra a napra/,
  );
  assert.deepEqual(state.partners[0].routeIds, [first.id]);
});

test('editing a route cannot create an overlap for one of its partners', () => {
  const state = d.seed();
  const first = d.updateRoute(state, { ...input, name: 'A', days: [1] }, now);
  const second = d.updateRoute(state, { ...input, name: 'B', days: [2] }, now);
  d.updatePartner(state, { id: state.partners[0].id, routeIds: [first.id, second.id] }, now);
  assert.throws(
    () => d.updateRoute(state, { ...input, id: second.id, days: [1] }, now),
    /ugyanarra a napra/,
  );
  assert.deepEqual(second.days, [2]);
});

test('partner assignment also checks future one-off route moves', () => {
  const state = d.seed();
  const first = d.updateRoute(state, { ...input, name: 'A', days: [1] }, now);
  const second = d.updateRoute(state, { ...input, name: 'B', days: [2] }, now);
  first.reschedules = [{ from: '2026-11-16', to: '2026-11-17' }];
  assert.throws(
    () =>
      d.updatePartner(state, { id: state.partners[0].id, routeIds: [first.id, second.id] }, now),
    /ugyanarra a napra/,
  );
  first.reschedules = [{ from: '2026-11-02', to: '2026-11-03' }];
  d.updatePartner(state, { id: state.partners[0].id, routeIds: [first.id, second.id] }, now);
  assert.deepEqual(state.partners[0].routeIds, [first.id, second.id]);
});

test('staff can create, edit, assign and remove a route through protected API', async () => {
  const { createPortalApp } = require('../portal/app');
  const portal = createPortalApp({
    filename: ':memory:',
    now: () => now,
    adminCredentials: { username: 'admin', password: 'Password123' },
  });
  await portal.ready;
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
    assert.notEqual((await post('/partner-admin/api/routes', input)).status, 200);
    const login = await post('/partner-admin/api/login', {
      username: 'admin',
      password: 'Password123',
    });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const html = await (
      await fetch(origin + '/partner-admin/', { headers: { Cookie: cookie } })
    ).text();
    const csrf = html.match(/name="csrf-token" content="([^"]+)"/)[1];
    assert.equal((await post('/partner-admin/api/routes', input, cookie)).status, 403);
    assert.equal((await post('/partner-admin/api/routes', input, cookie, csrf)).status, 200);
    const state = await portal.store.read();
    const route = state.routes.find((r) => r.name === input.name);
    assert.ok(route);
    const view = await (
      await fetch(origin + '/partner-admin/api/admin', { headers: { Cookie: cookie } })
    ).json();
    assert.ok(view.routes.find((r) => r.id === route.id));
    assert.equal(
      (
        await post(
          '/partner-admin/api/partners',
          { id: state.partners[0].id, routeIds: [route.id] },
          cookie,
          csrf,
        )
      ).status,
      200,
    );
    assert.equal(
      (await post('/partner-admin/api/routes/delete', { id: route.id }, cookie, csrf)).status,
      409,
    );
    assert.equal(
      (
        await post(
          '/partner-admin/api/partners',
          { id: state.partners[0].id, routeIds: [state.routes[0].id] },
          cookie,
          csrf,
        )
      ).status,
      200,
    );
    assert.equal(
      (await post('/partner-admin/api/routes', { ...input, id: route.id, days: [2] }, cookie, csrf))
        .status,
      200,
    );
    assert.equal(
      (await post('/partner-admin/api/routes/delete', { id: route.id }, cookie, csrf)).status,
      200,
    );
    const after = await portal.store.read();
    assert.ok(after.routes.find((r) => r.id === route.id).archivedAt);
    assert.ok(
      after.auditLog.some(
        (entry) =>
          entry.action === 'delete' && entry.changes.some((c) => c.collection === 'routes'),
      ),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await portal.store.close();
  }
});
