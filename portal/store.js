const fs = require('fs');
const path = require('path');
const audit = require('./audit');
const sqlite3 = require('sqlite3');

// Local prototype storage. All changes are serialized and committed atomically.
// Separate from the live website database; never silently falls back to memory.
function createStore(filename, seed) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new sqlite3.Database(filename);
  const run = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.run(sql, params, function (err) {
        err ? reject(err) : resolve(this);
      }),
    );
  const get = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))),
    );
  let queue = (async () => {
    await run('PRAGMA busy_timeout = 5000');
    await run(
      'CREATE TABLE IF NOT EXISTS portal_state (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL)',
    );
    await run('INSERT OR IGNORE INTO portal_state(id, body) VALUES (1, ?)', [
      JSON.stringify(seed()),
    ]);
  })();
  const ready = queue;
  function serialize(fn) {
    const result = queue.then(fn);
    queue = result.catch(() => {});
    return result;
  }
  return {
    ready,
    read: () =>
      serialize(async () =>
        JSON.parse((await get('SELECT body FROM portal_state WHERE id=1')).body),
      ),
    change: (fn) =>
      serialize(async () => {
        await run('BEGIN IMMEDIATE');
        try {
          const state = JSON.parse((await get('SELECT body FROM portal_state WHERE id=1')).body);
          const actor = audit.context.getStore();
          if (
            actor &&
            !state.users?.some(
              (u) =>
                u.id === actor.id && u.status === 'approved' && u.role === (actor.role || 'staff'),
            )
          )
            throw new (require('./domain').InputError)('A fiók már nem aktív.', 403);
          const before =
            actor && (actor.role || 'staff') === 'staff' ? audit.snapshot(state) : null;
          const result = fn(state);
          if (result && typeof result.then === 'function')
            throw new Error('Store mutations must be synchronous');
          if (before) audit.record(state, before, actor);
          await run('UPDATE portal_state SET body=? WHERE id=1', [JSON.stringify(state)]);
          await run('COMMIT');
          return result;
        } catch (err) {
          await run('ROLLBACK');
          throw err;
        }
      }),
    close: () =>
      serialize(
        () => new Promise((resolve, reject) => db.close((err) => (err ? reject(err) : resolve()))),
      ),
  };
}
module.exports = { createStore };
