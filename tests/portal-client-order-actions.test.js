const test = require('node:test'),
  assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
globalThis.crypto ||= webcrypto;
const { createOrderActions } = require('../portal/client/order-actions.cjs');
function setup() {
  const state = {
    data: { products: [{ id: 'p', name: 'Teszt', prices: { kg: 1500 } }], templates: [] },
    cart: [],
    note: '',
    editing: null,
    orderDate: '2026-11-01',
    requestId: 'initial',
  };
  let saves = 0,
    renders = 0;
  const messages = [];
  const ctx = {
    getState: () => state,
    setState: (change) => Object.assign(state, change),
    render: () => renders++,
    saveDraft: () => saves++,
    toast: (text) => messages.push(text),
    confirm: () => {},
    openProductPicker: () => {},
    editHistoryOrder: () => {},
    api: async () => {},
    load: async () => {},
    currentResponse: () => null,
    chosenDelivery: () => ({ date: state.orderDate }),
    esc: String,
    dateLabel: String,
    quantity: String,
    money: String,
    currentPrice: () => 1500,
    currentLine: (item) => 1500 * item.quantity,
    cartSummary: () => '',
    skipDelivery: () => {},
    navigate: () => {},
  };
  return { state, messages, actions: createOrderActions(ctx), counts: () => ({ saves, renders }) };
}
test('Order actions validate quantities and keep request identity and draft state updated', () => {
  const { state, messages, actions, counts } = setup(),
    form = (quantity, unit = 'kg') =>
      new Map([
        ['productId', 'p'],
        ['quantity', quantity],
        ['unit', unit],
      ]);
  assert.equal(actions.add(form('1.5')), true);
  assert.equal(state.cart[0].quantity, 1.5);
  assert.notEqual(state.requestId, 'initial');
  actions.quantity(0, '2.25');
  assert.equal(state.cart[0].quantity, 2.25);
  actions.note('Megjegyzés');
  assert.equal(state.note, 'Megjegyzés');
  assert.equal(counts().saves, 2);
  assert.equal(actions.add(form('1.5', 'db')), false);
  assert.ok(messages.at(-1));
  assert.equal(state.cart.length, 1);
  actions.remove(0);
  assert.equal(state.cart.length, 0);
  assert.equal(counts().renders, 2);
});
test('Order rejects unsupported units, fractional items and over-limit quantities', () => {
  const { state, actions } = setup();
  const form = (quantity, unit) =>
    new Map([
      ['productId', 'p'],
      ['quantity', quantity],
      ['unit', unit],
    ]);
  for (const [quantity, unit] of [
    ['2', 'liter'],
    ['1.5', 'db'],
    ['10001', 'kg'],
    ['0', 'kg'],
  ])
    assert.equal(actions.add(form(quantity, unit)), false);
  assert.equal(state.cart.length, 0);
  assert.equal(state.requestId, 'initial');
});
test('Order price validation prevents confirmation when a price is missing', () => {
  const state = {
    data: { products: [{ id: 'p', name: 'Teszt' }], templates: [] },
    cart: [{ productId: 'p', name: 'Teszt', quantity: 1, unit: 'kg' }],
    note: '',
    editing: null,
    orderDate: '2026-11-01',
    requestId: 'id',
  };
  let confirmations = 0,
    notice = '';
  const actions = createOrderActions({
    getState: () => state,
    currentPrice: () => null,
    toast: (message) => (notice = message),
    confirm: () => confirmations++,
  });
  actions.review();
  assert.equal(confirmations, 0);
  assert.match(notice, /nincs megadva ár/);
  assert.equal(state.cart.length, 1);
});
