const test = require('node:test');
const assert = require('node:assert/strict');
const domain = require('../portal/domain');
const units = require('../portal/order-units.json');
const { getOrderProductOptions } = require('../utils/i18n');

test('Every catalog product has its specified order unit', () => {
  for (const { value } of getOrderProductOptions('hu')) assert.ok(units[value], value);
});
test('Server enforces product units and accepts package pricing', () => {
  const state = domain.seed();
  const product = state.products.find((p) => p.name === 'Dürüm tortilla 25 cm');
  domain.updatePrice(state, { productId: product.id, unit: 'csomag', price: 1000 });
  const meat = state.products.find((p) => p.id === 'product-8');
  domain.updatePrice(state, { productId: meat.id, unit: 'karton', price: 1000 });
  const input = {
    kind: 'order',
    date: '2026-10-15',
    requestId: domain.id(),
    items: [
      { productId: product.id, quantity: 2, unit: 'csomag' },
      { productId: meat.id, quantity: 2, unit: 'karton' },
    ],
    expectedPrices: [1000, 1000],
    note: '',
  };
  const now = new Date('2026-10-14T08:00:00Z');
  assert.throws(
    () =>
      domain.submitResponse(
        state,
        'partner-1',
        { ...input, items: [{ ...input.items[0], unit: 'karton' }] },
        now,
      ),
    /rendelési egysége/,
  );
  assert.equal(domain.submitResponse(state, 'partner-1', input, now).items[0].unit, 'csomag');
});

test('Small orders are accepted and assessed; either threshold qualifies', () => {
  const { assessOrder } = require('../portal/client/order-assessment.cjs');
  const item = (productId, quantity, unit) => ({ productId, quantity, unit });
  assert.equal(assessOrder([item('product-8', 1, 'karton')]), 'below');
  assert.equal(
    assessOrder([item('product-8', 1, 'karton'), item('frozen-chicken-1_5kg', 1, 'karton')]),
    'ok',
  );
  assert.equal(assessOrder([item('product-32', 19, 'kg')]), 'below');
  assert.equal(assessOrder([item('product-32', 20, 'kg'), item('product-8', 1, 'karton')]), 'ok');
  assert.equal(
    assessOrder([item('product-8', 1, 'karton'), item('product-18', 1, 'karton')]),
    'unknown',
  );
  const state = domain.seed();
  const product = state.products.find((p) => p.id === 'product-8');
  domain.updatePrice(state, { productId: product.id, unit: 'karton', price: 1000 });
  const input = {
    kind: 'order',
    date: '2026-10-15',
    requestId: domain.id(),
    items: [item(product.id, 1, 'karton')],
    expectedPrices: [1000],
  };
  const response = domain.submitResponse(
    state,
    'partner-1',
    input,
    new Date('2026-10-14T08:00:00Z'),
  );
  assert.equal(response.followUp, 'below');
});

test('Chicken variants are distinct, unpriced, and migration is idempotent', () => {
  const state = domain.seed();
  const { migrateChickenVariants } = require('../portal/migrations');
  migrateChickenVariants(state);
  const old = state.products.find((p) => p.id === 'product-9');
  assert.equal(old.active, true);
  old.active = false;
  migrateChickenVariants(state);
  assert.equal(old.active, false);
  old.active = true;
  migrateChickenVariants(state);
  assert.equal(old.active, true);
  for (const id of ['frozen-chicken-1kg', 'frozen-chicken-1_5kg']) {
    const matches = state.products.filter((p) => p.id === id);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].orderUnit, 'karton');
    assert.equal(matches[0].prices, undefined);
  }
});

test('An explicitly empty contact phone never falls back to an old account number', () => {
  const state = domain.seed();
  const partner = state.partners[0];
  partner.phone = '';
  state.users = [{ partnerId: partner.id, phone: '+36123456789' }];
  const admin = domain.adminView(state, '2026-11-10', partner.routeId);
  assert.equal(admin.partners.find((p) => p.id === partner.id).phone, '');
});

test('Edited order reassesses and staff see the current phone on archived orders', () => {
  const state = domain.seed();
  const product = state.products.find((p) => p.id === 'product-8');
  domain.updatePrice(state, { productId: product.id, unit: 'karton', price: 1000 });
  const now = new Date('2026-10-14T08:00:00Z');
  const input = {
    kind: 'order',
    date: '2026-10-15',
    requestId: domain.id(),
    items: [{ productId: product.id, quantity: 1, unit: 'karton' }],
    expectedPrices: [1000],
  };
  const order = domain.submitResponse(state, 'partner-1', input, now);
  assert.equal(order.followUp, 'below');
  const edited = domain.submitResponse(
    state,
    'partner-1',
    {
      ...input,
      requestId: domain.id(),
      responseId: order.id,
      revision: order.revision,
      items: [{ ...input.items[0], quantity: 2 }],
    },
    now,
  );
  assert.equal(edited.followUp, 'ok');
  state.partners[0].phone = '+36 30 123 4567';
  domain.archiveOrder(
    state,
    { id: order.id, revision: order.revision, archived: true },
    'staff',
    now,
  );
  const result = domain.adminView(state, '2026-10-15').allOrders.find((o) => o.id === order.id);
  assert.equal(result.followUp, 'ok');
  assert.equal(result.contactPhone, '+36 30 123 4567');
});

