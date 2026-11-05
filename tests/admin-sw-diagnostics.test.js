const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('Admin navigation shows the HTTP status and safe diagnostic on a server error', async () => {
  const listeners = {};
  let network = new Response('secret body', {
    status: 503,
    headers: { 'X-Kebpro-Diagnostic': 'PORTAL_STARTING' },
  });
  const sandbox = {
    self: {
      addEventListener: (name, listener) => {
        listeners[name] = listener;
      },
    },
    caches: { match: async () => new Response('<main>Fallback</main>') },
    fetch: async () => network,
    Response,
    URL,
    Date,
  };
  vm.runInNewContext(fs.readFileSync('portal/public/admin-sw.js', 'utf8'), sandbox);
  async function navigate() {
    let result;
    listeners.fetch({
      request: { url: 'https://example.invalid/partner-admin/', mode: 'navigate' },
      respondWith: (promise) => {
        result = promise;
      },
    });
    return result;
  }
  let result = await navigate();
  assert.equal(result.status, 503);
  let body = await result.text();
  assert.match(body, /HTTP: 503/);
  assert.match(body, /PORTAL_STARTING/);
  assert.doesNotMatch(body, /secret body/);
  network = new Response('private', {
    status: 502,
    headers: { 'X-Kebpro-Diagnostic': '<unsafe>' },
  });
  result = await navigate();
  body = await result.text();
  assert.match(body, /HTTP: 502/);
  assert.match(body, /NEM_ADTA_MEG_A_KISZOLGALO/);
  assert.doesNotMatch(body, /<unsafe>|private/);
});
