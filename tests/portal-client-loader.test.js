const test = require('node:test'),
  assert = require('node:assert/strict');
const { createPortalLoader } = require('../portal/client/loader.cjs');
function setup(api) {
  const state = {
      role: 'partner',
      data: null,
      automaticLoadPending: false,
      mutations: 0,
      loadSequence: 0,
      ordersPage: 1,
      historyPage: 1,
      orderView: 'new',
      archiveSort: 'createdAt',
      archiveDate: '',
      orderSearch: '',
      selectedDate: '',
      selectedRoute: '',
    },
    identity = {},
    statuses = [],
    rendered = [];
  const content = { querySelector: () => null, querySelectorAll: () => [], contains: () => false };
  const document = {
    activeElement: null,
    hidden: false,
    querySelector: () => null,
    getElementById: (id) => (id === 'identity' ? identity : null),
  };
  const ctx = {
    content,
    document,
    navigator: { onLine: true },
    window: { scrollY: 0, scrollTo: () => {} },
    api,
    getState: () => ({ ...state }),
    setState: (changes) => Object.assign(state, changes),
    formState: () => [],
    restoreForms: () => {},
    restoreDraft: () => {},
    render: () => rendered.push(state.data.name),
    syncStatus: (value) => statuses.push(value),
    offerSessionRenewal: () => {},
    offerPushSetup: () => {},
    toast: () => {},
    statusLabel: {},
  };
  return { state, content, identity, statuses, rendered, load: createPortalLoader(ctx) };
}
const partner = (name) => ({ name, history: [], historyPage: { page: 1 }, products: [] });
test('Loader discards a late response after a newer request has completed', async () => {
  const pending = [];
  const { state, load, rendered } = setup(() => new Promise((resolve) => pending.push(resolve)));
  const first = load(),
    second = load();
  pending[1](partner('új'));
  await second;
  pending[0](partner('régi'));
  await first;
  assert.equal(state.data.name, 'új');
  assert.deepEqual(rendered, ['új']);
});
test('Automatic refresh waits while a sensitive form has unsaved edits', async () => {
  let count = 0;
  const { state, content, load } = setup(async () => {
    count++;
    return partner('új');
  });
  content.querySelector = () => ({});
  await load(true);
  assert.equal(count, 0);
  assert.equal(state.automaticLoadPending, false);
});
test('Automatic refresh releases its lock after a network failure', async () => {
  const { state, load, statuses } = setup(async () => {
    throw Error('offline');
  });
  await load(true);
  assert.equal(state.automaticLoadPending, false);
  assert.equal(statuses.at(-1), 'Kapcsolódás újra…');
});

test('Automatic refresh discards a response when editing starts during the request', async () => {
  let resolve;
  const x = setup(() => new Promise((r) => (resolve = r)));
  x.state.data = partner('korábbi');
  const running = x.load(true);
  x.content.querySelector = () => ({});
  resolve(partner('késői'));
  await running;
  assert.equal(x.state.data.name, 'korábbi');
  assert.equal(x.state.automaticLoadPending, false);
});
