const { chromium } = require('../.local-tests/browser/node_modules/playwright-core');
const { createPortalApp } = require('../portal/app'),
  auth = require('../portal/auth'),
  assert = require('node:assert/strict');
(async () => {
  const clock = new Date('2026-10-14T08:00:00Z');
  const portal = createPortalApp({
    filename: ':memory:',
    now: () => clock,
    adminCredentials: { username: 'uitestadmin', password: 'Password123' },
    sendEmail: async () => {},
  });
  await portal.ready;
  await auth.register(portal.store, {
    email: 'ui@example.invalid',
    username: 'uitestpartner',
    password: 'Password123',
    company: 'Teszt partner',
    contact: 'Teszt',
    phone: '123456789',
    address: 'Teszt utca',
  });
  await portal.store.change((s) => {
    let u = s.users.find((x) => x.username === 'uitestpartner');
    u.status = 'approved';
    u.partnerId = 'partner-1';
    s.products[0].prices = { kg: 2000 };
  });
  const server = portal.app.listen(0, '127.0.0.1');
  await new Promise((r) => server.on('listening', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.PORTAL_TEST_CHROME_PATH ||
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
    });
    const pc = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      }),
      ac = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
    const partner = await pc.newPage(),
      admin = await ac.newPage(),
      errors = [];
    for (const page of [partner, admin]) page.on('pageerror', (e) => errors.push(e.message));
    async function login(page, area, user) {
      await page.goto(origin + '/' + area + '/login');
      await page.locator('#login-form [name=username]').fill(user);
      await page.locator('#login-form [name=password]').fill('Password123');
      await page.locator('#login-form button').click();
      await page.waitForURL('**/' + area + '/');
      await page.locator('#sync-status').waitFor();
    }
    const signup = await pc.newPage();
    await signup.goto(origin + '/partner/login');
    await signup.locator('[data-auth-tab=register]').click();
    const form = signup.locator('#register-form');
    for (const [name, value] of Object.entries({
      company: 'Próba Kft',
      contact: 'Próba',
      email: 'new@example.invalid',
      phone: '123456789',
      address: 'Teszt cím',
      username: 'newuitest',
      password: 'Password123',
      confirmation: 'Password123',
    }))
      await form.locator('[name="' + name + '"]').fill(value);
    assert.equal(await form.locator('[name=termsAccepted]').isChecked(), false);
    await form.locator('button[type=submit],button:not([type])').last().click();
    assert.equal(
      await form.locator('[name=termsAccepted]').evaluate((e) => e.validity.valueMissing),
      true,
    );
    const privacyHref = await form.locator('a[href*="/legal/privacy/"]').getAttribute('href');
    const legalPage = await pc.newPage();
    await legalPage.goto(origin + privacyHref);
    assert.match(await legalPage.locator('h1').innerText(), /adatkezelési tájékoztató/i);
    await legalPage.close();
    await form.locator('[name=termsAccepted]').check();
    await form.locator('button[type=submit],button:not([type])').last().click();
    await signup
      .locator('#login-error')
      .getByText(/regisztrációdat rögzítettük/i)
      .waitFor();
    const newUser = (await portal.store.read()).users.find((u) => u.username === 'newuitest');
    assert.ok(newUser.termsAcceptance?.terms?.hash);
    await signup.close();
    await login(admin, 'partner-admin', 'uitestadmin');
    await admin.locator('.staff-mobile-nav').waitFor({ state: 'visible' });
    const mobile = await admin.locator('.staff-mobile-nav').boundingBox();
    assert.ok(mobile.height < 100, 'mobile navigation too tall: ' + mobile.height);
    await admin.locator('#mobile-more summary').click();
    await admin.locator('.mobile-more-panel [data-nav=settings]').click();
    assert.equal(await admin.locator('#route-settings').evaluate((e) => e.open), false);
    await admin.locator('#route-settings summary').click();
    await admin
      .locator('#route-settings form')
      .first()
      .locator('[name=name]')
      .fill('Teszt hétfői túra');
    await admin.locator('#route-settings form').first().locator('button').click();
    await admin.getByText('Túra beállításai elmentve.').waitFor();
    await admin.locator('#route-settings [name=name]').first().waitFor();
    assert.equal(await admin.locator('#route-settings').evaluate((e) => e.open), true);
    assert.equal(
      await admin.locator('#route-settings [name=name]').first().inputValue(),
      'Teszt hétfői túra',
    );
    await admin.locator('#route-settings summary').click();
    assert.equal(await admin.locator('#route-settings').evaluate((e) => e.open), false);
    assert.equal(await admin.locator('#partner-days-settings').evaluate((e) => e.open), false);
    await admin.locator('#partner-days-settings summary').click();
    assert.equal(await admin.locator('#partner-days-settings').evaluate((e) => e.open), true);
    await admin.locator('#partner-days-settings summary').click();
    await admin.locator('#staff-email').fill('newstaff@example.invalid');
    await admin.locator('#invite-staff button').click();
    await admin.locator('#confirm-dialog[open]').waitFor();
    assert.match(await admin.locator('#confirm-content').innerText(), /newstaff@example.invalid/);
    await admin.locator('#cancel-confirm').click();
    const accountButton = admin
      .locator('#react-staff-settings-root [data-action=account-status]')
      .first();
    const accountName = await accountButton.locator('..').locator('strong').first().innerText();
    await accountButton.click();
    await admin.locator('#confirm-dialog[open]').waitFor();
    assert.match(await admin.locator('#confirm-content').innerText(), new RegExp(accountName));
    await admin.locator('#cancel-confirm').click();

    await admin.locator('#mobile-more summary').click();
    assert.equal(await admin.locator('#mobile-more').evaluate((e) => e.open), true);
    await admin.locator('.mobile-more-panel [data-nav=products]').click();
    assert.equal(await admin.locator('#mobile-more').evaluate((e) => e.open), false);
    await admin.locator('#price-product-search').fill('gyros');
    await admin.locator('#mobile-more summary').click();
    await admin.locator('.mobile-more-panel [data-nav=news]').click();
    await admin.locator('#react-staff-news-root').waitFor();
    await admin.locator('#news-title').fill('Próbahír React');
    await admin.locator('#news-body').fill('Üzenet teszteléshez');
    await admin.evaluate(() => window.KebproReactScreens.refreshView());
    await admin.waitForTimeout(100);
    assert.equal(await admin.locator('#news-title').inputValue(), 'Próbahír React');
    await admin.route('**/partner-admin/api/news', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Próbahiba' }),
      }),
    );
    await admin.locator('#publish-news button').click();
    await admin
      .getByText('Az alkalmazás kiszolgálója átmenetileg nem elérhető. Próbáld újra később.', {
        exact: true,
      })
      .waitFor();
    assert.equal(await admin.locator('#news-title').inputValue(), 'Próbahír React');
    assert.equal(await admin.locator('#news-body').inputValue(), 'Üzenet teszteléshez');
    await admin.unroute('**/partner-admin/api/news');
    await admin.locator('#publish-news button').click();
    await admin.getByText('A hír megjelent.', { exact: true }).waitFor();
    await admin.locator('.news-card').filter({ hasText: 'Próbahír React' }).waitFor();
    assert.equal(
      (await portal.store.read()).news.filter((n) => n.title === 'Próbahír React').length,
      1,
    );
    await login(partner, 'partner', 'uitestpartner');
    if (
      await partner
        .locator('#push-later')
        .isVisible()
        .catch(() => false)
    )
      await partner.locator('#push-later').click();
    await partner.locator('[data-nav=news]').click();
    await partner.locator('#react-news-root h1').waitFor();
    assert.match(await partner.locator('#react-news-root').innerText(), /Frissen a Kebprótól/);
    await partner.locator('.news-card').filter({ hasText: 'Próbahír React' }).waitFor();
    await partner.locator('#react-news-root [data-action=refresh]').click();
    await partner.locator('#react-news-root h1').waitFor();
    await partner.locator('[data-nav=home]').click();
    await partner.locator('#react-home-root').waitFor();
    await partner.locator('#react-home-root [data-action=skip]').click();
    await partner.locator('#confirm-dialog[open]').waitFor();
    await partner.locator('#cancel-confirm').click();
    await partner.locator('[data-nav=settings]').click();
    await partner.locator('#react-partner-settings-root').waitFor();
    await partner.locator('#preferences [name=news]').uncheck();
    await partner.locator('#preferences button').click();
    await partner.getByText('Beállítások elmentve.').waitFor();
    assert.equal(
      (await portal.store.read()).partners.find((p) => p.id === 'partner-1').preferences.news,
      false,
    );
    await partner.locator('[data-nav=order]').click();
    await partner.locator('[data-action=choose-product]').click();
    await partner.locator('.product-picker [data-favorite]').first().click();
    await partner.locator('.product-picker [data-favorite][aria-pressed=true]').first().waitFor();
    await partner.locator('#product-search').fill('kebab');
    await partner.locator('.product-picker [data-product]').first().waitFor();
    await partner.locator('#product-search').fill('');
    await partner.locator('.product-picker [data-product]').first().click();
    await partner.locator('#add-product button[type=submit]').click();
    assert.match(await partner.locator('#cart-total').innerText(), /2[\s\u00a0]?000/);
    await partner.locator('[data-cart-quantity]').fill('2');
    await partner
      .locator('#cart-total')
      .getByText(/4[\s\u00a0]?000/)
      .waitFor();
    await partner.locator('[data-cart-quantity]').fill('1');
    await partner
      .locator('#cart-total')
      .getByText(/2[\s\u00a0]?000/)
      .waitFor();
    await partner.locator('[data-action=save-template]').click();
    await partner.locator('#template-name').fill('Próba rendelési lista');
    await partner.locator('#submit-confirm').click();
    await partner.getByText('Rendelési lista mentve.').waitFor();
    await partner.locator('[data-action=remove-item]').click();
    await partner.locator('#react-order-root details summary').first().click();
    await partner.locator('[data-action=load-template]').first().click();
    await partner.getByText(/Lista betöltve/).waitFor();
    assert.equal(await partner.locator('[data-cart-quantity]').inputValue(), '1');
    await partner.locator('#order-note').fill('Piszkozat teszt');
    await partner.reload();
    await partner.locator('#cart-total').waitFor();
    assert.equal(await partner.locator('#order-note').inputValue(), 'Piszkozat teszt');
    assert.match(await partner.locator('#cart-total').innerText(), /2[\s\u00a0]?000/);
    await partner.locator('[data-action=review]').click();
    await partner.route('**/partner/api/responses', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
    );
    await partner.locator('#submit-confirm').click();
    await partner
      .locator('#confirm-error')
      .getByText(/átmenetileg nem elérhető/)
      .waitFor();
    assert.equal(await partner.locator('#confirm-dialog').evaluate((e) => e.open), true);
    await partner.unroute('**/partner/api/responses');
    await partner.locator('#submit-confirm').click();
    await partner.waitForURL('**/#history');
    await partner.locator('#react-history-root [data-action=edit-order]').first().click();
    await partner.locator('#react-order-root [data-action=cancel-edit]').waitFor();
    assert.equal(await partner.locator('[data-cart-quantity]').inputValue(), '1');
    await partner.locator('[data-action=cancel-edit]').click();
    await partner.locator('[data-nav=history]').click();
    await partner.locator('summary').filter({ hasText: 'Probléma bejelentése' }).first().click();
    await partner.locator('[data-complaint-order] textarea').first().fill('Teszt: hiányzó áru');
    await partner
      .locator('[data-complaint-order] input[type=file]')
      .first()
      .setInputFiles('public/images/optimized/products/kebab-nyars-640.jpg');
    await partner
      .locator('[data-complaint-order] input[name=labelPhoto]')
      .first()
      .setInputFiles('public/images/optimized/products/kebab-nyars-640.jpg');
    await partner.locator('[data-complaint-order] button').first().click();
    await partner.getByText('Teszt: hiányzó áru').waitFor();
    await partner.locator('.complaint-photo').first().waitFor();
    assert.ok(
      await partner
        .locator('.complaint-photo')
        .first()
        .evaluate((e) => e.complete && e.naturalWidth > 0),
    );
    await admin.reload();
    await admin.locator('.staff-mobile-nav [data-nav=dashboard]').click();
    await admin.locator('#react-dashboard-root [data-action=archive-order]').first().click();
    await admin.getByText('Rendelés archiválva. Az Archívumból visszaállítható.').waitFor();
    await admin.locator('[data-action=order-view][data-view=archived]').click();
    await admin.locator('#react-dashboard-root [data-action=restore-order]').first().click();
    await admin.getByText('Rendelés visszaállítva az újak közé.').waitFor();
    await admin.reload();
    await admin.locator('#mobile-more-count').waitFor({ state: 'visible' });
    assert.equal(await admin.locator('#mobile-more-count').innerText(), '2');
    await admin.locator('.staff-mobile-nav [data-nav=calls]').click();
    await admin.locator('[data-action=calls-mode][data-mode=manual]').click();
    const filters = admin.locator('#filters label');
    const firstBox = await filters.nth(0).boundingBox(),
      secondBox = await filters.nth(1).boundingBox();
    assert.ok(secondBox.y >= firstBox.y + firstBox.height, 'mobile filters overlap');
    await admin.locator('#mobile-more summary').click();
    await admin.locator('.mobile-more-panel [data-nav=complaints]').click();
    await admin.getByText('Teszt: hiányzó áru').waitFor();
    await admin.locator('.complaint-photo').first().waitFor();
    assert.ok(
      await admin
        .locator('.complaint-photo')
        .first()
        .evaluate((e) => e.complete && e.naturalWidth > 0),
    );
    await admin.evaluate(() => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data) => {
          window.testSharedFile = data.files[0].name;
        },
      });
    });
    await admin.locator('[data-action=export-complaint]').first().click();
    await admin.locator('.export-dialog[open]').waitFor();
    assert.equal(
      await admin
        .locator('.export-dialog')
        .getByRole('button', { name: 'Vissza a bejelentésekhez' })
        .isVisible(),
      true,
    );
    await admin
      .locator('.export-dialog')
      .getByRole('button', { name: 'Mentés / megosztás' })
      .click();
    assert.equal(await admin.evaluate(() => window.testSharedFile), 'kebpro-bejelentes.html');
    await admin.locator('#export-close').click();
    await admin.locator('.export-dialog').waitFor({ state: 'detached' });
    await admin.evaluate(() =>
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }),
    );
    await admin.locator('[data-action=export-complaint]').first().click();
    const [download] = await Promise.all([
      admin.waitForEvent('download'),
      admin.locator('.export-dialog').getByRole('link', { name: 'Fájl letöltése' }).click(),
    ]);
    assert.equal(download.suggestedFilename(), 'kebpro-bejelentes.html');
    await admin.locator('#export-close').click();
    await admin.locator('.export-dialog').waitFor({ state: 'detached' });
    await admin.locator('[data-action=view-photo]').first().click();
    await admin.locator('.complaint-photo-viewer[open]').waitFor();
    assert.equal(
      await admin
        .locator('.complaint-photo-viewer img')
        .evaluate((e) => e.complete && e.naturalWidth > 0),
      true,
    );
    await admin.locator('.complaint-photo-viewer button').click();
    await admin.locator('.complaint-photo-viewer').waitFor({ state: 'detached' });
    await admin.locator('[data-complaint-reply] textarea').fill('A problémát rendezzük.');
    await admin.locator('[data-complaint-reply] select').selectOption('resolved');
    await admin.locator('[data-complaint-reply] button').click();
    await admin.locator('.badge').filter({ hasText: 'Lezárva' }).waitFor();
    await partner.reload();
    await partner.getByText('A problémát rendezzük.').waitFor();
    assert.equal(await admin.locator('#mobile-more-count').innerText(), '1');
    await admin.locator('#mobile-more summary').click();
    await admin.keyboard.press('Escape');
    assert.equal(await admin.locator('#mobile-more').evaluate((e) => e.open), false);
    await admin.locator('#mobile-more summary').click();
    await admin.locator('main#content').click({ position: { x: 5, y: 5 } });
    assert.equal(await admin.locator('#mobile-more').evaluate((e) => e.open), false);
    await admin.locator('.staff-mobile-nav [data-nav=packing]').click();
    await admin.getByText('Összesen · 1 rendelés').waitFor();
    assert.equal(await admin.locator('#react-packing-root').count(), 1);
    await admin.screenshot({ path: 'output/ui-smoke-mobile-packing.png', fullPage: true });
    await admin.locator('#mobile-more summary').click();
    await admin.locator('.mobile-more-panel [data-nav=products]').click();
    await admin.locator('#price-partner-filter').selectOption('partner-1');
    await admin.locator('[data-price-card]').first().locator('summary').first().click();
    assert.ok(
      await admin
        .locator('[data-price-product]')
        .first()
        .locator('input[name=price]')
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 16),
      'Mobile price input font must be at least 16px',
    );
    await admin.locator('[data-price-product]').first().locator('input[name=price]').fill('1800');
    await admin.route('**/partner-admin/api/prices', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
    );
    await admin.locator('[data-price-product]').first().locator('button').click();
    await admin
      .getByText('Az alkalmazás kiszolgálója átmenetileg nem elérhető. Próbáld újra később.')
      .waitFor();
    assert.equal(
      await admin.locator('[data-price-product]').first().locator('input[name=price]').inputValue(),
      '1800',
    );
    await admin.locator('#price-partner-filter').selectOption('');
    await admin.getByText('Előbb mentsd az elkezdett ármódosítást.').waitFor();
    assert.equal(await admin.locator('#price-partner-filter').inputValue(), 'partner-1');
    await admin.unroute('**/partner-admin/api/prices');
    await admin.locator('[data-price-product]').first().locator('button').click();
    await admin.getByText('Ár elmentve.').waitFor();
    const productCard = admin.locator('[data-price-card]').first();
    await productCard.locator('summary').nth(1).click();
    await productCard
      .locator('[data-promotion-product] select[name=kind]')
      .first()
      .selectOption('discount');
    await productCard.locator('[data-promotion-product] input[name=value]').first().fill('200');
    await productCard
      .locator(
        '[data-promotion-product] button[type=submit], [data-promotion-product] button:not([type])',
      )
      .first()
      .click();
    await admin.getByText('Általános akció elmentve.').waitFor();
    await admin
      .locator('[data-price-card]')
      .first()
      .getByText(/Akció aktív/)
      .waitFor();
    await admin
      .locator('[data-price-card]')
      .first()
      .getByRole('button', { name: 'Akció levétele' })
      .click();
    await admin.locator('#submit-confirm').click();
    await admin.getByText('Akció megszüntetve.').waitFor();
    assert.equal(
      await admin.locator('[data-price-card]').first().locator('.promotion-active').count(),
      0,
    );
    await partner.reload();
    assert.match(await partner.locator('.history-items').first().innerText(), /2[\s\u00a0]?000/);
    await admin.locator('#mobile-more summary').click();
    await admin.locator('.mobile-more-panel [data-nav=applications]').click();
    await admin.locator('#react-applications-root').waitFor();
    const application = admin
      .locator('#react-applications-root section.card')
      .filter({ hasText: 'Próba Kft' })
      .locator('[data-application]');
    await application.locator('[name=routeIds]').first().check();
    await application.locator('button[type=submit],button:not([type])').first().click();
    await admin.getByText(/Partner jóváhagyva/).waitFor();
    assert.equal(
      (await portal.store.read()).users.find((u) => u.username === 'newuitest').status,
      'approved',
    );
    await portal.store.change((s) => {
      s.auditLog = Array.from({ length: 410 }, (_, i) => ({
        id: 'audit-' + i,
        at: new Date('2026-10-14T08:00:00Z').toISOString(),
        actorName: 'Munkatárs',
        action: 'products',
        changes: [
          {
            collection: 'products',
            id: s.products[0].id,
            before: { name: 'Régi' },
            after: { name: 'Új' },
          },
        ],
      }));
    });
    await admin.reload();
    await admin.locator('#mobile-more summary').click();
    await admin.locator('.mobile-more-panel [data-nav=notifications]').click();
    await admin.locator('[data-audit-group]').first().waitFor();
    assert.equal(await admin.locator('[data-audit-group]').count(), 8);
    assert.equal(await admin.locator('.audit-entry').count(), 400);
    await admin.locator('.audit-entry').first().locator('summary').click();
    assert.match(await admin.locator('.audit-entry').first().innerText(), /Régi/);
    assert.equal(await admin.locator('.audit-entry').first().locator('pre').count(), 0);
    await partner.locator('[data-nav=reports]').click();
    await partner
      .locator('#react-reports-root [data-general-report] textarea')
      .fill('Általános próbaüzenet');
    await partner.locator('#react-reports-root [data-general-report] button').click();
    await partner.getByText('Általános próbaüzenet', { exact: true }).waitFor();
    assert.equal(
      await partner.locator('#react-reports-root [data-general-report] textarea').inputValue(),
      '',
    );
    await admin.evaluate(() => navigator.serviceWorker.ready);
    await ac.setOffline(true);
    await admin.goto(origin + '/partner-admin/');
    assert.match(await admin.locator('h1').innerText(), /Most nincs kapcsolat/);
    await ac.setOffline(false);
    await admin.goto(origin + '/partner-admin/');
    await admin.locator('#sync-status').waitFor();
    await admin.setViewportSize({ width: 1280, height: 900 });
    assert.equal(await admin.locator('.staff-mobile-nav').isVisible(), false);
    assert.equal(await admin.locator('.staff-desktop-nav').isVisible(), true);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        registrationTerms: 'ok',
        mobileNavHeight: mobile.height,
        partnerOrder: 'ok',
        price: 'ok',
        complaint: 'ok',
        adminReply: 'ok',
        packing: 'ok',
        draftReload: 'ok',
        historicalPrice: 'ok',
        pageErrors: errors,
      }),
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
