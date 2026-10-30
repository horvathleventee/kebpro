const { chromium } = require('../.local-tests/browser/node_modules/playwright-core');
const { createPortalApp } = require('../portal/app'),
  auth = require('../portal/auth'),
  assert = require('node:assert/strict');
const { createRecovery } = require('../portal/recovery'),
  { createInvitations } = require('../portal/invitations');
(async () => {
  const messages = [];
  const portal = createPortalApp({
    filename: ':memory:',
    adminCredentials: { username: 'admin', password: 'Password123' },
    sendEmail: async (m) => messages.push(m),
  });
  await portal.ready;
  await auth.register(portal.store, {
    email: 'reset@example.invalid',
    username: 'resetuser',
    password: 'Password123',
    company: 'Teszt',
    contact: 'Teszt',
    phone: '123456789',
    address: 'Teszt cím',
  });
  await auth.register(portal.store, {
    email: 'fallback@example.invalid',
    username: 'fallbackpartner',
    password: 'Password123',
    company: 'Tartalék partner',
    contact: 'Teszt',
    phone: '123456789',
    address: 'Teszt cím',
  });
  await portal.store.change((s) => {
    const user = s.users.find((u) => u.username === 'fallbackpartner');
    user.status = 'approved';
    user.partnerId = 'partner-1';
  });
  const server = portal.app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.PORTAL_TEST_CHROME_PATH ||
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
    });
    const page = await browser.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const recovery = createRecovery({
      store: portal.store,
      origin,
      sendEmail: async (m) => messages.push(m),
    });
    await recovery.request({ email: 'reset@example.invalid' }, 'partner');
    const resetToken = messages.at(-1).text.match(/#([a-f0-9]{64})/)[1];
    await page.goto(origin + '/partner/reset-password#' + resetToken);
    await page.locator('#reset-form [name=password]').fill('NewPassword123');
    await page.locator('#reset-form [name=confirmation]').fill('NewPassword123');
    assert.equal(await page.evaluate(() => location.hash), '');
    await page.locator('#reset-form button').click();
    await page.getByText(/A jelszavad elmentettük/).waitFor();
    assert.equal(await page.locator('#reset-form').isHidden(), true);
    await assert.rejects(
      recovery.reset({ token: resetToken, password: 'NewPassword123' }, 'partner'),
    );
    const invitations = createInvitations({
        store: portal.store,
        origin,
        sendEmail: async (m) => messages.push(m),
      }),
      owner = (await portal.store.read()).users.find((u) => u.role === 'staff');
    await invitations.invite({ email: 'staff@example.invalid' }, owner.id);
    const token = messages.at(-1).text.match(/#([a-f0-9]{64})/)[1];
    await page.goto(origin + '/partner-admin/accept-invitation#' + token);
    await page.locator('#invitation-form [name=username]').fill('newstaff');
    await page.locator('#invitation-form [name=password]').fill('NewPassword123');
    await page.locator('#invitation-form [name=confirmation]').fill('NewPassword123');
    assert.equal(await page.evaluate(() => location.hash), '');
    await page.locator('#invitation-form button').click();
    await page.getByText(/A céges fiókod elkészült/).waitFor();
    await assert.rejects(
      invitations.accept({ token, username: 'again', password: 'NewPassword123' }),
    );
    await page.goto(origin + '/partner/reset-password');
    await page.getByText(/A link hiányos vagy érvénytelen/).waitFor();
    assert.equal(await page.locator('#reset-form').isHidden(), true);
    await page.goto(origin + '/partner-admin/accept-invitation');
    await page.getByText(/Hiányzó vagy érvénytelen meghívó/).waitFor();
    assert.equal(await page.locator('#invitation-form').isHidden(), true);
    const fallback = await browser.newPage();
    await fallback.route('**/partner/assets/react-auth.js', (route) => route.abort());
    await fallback.route('**/partner/assets/react-screens.js', (route) => route.abort());
    await fallback.goto(origin + '/partner-admin/login');
    await fallback.locator('#login-form [name=username]').fill('admin');
    await fallback.locator('#login-form [name=password]').fill('Password123');
    await fallback.locator('#login-form button').click();
    await fallback.waitForURL('**/partner-admin/');
    await fallback.getByRole('heading', { name: 'Rendelések' }).waitFor();
    await fallback.close();
    const partnerFallback = await browser.newPage();
    await partnerFallback.route('**/partner/assets/react-auth.js', (route) => route.abort());
    await partnerFallback.route('**/partner/assets/react-screens.js', (route) => route.abort());
    await partnerFallback.goto(origin + '/partner/login');
    await partnerFallback.locator('#login-form [name=username]').fill('fallbackpartner');
    await partnerFallback.locator('#login-form [name=password]').fill('Password123');
    await partnerFallback.locator('#login-form button').click();
    await partnerFallback.waitForURL('**/partner/');
    await partnerFallback
      .locator('#sync-status')
      .getByText(/Automatikus frissítés/)
      .waitFor();
    if (
      await partnerFallback
        .locator('#push-later')
        .isVisible()
        .catch(() => false)
    )
      await partnerFallback.locator('#push-later').click();
    await partnerFallback.locator('[data-nav=order]').first().click();
    await partnerFallback.locator('#add-product').waitFor();
    await partnerFallback.close();
    assert.deepEqual(errors, []);
    console.log(
      'React reset and invitation: success, one-use tokens, fragment removal, invalid links and both fallback logins passed',
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
    await portal.store.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
