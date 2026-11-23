const { test } = require('node:test');
const assert = require('node:assert/strict');
const { snapshot } = require('../portal/developer-monitor');

test('monitor projects recent activity without push secrets and reports unknown timestamps', () => {
  const result = snapshot(
    {
      operations: {},
      partners: [{ id: 'p', name: 'Partner' }],
      outbox: [
        {
          id: 'n',
          partnerId: 'p',
          createdAt: '2026-11-22T00:00:00Z',
          category: 'news',
          status: 'complete',
          body: 'private body',
          deliveries: { abcdef123456789: { status: 'sent', attempts: 1 } },
        },
      ],
      subscriptions: [{ endpoint: 'secret endpoint' }],
      vapid: { privateKey: 'secret key' },
    },
    new Date('2026-11-23T00:00:00Z'),
  );
  assert.equal(result.worker, 'unknown');
  assert.equal(result.backup, 'unknown');
  assert.equal(result.messages[0].partner, 'Partner');
  assert.equal(result.messages[0].deliveries[0].device, 'abcdef123456');
  assert.doesNotMatch(JSON.stringify(result), /secret|private body/);
});

test('monitor uses warning thresholds and excludes old messages', () => {
  const result = snapshot(
    {
      operations: { lastTick: '2026-11-22T23:56:00Z', backupAt: '2026-11-21T21:00:00Z' },
      outbox: [{ createdAt: '2026-10-01T00:00:00Z' }],
    },
    new Date('2026-11-23T00:00:00Z'),
  );
  assert.equal(result.worker, 'warning');
  assert.equal(result.backup, 'warning');
  assert.deepEqual(result.messages, []);
});

test('monitor requires a session belonging to the configured developer', async () => {
  const { createPortalApp } = require('../portal/app');
  const { app, store, ready } = createPortalApp({
    filename: ':memory:',
    developerUserId: 'developer-id',
    adminCredentials: { username: 'admin', password: 'test-admin-password' },
  });
  await ready;
  await store.change((state) => {
    state.users[0].id = 'developer-id';
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.on('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const url = base + '/partner-admin/api/developer-monitor';
    assert.equal((await fetch(url)).status, 401);
    const login = await fetch(base + '/partner-admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ username: 'admin', password: 'test-admin-password' }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(url, { headers: { Cookie: cookie } })).status, 200);
    await store.change((state) => {
      state.users[0].id = 'different-id';
      state.sessions[0].userId = 'different-id';
    });
    assert.equal((await fetch(url, { headers: { Cookie: cookie } })).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await store.close();
  }
});

test('developer username grants access only to the configured approved staff account', async () => {
  const { createPortalApp } = require('../portal/app');
  const { app, store, ready } = createPortalApp({
    filename: ':memory:',
    developerUsername: 'ADMIN',
    adminCredentials: { username: 'admin', password: 'test-admin-password' },
  });
  await ready;
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.on('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = await fetch(base + '/partner-admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ username: 'admin', password: 'test-admin-password' }),
    });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const get = () =>
      fetch(base + '/partner-admin/api/developer-monitor', { headers: { Cookie: cookie } });
    assert.equal((await get()).status, 200);
    await store.change((state) => {
      state.users[0].username = 'someone-else';
    });
    assert.equal((await get()).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await store.close();
  }
});
