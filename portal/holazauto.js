function createProvider({ origin, loginName, password, fetchImpl = fetch }) {
  const base = new URL(origin);
  if (
    base.protocol !== 'https:' ||
    base.username ||
    base.password ||
    base.pathname !== '/' ||
    base.search ||
    base.hash ||
    !loginName ||
    !password
  )
    throw Error('Invalid tracking provider configuration');
  let token,
    loginPromise,
    loginBlocked = false,
    plateCache,
    deviceCache,
    platePromise,
    plateCacheUntil = 0;
  const inflight = new Map();
  async function request(path, options) {
    const response = await fetchImpl(new URL(path, base), {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      const error = Error('Tracking provider request failed');
      error.status = response.status;
      throw error;
    }
    const reader = response.body?.getReader();
    if (!reader) throw Error('Invalid tracking provider response');
    const chunks = [];
    let length = 0;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.length;
        if (length > 262144) throw Error('Tracking response too large');
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    return JSON.parse(Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8'));
  }
  async function login() {
    if (token) return token;
    if (loginBlocked) throw Error('Tracking login disabled until restart');
    if (!loginPromise)
      loginPromise = request('/proxy/services/v2/session/apilogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'client-type': 'HOLAFLEET_API' },
        body: JSON.stringify({ loginName, password, systemTag: 'HOLA' }),
      })
        .then((data) => {
          if (typeof data.token !== 'string' || !data.token || data.token.length > 4096)
            throw Error('Invalid tracking token');
          token = data.token;
          return token;
        })
        .catch((error) => {
          loginBlocked = true;
          throw error;
        })
        .finally(() => {
          loginPromise = undefined;
        });
    return loginPromise;
  }
  async function plates() {
    if (plateCache && Date.now() < plateCacheUntil) return plateCache;
    if (!platePromise)
      platePromise = (async () => {
        const currentToken = await login();
        let response;
        try {
          response = await request('/proxy/services/v2/light/assets', {
            headers: { token: currentToken, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          if (error.status === 401 && token === currentToken) {
            token = undefined;
            loginBlocked = true;
          }
          throw error;
        }
        if (!Array.isArray(response.assets)) throw Error('Invalid asset list');
        const result = new Map(),
          seen = new Set(),
          duplicate = new Set();
        for (const asset of response.assets) {
          const match =
            typeof asset.assetID === 'string' && /^DeviceAsset_(\d{1,30})$/.exec(asset.assetID);
          if (!match) continue;
          if (seen.has(match[1])) {
            duplicate.add(match[1]);
            continue;
          }
          seen.add(match[1]);
          const plate = typeof asset.licensePlate === 'string' ? asset.licensePlate.trim() : '';
          if (plate && plate.length <= 30 && /^[\p{L}\p{N} -]+$/u.test(plate))
            result.set(match[1], plate);
        }
        for (const id of duplicate) result.delete(id);
        deviceCache = [...seen]
          .filter((id) => !duplicate.has(id))
          .map((id) => ({ deviceId: id, licensePlate: result.get(id) || null }));
        plateCache = result;
        plateCacheUntil = Date.now() + 300000;
        return result;
      })().finally(() => {
        platePromise = undefined;
      });
    return platePromise;
  }
  return {
    async devices() {
      await plates();
      return deviceCache.map((item) => ({ ...item }));
    },
    async plate(deviceId) {
      return (await plates()).get(deviceId) || null;
    },
    async fleet() {
      const currentToken = await login();
      let response;
      try {
        response = await request('/proxy/services/v2/positions/current?assetClass=DeviceAsset', {
          headers: {
            token: currentToken,
            'client-type': 'HOLAFLEET',
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        if (error.status === 401 && token === currentToken) {
          token = undefined;
          loginBlocked = true;
        }
        throw error;
      }
      if (
        !response.positions ||
        typeof response.positions !== 'object' ||
        Array.isArray(response.positions)
      )
        throw Error('Invalid tracking fleet');
      const result = [];
      for (const [key, item] of Object.entries(response.positions)) {
        const match = /^DeviceAsset_(\d{1,30})$/.exec(key);
        const position = item?.dynamicValues?.lastPosition;
        if (
          !match ||
          !require('./tracking').point(position) ||
          typeof position.timestamp !== 'number' ||
          !Number.isFinite(position.timestamp) ||
          !Number.isFinite(new Date(position.timestamp).getTime())
        )
          continue;
        result.push({
          deviceId: match[1],
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: new Date(position.timestamp).toISOString(),
        });
      }
      let registrations;
      try {
        registrations = await plates();
      } catch {
        registrations = new Map();
      }
      return result.map((item) => ({
        ...item,
        licensePlate: registrations.get(item.deviceId) || null,
      }));
    },
    position(deviceId) {
      if (typeof deviceId !== 'string' || !/^\d{1,30}$/.test(deviceId))
        return Promise.reject(Error('Invalid device ID'));
      if (!inflight.has(deviceId))
        inflight.set(
          deviceId,
          (async () => {
            const currentToken = await login();
            const query = new URLSearchParams({ assetClass: 'DeviceAsset', assetIds: deviceId });
            let response;
            try {
              response = await request('/proxy/services/v2/positions/current?' + query, {
                headers: {
                  token: currentToken,
                  'client-type': 'HOLAFLEET',
                  'Content-Type': 'application/json',
                },
              });
            } catch (error) {
              if (error.status === 401 && token === currentToken) {
                token = undefined;
                loginBlocked = true;
              }
              throw error;
            }
            const raw =
              response.positions?.['DeviceAsset_' + deviceId]?.dynamicValues?.lastPosition;
            if (!raw || typeof raw.timestamp !== 'number' || !Number.isFinite(raw.timestamp))
              throw Error('Invalid tracking position');
            const timestamp = new Date(raw.timestamp);
            if (!Number.isFinite(timestamp.getTime())) throw Error('Invalid tracking timestamp');
            return {
              latitude: raw.latitude,
              longitude: raw.longitude,
              timestamp: timestamp.toISOString(),
            };
          })().finally(() => inflight.delete(deviceId)),
        );
      return inflight.get(deviceId);
    },
  };
}
function fromConfig(env) {
  if (env.PORTAL_TRACKING_ENABLED !== 'true') return null;
  return createProvider({
    origin: env.HOLAZAUTO_ORIGIN,
    loginName: env.HOLAZAUTO_LOGIN,
    password: env.HOLAZAUTO_PASSWORD,
  });
}
module.exports = { createProvider, fromConfig };