test('nyárs sizes, per-size prices, mixed lines and templates are preserved', () => {
  const state = domain.seed();
  const product = state.products[0];
  const partner = state.partners[0];
  const { assessOrder } = require('../portal/client/order-assessment.cjs');
  for (const size of [5, 10, 15, 20, 30, 40, 50, 60])
    domain.updatePrice(state, { productId: product.id, unit: `nyars-${size}`, price: size * 100 });
  const items = [
    { productId: product.id, quantity: 2, unit: 'db', spitWeight: 5 },
    { productId: product.id, quantity: 1, unit: 'db', spitWeight: 10 },
  ];
  assert.equal(assessOrder([items[0]]), 'below');
  assert.equal(assessOrder([{ ...items[0], spitWeight: 10 }]), 'ok');
  const saved = domain.saveTemplate(state, partner.id, { name: 'nyárs', items });
  assert.equal(saved.items[0].totalWeight, 10);
  assert.equal(saved.items[1].spitWeight, 10);
  const now = new Date('2026-10-14T08:00:00Z');
  const input = {
    kind: 'order',
    date: '2026-10-15',
    requestId: domain.id(),
    items,
    expectedPrices: [500, 1000],
  };
  const response = domain.submitResponse(state, partner.id, input, now);
  assert.equal(response.total, 2000);
  assert.equal(response.followUp, 'ok');
  assert.deepEqual(
    response.items.map((x) => x.totalWeight),
    [10, 10],
  );
  assert.throws(
    () =>
      domain.saveTemplate(state, partner.id, {
        name: 'bad',
        items: [{ ...items[0], spitWeight: 7 }],
      }),
    /nyárs méretet/,
  );
  assert.throws(
    () => domain.saveTemplate(state, partner.id, { name: 'bad', items: [items[0], items[0]] }),
    /ismétlődő/,
  );
  assert.equal(domain.safePartner(state, partner, now).products[0].prices['nyars-5'], 500);
});

test('All three nyárs products calculate their actual weights', () => {
  const { assessOrder } = require('../portal/client/order-assessment.cjs');
  for (const productId of ['product-1', 'product-2', 'product-3']) {
    assert.equal(assessOrder([{ productId, unit: 'db', quantity: 2, spitWeight: 5 }]), 'below');
    assert.equal(assessOrder([{ productId, unit: 'db', quantity: 2, spitWeight: 10 }]), 'ok');
    assert.equal(assessOrder([{ productId, unit: 'db', quantity: 2 }]), 'unknown');
  }
});

test('Admin prices and promotions use only the product ordering units', () => {
  const state = domain.seed();
  const carton = state.products.find((p) => p.name === 'Gy.f. sült marhahúsos kebab');
  const spit = state.products.find((p) => p.name === 'Csirke kebab');
  const view = domain.adminView(state, '2026-10-15');
  assert.deepEqual(view.products.find((p) => p.id === carton.id).availablePriceUnits, ['karton']);
  assert.deepEqual(
    view.products.find((p) => p.id === spit.id).availablePriceUnits,
    [5, 10, 15, 20, 30, 40, 50, 60].map((n) => `nyars-${n}`),
  );
  assert.throws(
    () => domain.updatePrice(state, { productId: carton.id, unit: 'kg', price: 1000 }),
    domain.InputError,
  );
  assert.throws(
    () =>
      domain.updatePromotion(state, {
        productId: carton.id,
        unit: 'kg',
        kind: 'fixed',
        value: 1000,
      }),
    domain.InputError,
  );
  domain.updatePrice(state, { productId: carton.id, unit: 'karton', price: 1000 });
  domain.updatePromotion(state, {
    productId: carton.id,
    unit: 'karton',
    kind: 'discount',
    value: 100,
  });
  assert.equal(domain.priceFor(carton, state.partners[0], 'karton'), 900);
  assert.throws(
    () => domain.updatePrice(state, { productId: spit.id, unit: 'db', price: 1000 }),
    domain.InputError,
  );
  domain.updatePrice(state, { productId: spit.id, unit: 'nyars-5', price: 1000 });
});

test('Admin pricing handles older responses without unit metadata', () => {
  const { availableUnits } = require('../portal/client/available-units.cjs');
  const state = domain.seed();
  for (const product of state.products) {
    const expected =
      product.id === 'product-1' || product.id === 'product-2' || product.id === 'product-3'
        ? [5, 10, 15, 20, 30, 40, 50, 60].map((n) => `nyars-${n}`)
        : [units[product.name]];
    assert.deepEqual(availableUnits(product), expected, product.name);
  }
  assert.deepEqual(availableUnits({ id: 'new', name: 'unknown' }), []);
  assert.deepEqual(availableUnits({ id: 'new', name: 'unknown', orderUnit: 'karton' }), ['karton']);
  assert.deepEqual(availableUnits({ id: 'new', name: 'unknown', availablePriceUnits: ['db'] }), [
    'db',
  ]);
});
