const test = require('node:test');
const assert = require('node:assert/strict');
const { purge } = require('../portal/retention');

test('news expires after three calendar months only with a fresh backup', () => {
  const now = new Date('2026-11-30T12:00:00Z');
  const state = {
    responses: [],
    partners: [],
    news: [
      { id: 'old', createdAt: '2026-08-30T12:00:00Z' },
      { id: 'recent', createdAt: '2026-08-30T12:00:01Z' },
      { id: 'unknown', createdAt: 'invalid' },
    ],
  };
  purge(state, now);
  assert.equal(state.news.length, 3);
  state.operations = { backupAt: now.toISOString() };
  purge(state, now);
  assert.deepEqual(
    state.news.map((item) => item.id),
    ['recent', 'unknown'],
  );
  assert.equal(state.retention.newsDeleted, 1);
});
