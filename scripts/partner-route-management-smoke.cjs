const { chromium } = require('../.local-tests/browser/node_modules/playwright-core');
const { createPortalApp } = require('../portal/app');
const assert = require('node:assert/strict');

(async () => {
  const now = new Date('2026-11-11T08:00:00Z');
  const portal = createPortalApp({
    filename: ':memory:',
    now: () => now,
    trackingProvider: require('../portal/tracking-mock').createMockProvider({ now: () => now }),
    adminCredentials: { username: 'admin', password: 'Password123' },
  });
  await portal.ready;
  await portal.store.change((state) => {
    const monday = state.routes.find((route) => route.days.length === 1 && route.days[0] === 1);
    state.partners[0].routeId = monday.id;
    state.partners[0].routeIds = [monday.id];
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
    const origin = 'http://127.0.0.1:' + server.address().port;
    await page.goto(origin + '/partner-admin/login');
    await page.locator('#login-form [name=username]').fill('admin');
    await page.locator('#login-form [name=password]').fill('Password123');
    await page.locator('#login-form button').click();
    await page.waitForURL('**/partner-admin/');
    await page.goto(origin + '/partner-admin/#settings');
    const ensureRoutesOpen = async () => {
      const details = page.locator('#route-settings');
      await details.waitFor();
      if (!(await details.evaluate((element) => element.open)))
        await details.locator(':scope > summary').click();
    };
    await ensureRoutesOpen();
    const create = page.locator('[data-route-form="new"]');
    await create.locator('[name=name]').fill('Próba túra');
    await create.locator('[name=days][value="1"]').check();
    await create.locator('[name=days][value="3"]').check();
    await create.locator('button').click();
    await page.getByText('Az új túrát létrehoztuk.').waitFor();
    let route = (await portal.store.read()).routes.find((r) => r.name === 'Próba túra');
    assert.deepEqual(route.days, [1, 3]);
    const edit = page.locator('[data-route-form="' + route.id + '"]');
    await edit.locator('[name=days][value="1"]').uncheck();
    await edit.locator('[name=days][value="4"]').check();
    await edit.getByRole('button', { name: 'Túra mentése' }).click();
    await page.getByText('Túra beállításai elmentve.').waitFor();
    route = (await portal.store.read()).routes.find((r) => r.id === route.id);
    assert.deepEqual(route.days, [3, 4]);
    await create.locator('[name=name]').fill('Másik hétfői túra');
    await create.locator('[name=days][value="1"]').check();
    await create.locator('button').click();
    await page.waitForFunction(async () => {
      const response = await fetch('/partner-admin/api/admin');
      const data = await response.json();
      return data.routes.some((r) => r.name === 'Másik hétfői túra');
    });
    const overlap = (await portal.store.read()).routes.find((r) => r.name === 'Másik hétfői túra');
    const partner = (await portal.store.read()).partners[0];
    await page.locator('#partner-days-settings summary').click();
    const partnerForm = page.locator('[data-partner-days="' + partner.id + '"]');
    await partnerForm.locator('[name=routeIds][value="' + route.id + '"]').check();
    await partnerForm.locator('[name=routeIds][value="' + overlap.id + '"]').check();
    await partnerForm.getByRole('button', { name: 'Kiszállítási napok mentése' }).click();
    await page.getByText(/ugyanarra a napra csak egy túra/).waitFor();
    assert.ok(
      !(await portal.store.read()).partners
        .find((p) => p.id === partner.id)
        .routeIds.includes(overlap.id),
    );
    await partnerForm.locator('[name=routeIds][value="' + overlap.id + '"]').uncheck();
    await partnerForm.getByRole('button', { name: 'Kiszállítási napok mentése' }).click();
    await page.getByText('Kiszállítási napok mentve.').waitFor();
    assert.ok(
      (await portal.store.read()).partners
        .find((p) => p.id === partner.id)
        .routeIds.includes(route.id),
    );
    await page
      .locator('[data-route-form="' + route.id + '"]')
      .getByRole('button', { name: 'Túra törlése' })
      .click();
    await page.locator('#confirm-dialog button#submit-confirm').click();
    await page
      .locator('#confirm-error')
      .getByText(/partnerek tartoznak/)
      .waitFor();
    assert.equal(
      (await portal.store.read()).routes.find((r) => r.id === route.id).archivedAt,
      undefined,
    );
    await page.locator('#confirm-dialog button#cancel-confirm').click();
    await partnerForm.locator('[name=routeIds][value="' + route.id + '"]').uncheck();
    await partnerForm.getByRole('button', { name: 'Kiszállítási napok mentése' }).click();
    await page.getByText('Kiszállítási napok mentve.').waitFor();
    await page.waitForFunction(
      async ({ partnerId, routeId }) => {
        const response = await fetch('/partner-admin/api/admin');
        const data = await response.json();
        return !data.allPartners.find((p) => p.id === partnerId).routeIds.includes(routeId);
      },
      { partnerId: partner.id, routeId: route.id },
    );
    await page.goto(origin + '/partner-admin/#tracking');
    const ensureTrackingOpen = async () => {
      const details = page.locator('details.tracking-settings');
      await details.waitFor();
      if (!(await details.evaluate((element) => element.open)))
        await details.locator(':scope > summary').click();
    };
    await ensureTrackingOpen();
    const assignment = page.locator('.tracking-assignment');
    await assignment.getByLabel('Nap', { exact: true }).fill('2026-11-18');
    await assignment.locator('select').nth(0).selectOption(route.id);
    await assignment.locator('select').nth(1).selectOption('fleet:mock');
    await assignment.getByRole('button', { name: 'Hozzárendelés mentése' }).click();
    await page.getByText('A módosítást elmentettük.').waitFor();
    assert.ok(
      (await portal.store.read()).trackingAssignments.some(
        (a) => a.routeId === route.id && a.date === '2026-11-18',
      ),
    );
    await page.goto(origin + '/partner-admin/#settings');
    await ensureRoutesOpen();
    await page
      .locator('[data-route-form="' + route.id + '"]')
      .getByRole('button', { name: 'Túra törlése' })
      .click();
    await page.locator('#confirm-dialog button#submit-confirm').click();
    await page
      .locator('#confirm-error')
      .getByText(/járműbeosztás/)
      .waitFor();
    await page.locator('#confirm-dialog button#cancel-confirm').click();
    await page.goto(origin + '/partner-admin/#tracking');
    await ensureTrackingOpen();
    await assignment.getByLabel('Nap', { exact: true }).fill('2026-11-18');
    await assignment.locator('select').nth(0).selectOption(route.id);
    await assignment.locator('select').nth(1).selectOption('remove');
    await assignment.getByRole('button', { name: 'Hozzárendelés mentése' }).click();
    await page.getByText('A módosítást elmentettük.').waitFor();
    await page.goto(origin + '/partner-admin/#settings');
    await ensureRoutesOpen();
    await page
      .locator('[data-route-form="' + route.id + '"]')
      .getByRole('button', { name: 'Túra törlése' })
      .click();
    await page.locator('#confirm-dialog button#submit-confirm').click();
    await page.getByText('A túrát töröltük.').waitFor();
    assert.ok((await portal.store.read()).routes.find((r) => r.id === route.id).archivedAt);
    assert.deepEqual(errors, []);
    console.log(
      'Mobile route create, edit, partner and vehicle assignment, protected deletion and removal: passed',
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await portal.store.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
