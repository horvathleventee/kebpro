const { dispatchNotifications } = require('./notifications');
const { runReminders } = require('./domain');
const { backup } = require('./backup');
function createWorker({
  store,
  backupDirectory,
  live = false,
  subject,
  origin,
  now = () => new Date(),
  send,
  alerts,
}) {
  if (live && (!/^https:\/\//.test(origin || '') || !/^(mailto:|https:\/\/)/.test(subject || '')))
    throw Error('Live push requires HTTPS origin and VAPID contact');
  let running;
  async function work() {
    const clock = now();
    try {
      await store.change((s) => {
        s.pushMode = live ? 'live' : 'simulation';
        runReminders(s, clock);
      });
      const result = await dispatchNotifications(store, { dryRun: !live, subject, now, send });
      const state = await store.read();
      let saved;
      if (
        backupDirectory &&
        (!state.operations?.backupAt || clock - Date.parse(state.operations.backupAt) >= 86400000)
      )
        saved = await backup(store, backupDirectory, { now: clock });
      await store.change((s) => {
        s.operations = {
          ...s.operations,
          lastTick: clock.toISOString(),
          pushMode: result.mode,
          lastError: null,
          ...(saved ? { backupAt: saved.at } : {}),
        };
        require('./retention').purge(s, clock);
      });
      if (alerts) {
        const checks = require('./health').inspect(await store.read(), clock.getTime());
        for (const code of ['database', 'worker', 'backup', 'push'])
          await alerts
            .check(code, checks[code])
            .catch(() => console.error('[portal alerts] Unable to record health check'));
      }
      return result;
    } catch (error) {
      if (alerts)
        await alerts
          .check('worker', false)
          .catch(() => console.error('[portal alerts] Unable to record worker failure'));
      try {
        await store.change((s) => {
          s.operations = {
            ...s.operations,
            lastFailure: clock.toISOString(),
            lastError: 'A háttérfolyamat hibát jelzett. Ellenőrizd a szervernaplót.',
          };
        });
      } catch {
        if (alerts) await alerts.check('database', false).catch(() => {});
      }
      throw error;
    }
  }
  return {
    idle() {
      return running || Promise.resolve();
    },
    tick() {
      if (!running)
        running = work().finally(() => {
          running = null;
        });
      return running;
    },
  };
}
module.exports = { createWorker };
