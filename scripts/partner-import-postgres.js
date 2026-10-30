// Imports a validated backup into an EMPTY dedicated PostgreSQL schema. SQLite is untouched.
const fs = require('node:fs/promises');
const { decodeBackup } = require('../portal/backup');
const { createPostgresStore } = require('../portal/postgres/store');
const env = require('../portal/config').loadPortalConfig();
(async () => {
  if (!env.PORTAL_DATABASE_URL || !process.argv[2])
    throw Error('Set PORTAL_DATABASE_URL and pass a backup JSON path');
  const state = decodeBackup(await fs.readFile(process.argv[2], 'utf8'));
  // Restored access tokens and unsent jobs must not silently become live.
  state.sessions = [];
  state.passwordResets = [];
  state.pushMode = 'simulation';
  state.operations = {};
  for (const n of state.outbox) if (n.status === 'pending') n.status = 'cancelled';
  for (const i of state.staffInvitations || [])
    if (['pending', 'sending'].includes(i.status)) {
      i.status = 'revoked';
      delete i.hash;
    }
  const store = createPostgresStore({
    connectionString: env.PORTAL_DATABASE_URL,
    initialize: false,
  });
  try {
    await store.importEmpty(state);
    const saved = await store.read();
    for (const key of ['users', 'partners', 'responses'])
      if (JSON.stringify(saved[key]) !== JSON.stringify(state[key])) {
        const { isDeepStrictEqual } = require('node:util');
        if (!isDeepStrictEqual(saved[key], state[key])) throw Error('Verification failed: ' + key);
      }
    console.log(
      'Import verified. Original backup and SQLite untouched. Sessions revoked; push simulation.',
    );
  } finally {
    await store.close();
  }
})().catch(() => {
  console.error(
    'PostgreSQL import failed. Check target connectivity, empty schema and backup validity. No credentials are printed.',
  );
  process.exitCode = 1;
});
