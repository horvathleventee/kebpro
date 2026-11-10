const test = require('node:test');
const assert = require('node:assert/strict');
const {
  stagingConfig,
  stagingDatabaseConfig,
  diagnoseStagingError,
  stagingErrorDetails,
  waitForStartup,
} = require('../portal/staging');
const { createPortalApp } = require('../portal/app');
const { createStore } = require('../portal/store');
const { emptyState } = require('../portal/postgres/model');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
function request(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      res.resume();
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          headers: { get: (key) => res.headers[key]?.toString() },
        }),
      );
    });
    req.on('error', reject);
    req.end(body);
  });
}

const cfg = {
  PORTAL_STAGING_ENABLED: 'true',
  PORTAL_DATABASE_URL: 'postgresql://u:p@localhost/test_portal',
  DATABASE_URL: 'postgresql://other:p@localhost/website',
  PORTAL_PUBLIC_ORIGIN: 'https://example.invalid',
  PORTAL_TEST_USER: 'preview',
  PORTAL_TEST_PASSWORD: 'test-access-password-for-private-preview',
  PORTAL_BOOTSTRAP_USER: 'stafftest',
  PORTAL_BOOTSTRAP_PASSWORD: 'bootstrap-test-password-123',
  PORTAL_BOOTSTRAP_EMAIL: 'staff@example.invalid',
};

test('staging is opt-in and refuses unsafe or shared configuration', () => {
  assert.equal(stagingConfig({}), null);
  assert.throws(() =>
    stagingConfig({
      ...cfg,
      PORTAL_DATABASE_URL: 'postgresql://other:different@localhost/website',
    }),
  );
  assert.throws(() => stagingConfig({ ...cfg, PORTAL_PUBLIC_ORIGIN: 'http://example.invalid' }));
  assert.throws(() => stagingConfig({ ...cfg, PORTAL_TEST_PASSWORD: 'short' }));
  assert.equal(
    stagingConfig({ ...cfg, PORTAL_TEST_PASSWORD: 'test1234' }).staging.password,
    'test1234',
  );
  assert.throws(() => stagingConfig({ ...cfg, PORTAL_BOOTSTRAP_EMAIL: '' }));
  assert.throws(() => stagingConfig({ ...cfg, PORTAL_BOOTSTRAP_PASSWORD: '123456789' }));
  assert.equal(
    stagingConfig({ ...cfg, PORTAL_BOOTSTRAP_PASSWORD: '1234567890' }).adminCredentials.password,
    '1234567890',
  );
  assert.equal(stagingConfig(cfg).adminCredentials.email, 'staff@example.invalid');
  assert.equal(
    stagingDatabaseConfig({
      PORTAL_STAGING_ENABLED: 'true',
      PORTAL_DATABASE_URL: cfg.PORTAL_DATABASE_URL,
      PORTAL_PUBLIC_ORIGIN: cfg.PORTAL_PUBLIC_ORIGIN,
    }).publicOrigin,
    'https://example.invalid',
  );
});

test('diagnostics use fixed codes and never expose error text', () => {
  assert.equal(diagnoseStagingError({ code: '28P01', message: 'secret' }), 'DB_AUTH');
  assert.equal(diagnoseStagingError({ code: '42501' }), 'DB_PERMISSION');
  assert.equal(diagnoseStagingError(new Error('secret connection string')), 'UNKNOWN');
  const error = new Error('secret connection string');
  error.code = 'ECONNRESET';
  error.cause = Object.assign(new Error('password'), { code: '42501' });
  assert.deepEqual(stagingErrorDetails(error), [
    { name: 'Error', code: 'ECONNRESET' },
    { name: 'Error', code: '42501' },
  ]);
  assert.deepEqual(stagingErrorDetails({ name: 'secret', code: 'secret connection string' }), [
    { name: 'OtherError' },
  ]);
});

test('startup wait expires and also ends promptly when startup settles', async () => {
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    const start = Date.now();
    await waitForStartup(new Promise(() => {}), 30);
    assert.ok(Date.now() - start >= 20);
    let finish;
    const startup = new Promise((resolve) => {
      finish = resolve;
    });
    const waiting = waitForStartup(startup, 1000);
    finish();
    await waiting;
  } finally {
    clearTimeout(keepAlive);
  }
});

