const { chromium } = require('../.local-tests/browser/node_modules/playwright-core');
const { createPortalApp } = require('../portal/app');
const assert = require('node:assert/strict');

(async () => {
  const portal = createPortalApp({
    filename: ':memory:',
    now: () => new Date('2026-10-28T08:00:00Z'),
    adminCredentials: { username: 'admin', password: 'Password123' },
  });
  await portal.ready;
  await portal.store.change((s) => {
    s.routes = [
      { id: 'mon', name: 'Hétfői túra', days: [1], fixedDay: 1 },
      { id: 'tue', name: 'Keddi túra', days: [2], fixedDay: 2 },
    ];
    s.partners = [
      { id: 'p', name: 'Partner', routeId: 'mon', routeIds: ['mon', 'tue'], preferences: {} },
    ];
    s.responses = [
      {
        id: 'order-1',
        partnerId: 'p',
        partnerName: 'Partner',
        routeId: 'mon',
        date: '2026-11-02',
        kind: 'order',
        status: 'received',
        revision: 1,
        items: [],
        createdAt: '2026-10-27T08:00:00Z',
      },
      {
        id: 'order-2',
        partnerId: 'p',
        partnerName: 'Partner',
        routeId: 'tue',
        date: '2026-11-03',
        kind: 'order',
        status: 'received',
        revision: 1,
        items: [],
        createdAt: '2026-10-27T09:00:00Z',
      },
    ];
  });
  const server = portal.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.PORTAL_TEST_CHROME_PATH ||
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
    });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/partner-admin/login');
    await page.locator('#login-form [name=username]').fill('admin');
    await page.locator('#login-form [name=password]').fill('Password123');
    await page.locator('#login-form button').click();
    await page.waitForURL('**/partner-admin/');
    await page.locator('#sync-status').waitFor();
    await page.goto('http://127.0.0.1:' + server.address().port + '/partner-admin/#settings');
    await page.locator('#route-reschedules summary').click();
    await page.locator('#route-reschedule [name=routeId]').selectOption('mon');
    await page.locator('#route-reschedule [name=from]').fill('2026-11-02');
    await page.locator('#route-reschedule [name=to]').fill('2026-11-03');
    await page.locator('#route-reschedule button').click();
    await page.getByText('A túra áthelyezését elmentettük.').waitFor();
    assert.deepEqual((await portal.store.read()).routes[0].reschedules, [
      { from: '2026-11-02', to: '2026-11-03' },
    ]);
    const order = (await portal.store.read()).responses.find((item) => item.id === 'order-1');
    assert.equal(order.date, '2026-11-03');
    assert.equal(order.revision, 2);
    const second = (await portal.store.read()).responses.find((item) => item.id === 'order-2');
    assert.equal(second.date, '2026-11-03');
    assert.equal(second.routeId, 'tue');
    assert.deepEqual(errors, []);
    console.log('Mobile route rescheduling: passed');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await portal.store.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
