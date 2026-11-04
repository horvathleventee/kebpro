'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSessionController } = require('../portal/client/session-controller.cjs');
const {
  createPushController,
  logoutWithPushCleanup,
} = require('../portal/client/push-controller.cjs');
const { currentTab } = require('../portal/client/navigation.cjs');

function storage() {
  const values = new Map();
  return { getItem: (k) => values.get(k) || null, setItem: (k, v) => values.set(k, v) };
}
test('navigation rejects unknown or other-role screens', () => {
  assert.equal(currentTab('partner', { hash: '#calls' }), 'home');
  assert.equal(currentTab('staff', { hash: '#reports' }), 'dashboard');
  assert.equal(currentTab('partner', { hash: '#reports' }), 'reports');
});
test('session offer is deduplicated and renewal updates the current session', async () => {
  const appState = {
    state: { data: { id: 'p1', loginSession: { canExtend: true, expiresAt: 'old' } } },
  };
  let dialog,
    requests = 0,
    renders = 0;
  const c = createSessionController({
    role: 'partner',
    appState,
    screens: { openSessionRenewal: (d) => (dialog = d) },
    api: async (path, body) => {
      requests++;
      assert.equal(path, 'extend-session');
      assert.equal(body.expiresAt, 'old');
      return { loginSession: { expiresAt: 'new' } };
    },
    render: () => renders++,
    toast: () => {},
    operationTime: (v) => v,
    document: { querySelector: () => null },
    localStorage: storage(),
  });
  c.offerSessionRenewal();
  const first = dialog;
  c.offerSessionRenewal();
  assert.equal(dialog, first);
  await dialog.onRenew();
  assert.equal(requests, 1);
  assert.equal(renders, 1);
  assert.equal(appState.state.data.loginSession.expiresAt, 'new');
});
test('postponing session reminder persists and prevents a repeated offer', () => {
  const appState = {
      state: { data: { id: 'p1', loginSession: { canExtend: true, expiresAt: 'old' } } },
    },
    localStorage = storage();
  let count = 0,
    dialog;
  const context = {
    role: 'partner',
    appState,
    screens: {
      openSessionRenewal: (d) => {
        dialog = d;
        count++;
      },
    },
    api: () => {},
    render: () => {},
    toast: () => {},
    operationTime: (v) => v,
    document: { querySelector: () => null },
    localStorage,
  };
  createSessionController(context).offerSessionRenewal();
  dialog.onLater();
  createSessionController(context).offerSessionRenewal();
  assert.equal(count, 1);
});
test('partner push enables news and reuses an existing subscription', async () => {
  let permissionRequests = 0,
    subscribeCalls = 0,
    posted,
    loads = 0;
  const subscription = { toJSON: () => ({ endpoint: 'https://example.test/push' }) };
  const win = {
    atob,
    PushManager: {},
    Notification: {
      permission: 'default',
      requestPermission: () => {
        permissionRequests++;
        return Promise.resolve('granted');
      },
    },
  };
  const c = createPushController({
    role: 'partner',
    appState: { state: { data: { id: 'p', publicKey: 'YQ' } } },
    screens: {},
    api: async (path, body) => {
      posted = { path, body };
      return { mode: 'live' };
    },
    load: async () => loads++,
    toast: () => {},
    window: win,
    document: { querySelector: () => null },
    navigator: {
      serviceWorker: {
        register: async () => ({}),
        ready: Promise.resolve({
          pushManager: {
            getSubscription: async () => subscription,
            subscribe: async () => subscribeCalls++,
          },
        }),
      },
    },
    localStorage: storage(),
  });
  const result = c.enablePartnerPush();
  assert.equal(permissionRequests, 1);
  await result;
  assert.equal(subscribeCalls, 0);
  assert.equal(posted.path, 'subscription');
  assert.equal(posted.body.enableNews, true);
  assert.equal(loads, 1);
});
test('failed worker registration reports an error instead of waiting for ready', async () => {
  const c = createPushController({
    role: 'partner',
    appState: { state: { data: { id: 'p', publicKey: 'YQ' } } },
    screens: {},
    api: async () => {},
    load: async () => {},
    toast: () => {},
    window: { atob, PushManager: {}, Notification: { requestPermission: async () => 'granted' } },
    document: { querySelector: () => null },
    navigator: {
      serviceWorker: {
        register: async () => {
          throw Error('failed');
        },
        ready: new Promise(() => {}),
      },
    },
    localStorage: storage(),
  });
  await assert.rejects(c.enablePartnerPush(), /nem indult el/);
});
test('staff push registers the admin worker and reports activation timeout', async () => {
  let scope;
  const c = createPushController({
    role: 'staff',
    appState: { state: { data: { id: 's', publicKey: 'YQ' } } },
    screens: {},
    api: async () => {},
    load: async () => {},
    toast: () => {},
    window: { atob, PushManager: {}, Notification: {} },
    document: { querySelector: () => null },
    navigator: {
      serviceWorker: {
        register: async (url, options) => {
          scope = [url, options.scope];
        },
        ready: new Promise(() => {}),
      },
    },
    localStorage: storage(),
  });
  await assert.rejects(c.registration(), /nem indult el/);
  assert.deepEqual(scope, ['/partner-admin/sw.js', '/partner-admin/']);
});
test('logout preserves push on failed server request and cleans it up after success', async () => {
  const events = [];
  const subscription = {
    endpoint: 'endpoint',
    unsubscribe: async () => {
      events.push('unsubscribe');
    },
  };
  const sw = {
    getRegistration: async () => ({ pushManager: { getSubscription: async () => subscription } }),
  };
  await assert.rejects(
    logoutWithPushCleanup(sw, '/partner', async () => {
      throw Error('offline');
    }),
    /offline/,
  );
  assert.deepEqual(events, []);
  await logoutWithPushCleanup(sw, '/partner', async (body) => {
    assert.equal(body.endpoint, 'endpoint');
    events.push('logout');
  });
  assert.deepEqual(events, ['logout', 'unsubscribe']);
});
test('logout succeeds when browser push cleanup fails', async () => {
  const sw = {
    getRegistration: async () => ({
      pushManager: {
        getSubscription: async () => ({
          endpoint: 'e',
          unsubscribe: async () => {
            throw Error('failed');
          },
        }),
      },
    }),
  };
  let sent;
  await logoutWithPushCleanup(sw, '/partner', async (body) => {
    sent = body;
  });
  assert.equal(sent.endpoint, 'e');
});
test('denied push permission never creates a subscription', async () => {
  let posted = false;
  const win = { atob, PushManager: {}, Notification: { requestPermission: async () => 'denied' } };
  const c = createPushController({
    role: 'partner',
    appState: { state: { data: { id: 'p' } } },
    screens: {},
    api: async () => {
      posted = true;
    },
    load: async () => {},
    toast: () => {},
    window: win,
    document: { querySelector: () => null },
    navigator: { serviceWorker: {} },
    localStorage: storage(),
  });
  await assert.rejects(c.enablePartnerPush(), /nem engedélyezted/);
  assert.equal(posted, false);
});
test('push introduction is remembered for the same partner and skips staff', () => {
  const localStorage = storage();
  let count = 0,
    dialog;
  const ctx = {
    role: 'partner',
    appState: { state: { data: { id: 'p' } } },
    screens: {
      openPushWelcome: (d) => {
        count++;
        dialog = d;
      },
    },
    api: async () => {},
    load: async () => {},
    toast: () => {},
    window: { atob },
    document: { querySelector: () => null },
    navigator: {},
    localStorage,
  };
  createPushController(ctx).offerPushSetup();
  assert.equal(count, 1);
  dialog.onLater();
  createPushController(ctx).offerPushSetup();
  assert.equal(count, 1);
  createPushController({ ...ctx, role: 'staff' }).offerPushSetup();
  assert.equal(count, 1);
});
