const test = require('node:test');
const assert = require('node:assert/strict');
const { createPortalApp } = require('../portal/app');
const auth = require('../portal/auth');

test('partner proposes an address, staff verifies and assigns a fleet car, partner sees only nearby car', async () => {
  const clock = new Date('2026-11-10T12:00:00Z');
  let carLatitude = 47;
  let deviceListUnavailable = false;
  const provider = {
    devices: async () => {
      if (deviceListUnavailable) throw Error('unavailable');
      return [
        { deviceId: '123', licensePlate: 'ABC-123' },
        { deviceId: '456', licensePlate: 'DEF-456' },
      ];
    },
    fleet: async () => [
      {
        deviceId: '123',
        licensePlate: 'ABC-123',
        latitude: carLatitude,
        longitude: 19,
        timestamp: clock.toISOString(),
      },
    ],
    position: async (id) => {
      assert.equal(id, '123');
      return { latitude: carLatitude, longitude: 19, timestamp: clock.toISOString() };
    },
    plate: async () => 'ABC-123',
  };
  const portal = createPortalApp({
    filename: ':memory:',
    adminCredentials: { username: 'admin', password: 'Password123' },
    trackingProvider: provider,
    now: () => clock,
  });
  await portal.ready;
  const digest = await auth.passwordHash('Password123');
  let partnerId, routeId;
  await portal.store.change((s) => {
    partnerId = s.partners[0].id;
    routeId = s.routes.find((r) => r.days.includes(2)).id;
    s.partners[0].address = 'Teszt cím';
    s.users.push({
      id: 'u',
      username: 'partner',
      passwordHash: digest,
      role: 'partner',
      status: 'approved',
      partnerId,
    });
    s.responses.push({
      id: 'order',
      partnerId,
      routeId,
      date: '2026-11-10',
      kind: 'order',
      address: 'Teszt cím',
      items: [],
      status: 'received',
      createdAt: clock.toISOString(),
    });
  });
  const server = portal.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const login = async (area, username) => {
    const r = await fetch(origin + '/' + area + '/api/login', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'Password123' }),
    });
    const cookie = r.headers.get('set-cookie').split(';')[0];
    const html = await (
      await fetch(origin + '/' + area + '/', { headers: { Cookie: cookie } })
    ).text();
    return { cookie, csrf: html.match(/name="csrf-token" content="([^"]+)"/)[1] };
  };
  const get = (path, auth) => fetch(origin + path, { headers: { Cookie: auth.cookie } });
  const post = (path, body, auth) =>
    fetch(origin + path, {
      method: 'POST',
      headers: {
        Origin: origin,
        Cookie: auth.cookie,
        'Content-Type': 'application/json',
        'X-CSRF-Token': auth.csrf,
      },
      body: JSON.stringify(body),
    });
  try {
    const partner = await login('partner', 'partner'),
      admin = await login('partner-admin', 'admin');
    assert.equal(
      (
        await post(
          '/partner/api/tracking-address',
          { address: 'Teszt cím', latitude: 47, longitude: 19, partnerId: 'someone-else' },
          partner,
        )
      ).status,
      200,
    );
    assert.equal(
      (await (await get('/partner/api/tracking-address', partner)).json()).pending,
      true,
    );
    const safe = await (await get('/partner/api/me', partner)).json();
    assert.equal(JSON.stringify(safe).includes('trackingAddressSuggestion'), false);
    let state = await portal.store.read();
    assert.equal(
      state.partners.find((p) => p.id === partnerId).trackingAddressSuggestion.address,
      'Teszt cím',
    );
    assert.equal((await get('/partner/api/tracking', partner)).status, 200);
    assert.deepEqual(await (await get('/partner/api/tracking', partner)).json(), {
      status: 'unavailable',
    });
    const adminData = await (await get('/partner-admin/api/tracking', admin)).json();
    const proposal = adminData.partners.find((p) => p.id === partnerId).suggestion;
    const approval = {
      partnerId,
      address: 'Teszt cím',
      latitude: proposal.latitude,
      longitude: proposal.longitude,
      suggestionId: proposal.id,
    };
    assert.equal(
      (await post('/partner-admin/api/tracking/partner-address', approval, partner)).status,
      403,
    );
    assert.equal(
      (await post('/partner-admin/api/tracking/partner-address', approval, admin)).status,
      200,
    );
    const verifiedData = await (await get('/partner-admin/api/tracking', admin)).json();
    assert.deepEqual(verifiedData.partners.find((p) => p.id === partnerId).verifiedPoint, { latitude: 47, longitude: 19 });
    assert.deepEqual(verifiedData.orders.find((o) => o.id === 'order').verifiedPoint, { latitude: 47, longitude: 19 });
    const partnerStatus = await (await get('/partner/api/tracking-address', partner)).json();
    assert.equal(partnerStatus.verified, true);
    assert.equal('verifiedPoint' in partnerStatus, false);
    const devices = await (await get('/partner-admin/api/tracking-devices', admin)).json();
    assert.equal(devices.devices.length, 2);
    assert.equal(
      (
        await post(
          '/partner-admin/api/tracking/assign-device',
          { date: '2026-11-10', routeId, deviceId: 'unknown' },
          admin,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await post(
          '/partner-admin/api/tracking/assign-device',
          { date: '2026-11-10', routeId, deviceId: '456' },
          admin,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await post(
          '/partner-admin/api/tracking/assign-device',
          { date: '2026-11-10', routeId, deviceId: '123' },
          admin,
        )
      ).status,
      200,
    );
    deviceListUnavailable = true;
    assert.equal(
      (
        await post(
          '/partner-admin/api/tracking/assign-device',
          { date: '2026-11-10', routeId, deviceId: '123' },
          admin,
        )
      ).status,
      200,
    );
    deviceListUnavailable = false;
    const near = await (await get('/partner/api/tracking?deviceId=other', partner)).json();
    assert.equal(near.status, 'available');
    assert.equal(near.licensePlate, 'ABC-123');
    carLatitude = 48;
    assert.deepEqual(await (await get('/partner/api/tracking', partner)).json(), {
      status: 'waiting',
    });
    assert.equal(
      (
        await post(
          '/partner-admin/api/tracking/delivery-address',
          { partnerId, expectedAddress: 'Teszt cím', address: 'Új cím' },
          admin,
        )
      ).status,
      200,
    );
    const addressStatus = await (await get('/partner/api/tracking-address', partner)).json();
    assert.equal(addressStatus.address, 'Új cím');
    assert.equal(addressStatus.verified, false);
    state = await portal.store.read();
    assert.equal(state.trackingAssignments.length, 1);
    assert.equal(state.responses.find((o) => o.id === 'order').address, 'Teszt cím');
    assert.equal(
      state.partners.find((p) => p.id === partnerId).trackingAddressSuggestion,
      undefined,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await portal.store.close();
  }
});
