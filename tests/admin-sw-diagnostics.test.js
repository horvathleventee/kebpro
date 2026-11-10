const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('Admin navigation uses the original fallback pages for server and network errors', async () => {
  const listeners = {};
  let network = new Response('private server details', { status: 503 });
  const sandbox = {
    self: {
      addEventListener: (name, listener) => {
        listeners[name] = listener;
      },
    },
    caches: {
      match: async (path) =>
        new Response(path.includes('unavailable') ? 'Unavailable page' : 'Offline page'),
    },
    fetch: async () => {
      if (network instanceof Error) throw network;
      return network;
    },
    URL,
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
  assert.equal(await (await navigate()).text(), 'Unavailable page');
  network = new Error('network failure');
  assert.equal(await (await navigate()).text(), 'Offline page');
  network = new Response('Admin page');
  assert.equal(await (await navigate()).text(), 'Admin page');
});
