const test = require('node:test');
const assert = require('node:assert/strict');
const domain = require('../portal/domain');

test('Pricing preview rules: overrides, discounts, fixed prices and missing underlying prices', () => {
  const state = domain.seed(),
    product = state.products.find((p) => p.id === 'product-1'),
    partner = state.partners[0],
    other = state.partners[1];
  domain.updatePrice(state, { productId: product.id, unit: 'nyars-5', price: 1000 });
  domain.updatePrice(state, {
    productId: product.id,
    partnerId: partner.id,
    unit: 'nyars-5',
    price: 500,
  });
  domain.updatePromotion(state, {
    productId: product.id,
    unit: 'nyars-5',
    kind: 'discount',
    value: 750,
  });
  assert.equal(domain.priceFor(product, partner, 'nyars-5'), 0);
  assert.equal(domain.priceFor(product, other, 'nyars-5'), 250);
  domain.updatePromotion(state, {
    productId: product.id,
    unit: 'nyars-5',
    kind: 'fixed',
    value: 300,
  });
  assert.equal(domain.priceFor(product, partner, 'nyars-5'), 300);
  domain.updatePromotion(state, {
    productId: product.id,
    unit: 'nyars-10',
    kind: 'fixed',
    value: 300,
  });
  assert.equal(domain.priceFor(product, partner, 'nyars-10'), null);
  domain.updatePrice(state, {
    productId: product.id,
    partnerId: partner.id,
    unit: 'nyars-5',
    price: null,
  });
  domain.updatePromotion(state, { productId: product.id, unit: 'nyars-5', kind: 'none' });
  assert.equal(domain.priceFor(product, partner, 'nyars-5'), 1000);
});
