const test = require('node:test');
const assert = require('node:assert/strict');
const { createStaffSettingsActions } = require('../portal/client/staff-settings-actions.cjs');

function setup(api = async () => {}) {
  let dialog,
    loads = 0;
  const notices = [];
  const actions = createStaffSettingsActions({
    expanded: new Set(),
    api,
    load: async () => loads++,
    toast: (message) => notices.push(message),
    confirm: (title, action, context) => {
      dialog = { title, action, context };
    },
    getData: () => ({
      accounts: [{ id: 'a', status: 'approved', company: 'Teszt Kft.', username: 'test' }],
    }),
    openSessionRenewal: () => {},
  });
  return {
    actions,
    notices,
    get dialog() {
      return dialog;
    },
    get loads() {
      return loads;
    },
  };
}
test('route changes send all weekdays and preserve unsaved state on failure', async () => {
  const calls = [];
  const x = setup(async (path, body) => calls.push({ path, body }));
  const form = { dataset: { dirty: 'true' } };
  const values = new FormData();
  values.append('name', 'Hétfő');
  values.append('days', '1');
  values.append('days', '3');
  values.append('reminder', '10:00');
  values.append('cutoff', '14:00');
  await x.actions.saveRoute('r1', values, form);
  assert.deepEqual(calls[0].body.days, [1, 3]);
  assert.equal(calls[0].path, 'routes');
  assert.equal(form.dataset.dirty, undefined);
  assert.equal(x.loads, 1);
  const failing = setup(async () => {
    throw Error('server');
  });
  const dirtyForm = { dataset: { dirty: 'true' } };
  await assert.rejects(failing.actions.saveRoute('r1', values, dirtyForm), /server/);
  assert.equal(dirtyForm.dataset.dirty, 'true');
  assert.equal(failing.loads, 0);
});
test('staff account changes require confirmation before making the request', async () => {
  const calls = [];
  const x = setup(async (path, body) => calls.push({ path, body }));
  x.actions.accountStatus('a');
  assert.equal(calls.length, 0);
  assert.equal(x.dialog.context.name, 'Teszt Kft.');
  await x.dialog.action();
  assert.deepEqual(calls, [{ path: 'accounts', body: { id: 'a', status: 'disabled' } }]);
  assert.equal(x.loads, 1);
});