test('partner and admin requests wait for startup while the website remains available', () => {
  const source = `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const originalWrite = fs.writeFileSync;
    fs.writeFileSync = function(file, ...args) {
      if (String(file).endsWith('partner-staging-status.json')) return;
      return originalWrite.call(this, file, ...args);
    };
    const express = require('express');
    const staging = require('./portal/staging');
    let finish;
    const ready = new Promise(resolve => { finish = resolve; });
    const portal = express();
    portal.use((req, res) => res.send(req.method + ' ' + req.path));
    staging.stagingConfig = () => ({});
    staging.createStaging = () => ({ app: portal, ready });
    process.env.PORTAL_STAGING_ENABLED = 'true';
    process.env.DB_ADAPTER = 'memory';
    const website = require('./server');
    (async () => {
      await website.dbReady;
      const server = website.app.listen(0, '127.0.0.1');
      await new Promise(resolve => server.once('listening', resolve));
      try {
        const base = 'http://127.0.0.1:' + server.address().port;
        const pending = [fetch(base + '/partner/'), fetch(base + '/partner-admin/', { method: 'POST' })];
        const first = await Promise.race([Promise.all(pending).then(() => 'responded'), new Promise(resolve => setTimeout(() => resolve('waiting'), 50))]);
        assert.equal(first, 'waiting');
        assert.equal((await fetch(base + '/')).status, 200);
        finish();
        const responses = await Promise.all(pending);
        assert.deepEqual(responses.map(r => r.status), [200, 200]);
        assert.equal(await responses[1].text(), 'POST /partner-admin/');
      } finally { server.close(); }
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ['-e', source], {
    cwd: require('node:path').join(__dirname, '..'),
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr);
});

test('a failed startup still reports a sanitized error without waiting for the deadline', () => {
  const source = `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const originalWrite = fs.writeFileSync;
    fs.writeFileSync = function(file, ...args) {
      if (String(file).endsWith('partner-staging-status.json')) return;
      return originalWrite.call(this, file, ...args);
    };
    const staging = require('./portal/staging');
    let fail;
    const ready = new Promise((resolve, reject) => { fail = reject; });
    staging.stagingConfig = () => ({});
    staging.createStaging = () => ({ app: require('express')(), ready });
    process.env.PORTAL_STAGING_ENABLED = 'true';
    process.env.DB_ADAPTER = 'memory';
    const website = require('./server');
    (async () => {
      await website.dbReady;
      const server = website.app.listen(0, '127.0.0.1');
      await new Promise(resolve => server.once('listening', resolve));
      try {
        const response = fetch('http://127.0.0.1:' + server.address().port + '/partner-admin/');
        setTimeout(() => fail(Object.assign(new Error('private database password'), { code: 'ECONNREFUSED' })), 30);
        const r = await response;
        assert.equal(r.status, 503);
        assert.equal(r.headers.get('x-kebpro-diagnostic'), null);
        assert.equal(await r.text(), 'Partner tesztkörnyezet átmenetileg nem érhető el.');
      } finally { server.close(); }
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ['-e', source], {
    cwd: require('node:path').join(__dirname, '..'),
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr);
});

test('loading the PostgreSQL portal does not load the native SQLite addon', () => {
  const source = `const Module=require('node:module');const original=Module._load;Module._load=function(name,...args){if(name==='sqlite3')throw Error('SQLite must not load');return original.call(this,name,...args)};require('./portal/staging');require('./portal/app');require('./portal/postgres/store');`;
  const result = spawnSync(process.execPath, ['-e', source], {
    cwd: require('node:path').join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('private HTTPS staging requires Basic auth, origin and secure session', async () => {
  const config = stagingConfig(cfg),
    storage = createStore(':memory:', emptyState);
  const portal = createPortalApp({ ...config, storage, sendEmail: async () => {} });
  await portal.ready;
  const server = portal.app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  const headers = {
    host: 'example.invalid',
    'x-forwarded-proto': 'https',
    authorization:
      'Basic ' +
      Buffer.from(config.staging.username + ':' + config.staging.password).toString('base64'),
  };
  try {
    let r = await request(url + '/partner/login', {
      headers: { host: 'example.invalid', 'x-forwarded-proto': 'https' },
    });
    assert.equal(r.status, 401);
    for (const appPath of [
      '/partner/apple-touch-icon.png?v=3',
      '/partner-admin/apple-touch-icon.png?v=3',
    ]) {
      r = await request(url + appPath, {
        headers: { host: 'example.invalid', 'x-forwarded-proto': 'https' },
      });
      assert.equal(r.status, 200);
      assert.match(r.headers.get('content-type'), /^image\/png/);
    }
    r = await request(url + '/partner/assets/portal.js', {
      headers: { host: 'example.invalid', 'x-forwarded-proto': 'https' },
    });
    assert.equal(r.status, 401);
    r = await request(url + '/partner/login', {
      headers: { ...headers, 'x-forwarded-proto': 'http' },
    });
    assert.equal(r.status, 403);
    r = await request(url + '/partner/login', { headers: { ...headers, host: 'wrong.invalid' } });
    assert.equal(r.status, 403);
    r = await request(url + '/partner-admin/api/login', {
      method: 'POST',
      headers: { ...headers, origin: 'https://evil.invalid', 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'stafftest', password: 'bootstrap-test-password-123' }),
    });
    assert.equal(r.status, 403);
    r = await request(url + '/partner-admin/api/login', {
      method: 'POST',
      headers: {
        ...headers,
        origin: 'https://example.invalid',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username: 'stafftest', password: 'bootstrap-test-password-123' }),
    });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('set-cookie'), /HttpOnly.*Secure.*SameSite=Strict/i);
    const state = await storage.read();
    assert.equal(state.users[0].email, 'staff@example.invalid');
  } finally {
    await new Promise((r) => server.close(r));
    await storage.close();
  }
});

test('explicitly disabling only the test gate preserves HTTPS, account authentication and CSRF', async () => {
  const config = stagingConfig({
    ...cfg,
    PORTAL_TEST_GATE: 'disabled',
    PORTAL_TEST_USER: '',
    PORTAL_TEST_PASSWORD: '',
  });
  const storage = createStore(':memory:', emptyState),
    portal = createPortalApp({ ...config, storage, sendEmail: async () => {} });
  await portal.ready;
  const server = portal.app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const url = 'http://127.0.0.1:' + server.address().port,
    headers = { host: 'example.invalid', 'x-forwarded-proto': 'https' };
  try {
    assert.equal((await request(url + '/partner/login', { headers })).status, 200);
    assert.equal((await request(url + '/partner-admin/login', { headers })).status, 200);
    assert.equal((await request(url + '/partner/api/me', { headers })).status, 401);
    assert.equal((await request(url + '/partner-admin/api/admin', { headers })).status, 401);
    assert.equal(
      (
        await request(url + '/partner/login', {
          headers: { ...headers, 'x-forwarded-proto': 'http' },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request(url + '/partner-admin/api/login', {
          method: 'POST',
          headers: {
            ...headers,
            origin: 'https://evil.invalid',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ username: 'stafftest', password: 'bootstrap-test-password-123' }),
        })
      ).status,
      403,
    );
  } finally {
    await new Promise((r) => server.close(r));
    await storage.close();
  }
});

test('website routes and isolated portal coexist without mounting path changes', async () => {
  const config = stagingConfig(cfg),
    storage = createStore(':memory:', emptyState);
  const portal = createPortalApp({ ...config, storage, sendEmail: async () => {} });
  await portal.ready;
  const staging = require('../portal/staging'),
    original = staging.createStaging,
    originalConfig = staging.stagingConfig;
  const previous = {
    PORTAL_STAGING_ENABLED: process.env.PORTAL_STAGING_ENABLED,
    DB_ADAPTER: process.env.DB_ADAPTER,
  };
  staging.createStaging = () => portal;
  staging.stagingConfig = () => config;
  process.env.PORTAL_STAGING_ENABLED = 'true';
  process.env.DB_ADAPTER = 'memory';
  let server;
  try {
    const website = require('../server');
    await website.dbReady;
    server = website.app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    await new Promise((r) => setImmediate(r));
    const url = 'http://127.0.0.1:' + server.address().port;
    const headers = {
      host: 'example.invalid',
      'x-forwarded-proto': 'https',
      authorization:
        'Basic ' +
        Buffer.from(config.staging.username + ':' + config.staging.password).toString('base64'),
    };
    assert.equal((await request(url + '/', { headers })).status, 200);
    assert.equal((await request(url + '/partner/login', { headers })).status, 200);
    assert.equal((await request(url + '/partner/assets/portal.css', { headers })).status, 200);
    assert.equal((await request(url + '/partner-admin/login', { headers })).status, 200);
  } finally {
    if (server) await new Promise((r) => server.close(r));
    await storage.close();
    staging.createStaging = original;
    staging.stagingConfig = originalConfig;
    for (const [key, value] of Object.entries(previous))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});
