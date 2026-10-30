const fs = require('node:fs/promises'),
  path = require('node:path');
const labels = {
  database: 'Az adatbázis nem érhető el',
  worker: 'A háttérfeldolgozás hibás vagy elmaradt',
  backup: 'A napi adatmentés elmaradt',
  push: 'Sikertelen push-küldések',
  http: 'A partneralkalmazás nem érhető el',
  server: 'Ismétlődő szerverhiba',
};
function createAlerts({
  recipient,
  sendEmail,
  stateFile,
  now = () => Date.now(),
  threshold = 3,
  cooldown = 3600000,
  retry = 300000,
} = {}) {
  if (recipient && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(recipient))
    throw Error('Invalid PORTAL_ALERT_EMAIL');
  let queue = Promise.resolve();
  async function run(code, healthy) {
    if (!labels[code]) throw Error('Unknown alert category');
    if (!recipient) return { enabled: false };
    if (!stateFile || !sendEmail) throw Error('Alert persistence and SMTP are required');
    let state = {};
    try {
      state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    const time = now(),
      entry = state[code] || { failures: 0, active: false };
    if (healthy) {
      entry.failures = 0;
    } else {
      entry.failures++;
      entry.firstFailure ||= time;
    }
    const recover = healthy && entry.active;
    const notify =
      (recover ||
        (!healthy &&
          entry.failures >= threshold &&
          (!entry.lastSent || time - entry.lastSent >= cooldown))) &&
      (!entry.lastAttempt || time - entry.lastAttempt >= retry);
    let sent = false,
      error = false;
    if (notify) {
      entry.lastAttempt = time;
      try {
        await sendEmail({
          to: recipient,
          subject: 'Kebpro · ' + (recover ? 'Helyreállt: ' : 'Hibajelzés: ') + labels[code],
          text:
            (recover
              ? 'A következő ellenőrzés ismét sikeres: '
              : 'A következő ellenőrzés ismételten hibát jelez: ') +
            labels[code] +
            '.\nIdőpont: ' +
            new Date(time).toISOString() +
            '\nKategória: ' +
            code +
            '\n\n' +
            (recover
              ? 'Ellenőrizd az esetleg elmaradt feladatokat.'
              : 'Ellenőrizd az üzemeltetési naplót és a szolgáltatást. A levél nem tartalmaz ügyféladatokat vagy hozzáférési kulcsokat.'),
        });
        entry.active = !recover;
        entry.lastSent = time;
        sent = true;
      } catch {
        error = true;
        console.error('[portal alerts] Email delivery failed');
      }
    }
    if (healthy && !entry.active) {
      entry.firstFailure = null;
      entry.lastSent = null;
    }
    state[code] = entry;
    await fs.mkdir(path.dirname(stateFile), { recursive: true, mode: 0o700 });
    const temp = stateFile + '.tmp';
    await fs.writeFile(temp, JSON.stringify(state), { mode: 0o600 });
    await fs.rename(temp, stateFile);
    return { enabled: true, sent, emailFailed: error };
  }
  return {
    enabled: Boolean(recipient),
    check(code, healthy) {
      const result = queue.then(() => run(code, healthy));
      queue = result.catch(() => {});
      return result;
    },
  };
}
module.exports = { createAlerts };
