// Restore only to a NEW SQLite file; never overwrite a running database.
const fs = require('node:fs/promises');
const { decodeBackup } = require('../portal/backup');
const { createStore } = require('../portal/store');
(async () => {
  const [source, target] = process.argv.slice(2);
  if (!source || !target || target === ':memory:')
    throw Error('Usage: node scripts/partner-restore.js backup.json NEW-database.sqlite');
  const state = decodeBackup(await fs.readFile(source, 'utf8'));
  const reserved = await fs.open(target, 'wx', 0o600);
  await reserved.close();
  state.sessions = [];
  state.passwordResets = [];
  state.pushMode = 'simulation';
  for (const i of state.staffInvitations || [])
    if (['pending', 'sending'].includes(i.status)) {
      i.status = 'revoked';
      delete i.hash;
    }
  for (const n of state.outbox) if (n.status === 'pending') n.status = 'cancelled';
  state.operations = { restoredAt: new Date().toISOString(), pushMode: 'simulation' };
  const store = createStore(target, () => state);
  try {
    await store.ready;
    const read = await store.read();
    if (read.responses.length !== state.responses.length)
      throw Error('Restore verification failed');
    console.log(
      'Restore verified. All sessions revoked; push disabled. Original database unchanged.',
    );
  } finally {
    await store.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
