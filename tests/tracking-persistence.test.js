const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../portal/store');
const { seed } = require('../portal/domain');
const { split } = require('../portal/postgres/model');

test('SQLite commits assignments and rejects duplicate route and date atomically', async () => {
  const store = createStore(':memory:', seed);
  try {
    await store.ready;
    await store.change((s) => {
      s.trackingAssignments = [{ id: 'a', routeId: 'r', date: '2026-11-10', vehicleId: 'v' }];
    });
    await assert.rejects(
      store.change((s) => {
        s.trackingAssignments.push({ id: 'b', routeId: 'r', date: '2026-11-10', vehicleId: 'v' });
      }),
    );
    assert.equal((await store.read()).trackingAssignments.length, 1);
    assert.equal(split(await store.read()).metadata.trackingAssignments.length, 1);
    const invalid = await store.read();
    invalid.trackingAssignments.push({ ...invalid.trackingAssignments[0], id: 'b' });
    assert.throws(() => split(invalid), /Duplicate tracking assignment/);
  } finally {
    await store.close();
  }
});
