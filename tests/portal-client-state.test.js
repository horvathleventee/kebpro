const test = require('node:test');
const assert = require('node:assert/strict');
const { createApplicationState } = require('../portal/client/application-state.cjs');

test('state instances are isolated and patches preserve the current state reference', () => {
  const first = createApplicationState({ note: '', quantity: 1 });
  const second = createApplicationState({ note: 'másik', quantity: 4 });
  const reference = first.read();
  first.patch({ quantity: 2 });
  assert.equal(first.read(), reference);
  assert.deepEqual(first.state, { note: '', quantity: 2 });
  assert.deepEqual(second.state, { note: 'másik', quantity: 4 });
});
