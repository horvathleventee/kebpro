const codes = ['database', 'worker', 'backup', 'push', 'server'];
function validChecks(checks) {
  return (
    checks &&
    typeof checks === 'object' &&
    !Array.isArray(checks) &&
    typeof checks.database === 'boolean' &&
    (checks.database === false || codes.every((k) => typeof checks[k] === 'boolean'))
  );
}
function createMonitor({ url, token, alerts, fetchImpl = fetch, timeout = 10000 }) {
  let running;
  async function probe() {
    let response, payload;
    try {
      response = await fetchImpl(url, {
        headers: { 'X-Portal-Monitor': token },
        signal: AbortSignal.timeout(timeout),
        redirect: 'error',
      });
      payload = await response.json();
      if (![200, 503].includes(response.status) || !validChecks(payload.checks))
        throw Error('Invalid health response');
    } catch {
      await alerts.check('http', false);
      return { healthy: false, checks: { http: false } };
    }
    await alerts.check('http', true);
    for (const code of codes)
      if (typeof payload.checks[code] === 'boolean') await alerts.check(code, payload.checks[code]);
    return {
      healthy: Object.values(payload.checks).every(Boolean),
      checks: { http: true, ...payload.checks },
    };
  }
  return {
    check() {
      if (!running)
        running = probe().finally(() => {
          running = null;
        });
      return running;
    },
  };
}
module.exports = { createMonitor, validChecks };
