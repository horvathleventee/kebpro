const test = require('node:test');
const assert = require('node:assert/strict');
const { createPortalApi } = require('../portal/client/api.cjs');
function setup(fetchImpl, online = true) {
  const seen = { start: 0, end: 0, saves: 0, unauthorized: 0 };
  const request = createPortalApi({
    base: '/partner',
    csrf: 'csrf-test',
    fetchImpl,
    isOnline: () => online,
    saveDraft: () => seen.saves++,
    onMutationStart: () => seen.start++,
    onMutationEnd: () => seen.end++,
    onUnauthorized: () => seen.unauthorized++,
  });
  return { seen, request };
}
test('API sets CSRF on mutations, preserves request identity and balances mutation tracking', async () => {
  let call;
  const { seen, request } = setup(async (url, options) => {
    call = { url, options };
    return { status: 200, ok: true, json: async () => ({ ok: true }) };
  });
  assert.deepEqual(await request('responses', { requestId: 'stable' }), { ok: true });
  assert.equal(call.url, '/partner/api/responses');
  assert.equal(call.options.headers['X-CSRF-Token'], 'csrf-test');
  assert.equal(JSON.parse(call.options.body).requestId, 'stable');
  assert.deepEqual(seen, { start: 1, end: 1, saves: 1, unauthorized: 0 });
});
test('API preserves order drafts on network and server failures', async () => {
  for (const fetchImpl of [
    async () => {
      throw Error('network');
    },
    async () => ({ status: 503, ok: false }),
  ]) {
    const { seen, request } = setup(fetchImpl, false);
    await assert.rejects(request('responses', { requestId: 'one' }), /piszkozat|visszaigazolást/i);
    assert.equal(seen.saves, 2);
    assert.equal(seen.start, 1);
    assert.equal(seen.end, 1);
  }
});
test('API redirects on expired session and reports server validation errors', async () => {
  let result = setup(async () => ({ status: 401, ok: false }));
  await assert.rejects(result.request('me'), /Jelentkezz be újra/);
  assert.equal(result.seen.unauthorized, 1);
  assert.equal(result.seen.start, 0);
  result = setup(async () => ({
    status: 400,
    ok: false,
    json: async () => ({ error: 'Érvénytelen adat' }),
  }));
  await assert.rejects(result.request('news', {}), /Érvénytelen adat/);
  assert.equal(result.seen.end, 1);
});
test('API reads without mutation tracking and tracks DELETE requests', async () => {
  const calls = [];
  const { seen, request } = setup(async (url, options) => {
    calls.push({ url, options });
    return { status: 200, ok: true, json: async () => ({ ok: true }) };
  });
  await request('me');
  assert.deepEqual(calls[0].options, {});
  assert.equal(seen.start, 0);
  await request('subscription', { endpoint: 'test' }, 'DELETE');
  assert.equal(calls[1].options.method, 'DELETE');
  assert.equal(calls[1].options.headers['X-CSRF-Token'], 'csrf-test');
  assert.equal(seen.start, 1);
  assert.equal(seen.end, 1);
});
test('API reports offline errors without changing order draft for unrelated requests', async () => {
  const { seen, request } = setup(async () => {
    throw Error('network');
  }, false);
  await assert.rejects(request('news', {}), /Nincs internetkapcsolat/);
  assert.equal(seen.saves, 0);
  assert.equal(seen.end, 1);
});
test('HTML error pages show a helpful message and an unclear order response preserves the draft', async () => {
  let attempt = setup(async () => ({
    status: 404,
    ok: false,
    json: async () => {
      throw new SyntaxError('Unexpected token <');
    },
  }));
  await assert.rejects(attempt.request('route-reschedule', {}), /frissített alkalmazást/);
  attempt = setup(async () => ({
    status: 200,
    ok: true,
    json: async () => {
      throw new SyntaxError('Unexpected token <');
    },
  }));
  await assert.rejects(attempt.request('responses', { requestId: 'one' }), /piszkozat megmaradt/i);
  assert.equal(attempt.seen.saves, 2);
});
