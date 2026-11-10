const test = require('node:test');
const assert = require('node:assert/strict');
const { createPortalApp } = require('../portal/app');
const auth = require('../portal/auth');

test('fleet endpoint requires staff and whitelists fields and local labels', async () => {
  let calls = 0;
  const provider = {
    fleet: async () => {
      calls++;
      return [
        {
          deviceId: '123',
          latitude: 47,
          longitude: 19,
          timestamp: '2026-11-10T12:00:00Z',
          licensePlate: 'ABC-123',
          speed: 100,
        },
        {
          deviceId: '999',
          latitude: 48,
          longitude: 20,
          timestamp: '2026-11-10T12:00:00Z',
          driver: 'private',
        },
      ];
    },
  };
  const portal = createPortalApp({
    filename: ':memory:',
    adminCredentials: { username: 'admin', password: 'Password123' },
    trackingProvider: provider,
  });
  await portal.ready;
  const digest = await auth.passwordHash('Password123');
  await portal.store.change((s) => {
    s.users.push({
      id: 'partner-user',
      role: 'partner',
      status: 'approved',
      partnerId: s.partners[0].id,
      username: 'partner',
      passwordHash: digest,
    });
    s.trackingVehicles = [{ id: 'v', label: 'Kék autó', deviceId: '123' }];
  });
  const server = portal.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const login = (role, username) =>
    fetch(origin + '/' + role + '/api/login', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'Password123' }),
    });
  try {
    assert.equal((await fetch(origin + '/partner-admin/api/tracking-fleet')).status, 401);
    const partner = await login('partner', 'partner');
    const cookie = partner.headers
      .get('set-cookie')
      .split(';')[0]
      .replace('kbp_portal=', 'kbp_admin=');
    assert.equal(
      (await fetch(origin + '/partner-admin/api/tracking-fleet', { headers: { Cookie: cookie } }))
        .status,
      401,
    );
    assert.equal(calls, 0);
    const admin = await login('partner-admin', 'admin');
    const adminCookie = admin.headers.get('set-cookie').split(';')[0];
    const response = await fetch(origin + '/partner-admin/api/tracking-fleet', {
      headers: { Cookie: adminCookie },
    });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.deepEqual(
      body.vehicles.map((v) => v.label),
      ['ABC-123', 'Eszköz 999'],
    );
    assert.equal(JSON.stringify(body).includes('speed'), false);
    assert.equal(JSON.stringify(body).includes('driver'), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await portal.store.close();
  }
});
