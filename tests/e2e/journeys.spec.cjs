const { test, expect } = require('@playwright/test');
const auth = require('../../portal/auth');
const { createPortalApp } = require('../../portal/app');

let siteServer;
let portalServer;
let portal;
let siteOrigin;
let portalOrigin;

async function listen(app) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  return server;
}

function origin(server) {
  return `http://127.0.0.1:${server.address().port}`;
}

test.beforeAll(async () => {
  // Set these before importing the public server: dotenv must not enable real services.
  process.env.DB_ADAPTER = 'memory';
  process.env.ENABLE_EMAIL = 'false';
  process.env.ENABLE_CAREER_EMAIL = 'false';
  process.env.PORTAL_STAGING_ENABLED = 'false';
  const site = require('../../server');
  await site.dbReady;
  siteServer = await listen(site.app);
  siteOrigin = origin(siteServer);

  portal = createPortalApp({
    filename: ':memory:',
    now: () => new Date('2026-10-14T08:00:00Z'),
    adminCredentials: { username: 'e2eadmin', password: 'Password123' },
    sendEmail: async () => {},
  });
  await portal.ready;
  await auth.register(portal.store, {
    email: 'partner@example.invalid',
    username: 'e2epartner',
    password: 'Password123',
    company: 'E2E Partner',
    contact: 'E2E Test',
    phone: '+36301234567',
    address: 'Teszt utca',
  });
  await portal.store.change((state) => {
    const user = state.users.find((item) => item.username === 'e2epartner');
    user.status = 'approved';
    user.partnerId = 'partner-1';
    state.products[0].prices = { 'nyars-5': 2000 };
  });
  portalServer = await listen(portal.app);
  portalOrigin = origin(portalServer);
});

test.afterAll(async () => {
  if (portalServer) await new Promise((resolve) => portalServer.close(resolve));
  if (portal) await portal.store.close();
  if (siteServer) await new Promise((resolve) => siteServer.close(resolve));
});

test('public pages and quote submission', async ({ page }) => {
  for (const path of ['/', '/rolunk', '/termekek', '/kapcsolat']) {
    const response = await page.goto(siteOrigin + path, { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
  }
  await page.goto(siteOrigin + '/ajanlatkeres', { waitUntil: 'domcontentloaded' });
  await page.locator('#name').fill('Teszt Elek');
  await page.locator('#company').fill('E2E Kft');
  await page.locator('#email').fill('quote@example.invalid');
  await page.locator('#phone').fill('+36301234567');
  const product = page.locator('select[name=products]');
  const value = await product.locator('option').nth(1).getAttribute('value');
  await product.selectOption(value);
  await page.locator('[name=productQuantities]').fill('10 kg');
  await page.locator('form.contact-form button[type=submit]').click();
  await expect(page.locator('[data-success-toast]')).toBeVisible();
});

async function login(page, area, username) {
  await page.goto(`${portalOrigin}/${area}/login`);
  await page.locator('#login-form [name=username]').fill(username);
  await page.locator('#login-form [name=password]').fill('Password123');
  await page.locator('#login-form button').click();
  await page.waitForURL(`**/${area}/`);
  await page.locator('#sync-status').waitFor();
}

test('partner places an order and admin archives it', async ({ browser }) => {
  const partnerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const adminContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const partner = await partnerContext.newPage();
    await login(partner, 'partner', 'e2epartner');
    if (await partner.locator('#push-later').isVisible())
      await partner.locator('#push-later').click();
    await partner.locator('[data-nav=order]').click();
    await partner.locator('[data-action=choose-product]').click();
    await partner.locator('.product-picker [data-product]').first().click();
    await partner.locator('#spitWeight').selectOption('5');
    await partner.locator('#add-product button[type=submit]').click();
    await expect(partner.locator('#cart-total')).toContainText(/2[\s\u00a0]?000/);
    await partner.locator('#order-note').fill('E2E rendelés');
    await partner.locator('[data-action=review]').click();
    await partner.locator('#submit-confirm').click();
    await partner.waitForURL('**/#history');
    await expect(partner.locator('#react-history-root')).toBeVisible();

    const admin = await adminContext.newPage();
    await login(admin, 'partner-admin', 'e2eadmin');
    await admin.locator('.staff-mobile-nav [data-nav=dashboard]').click();
    await expect(admin.locator('#react-dashboard-root')).toContainText('E2E rendelés');
    await admin.locator('#react-dashboard-root [data-action=archive-order]').first().click();
    await expect(
      admin.getByText('Rendelés archiválva. Az Archívumból visszaállítható.'),
    ).toBeVisible();
    await admin.locator('[data-action=order-view][data-view=archived]').click();
    await expect(admin.locator('#react-dashboard-root')).toContainText('E2E rendelés');
  } finally {
    await partnerContext.close();
    await adminContext.close();
  }
});
