const test = require('node:test');
const assert = require('node:assert/strict');
const { createPortalApp } = require('../portal/app');
const legal = require('../portal/legal');
const auth = require('../portal/auth');

test('trial registration binds selected result to address and carries an unverified suggestion to staff', async () => {
  const portal = createPortalApp({ filename: ':memory:', registrationSearchDemo: true,
    adminCredentials: { username: 'admin', password: 'Password123' }, sendEmail: async () => {},
    registrationSearchFn: async () => [{ label: 'Budapest, Deák Ferenc tér', latitude: 47.5, longitude: 19.1 }] });
  await portal.ready;
  const server = portal.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const post = (path, body) => fetch(origin + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await post('/partner/api/registration-address-search', { query: 'Nem nyilvános cím' })).status, 400);
    const found = await (await post('/partner/api/registration-address-search', { query: 'Budapest, Deák Ferenc tér' })).json();
    const terms = legal.snapshot('terms'), privacy = legal.snapshot('privacy');
    const input = { username: 'test-partner', password: 'Password123', email: 'test@example.invalid', company: 'Teszt', contact: 'Teszt', phone: '+36301234567', address: found.results[0].label, addressSelection: found.results[0].token, termsAccepted: true, termsVersion: terms.version, termsHash: terms.hash, privacyVersion: privacy.version, privacyHash: privacy.hash };
    assert.equal((await post('/partner/api/register', { ...input, address: 'Másik cím' })).status, 400);
    assert.equal((await post('/partner/api/register', input)).status, 201);
    await portal.store.change((state) => {
      const user = state.users.find((u) => u.username === input.username);
      assert.equal(user.trackingAddressSuggestion.source, 'registration');
      auth.review(state, { id: user.id, status: 'approved', routeIds: [state.routes[0].id] });
      const partner = state.partners.find((p) => p.id === user.partnerId);
      assert.equal(partner.trackingPointRequired, false);
      assert.equal(partner.trackingAddressSuggestion.latitude, 47.5);
      assert.equal(require('../portal/tracking').verifiedAddress(state, partner.id, partner.address), null);
    });
  } finally { await new Promise((resolve) => server.close(resolve)); await portal.store.close(); }
});
