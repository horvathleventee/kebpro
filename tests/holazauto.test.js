const test = require('node:test');
const assert = require('node:assert/strict');
const { createProvider } = require('../portal/holazauto');

test('provider logs in once and returns only the requested device position', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('apilogin')) return new Response(JSON.stringify({ token: 'private' }));
    return new Response(
      JSON.stringify({
        positions: {
          DeviceAsset_123: {
            dynamicValues: {
              lastPosition: { latitude: 47, longitude: 19, timestamp: 1608287224000, speed: 99 },
            },
          },
        },
      }),
    );
  };
  const provider = createProvider({
    origin: 'https://example.test',
    loginName: 'user',
    password: 'secret',
    fetchImpl,
  });
  const [one, two] = await Promise.all([provider.position('123'), provider.position('123')]);
  assert.deepEqual(one, { latitude: 47, longitude: 19, timestamp: '2020-12-18T10:27:04.000Z' });
  assert.deepEqual(two, one);
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /assetIds=123/);
  assert.equal(calls[1].options.redirect, 'error');
  await assert.rejects(provider.position(''));
});
test('provider rejects a different device and unsafe configuration', async () => {
  assert.throws(() =>
    createProvider({ origin: 'http://example.test', loginName: 'u', password: 'p' }),
  );
  const provider = createProvider({
    origin: 'https://example.test',
    loginName: 'u',
    password: 'p',
    fetchImpl: async (url) =>
      new Response(
        JSON.stringify(
          String(url).includes('apilogin')
            ? { token: 't' }
            : { positions: { DeviceAsset_999: {} } },
        ),
      ),
  });
  await assert.rejects(provider.position('123'));
});
test('failed login is not retried automatically by later requests in the same process', async () => {
  let calls = 0;
  const provider = createProvider({
    origin: 'https://example.test',
    loginName: 'u',
    password: 'p',
    fetchImpl: async () => {
      calls++;
      return new Response('', { status: 500 });
    },
  });
  await assert.rejects(provider.fleet());
  await assert.rejects(provider.fleet());
  await assert.rejects(provider.position('123'));
  assert.equal(calls, 1);
});
test('staff fleet fetch omits assetIds and strips provider telemetry', async () => {
  const calls = [];
  const provider = createProvider({
    origin: 'https://example.test',
    loginName: 'u',
    password: 'p',
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).includes('/light/assets'))
        return new Response(
          JSON.stringify({
            assets: [
              { assetID: 'DeviceAsset_123', licensePlate: 'ABC-123', speed: 100 },
              { assetID: 'DeviceAsset_789', licensePlate: 'DEF-789' },
              { assetID: 'VehicleAsset_456', licensePlate: 'XYZ-456' },
            ],
          }),
        );
      return new Response(
        JSON.stringify(
          String(url).includes('apilogin')
            ? { token: 't' }
            : {
                positions: {
                  DeviceAsset_123: {
                    speed: 99,
                    dynamicValues: {
                      lastPosition: { latitude: 47, longitude: 19, timestamp: 1608287224000 },
                      driver: 'secret',
                    },
                  },
                  DeviceAsset_456: {
                    dynamicValues: {
                      lastPosition: { latitude: 48, longitude: 20, timestamp: 1608287224000 },
                    },
                  },
                  DeviceAsset_bad: {
                    dynamicValues: {
                      lastPosition: { latitude: 47, longitude: 19, timestamp: 1608287224000 },
                    },
                  },
                },
              },
        ),
      );
    },
  });
  const fleet = await provider.fleet();
  assert.equal(fleet.length, 2);
  assert.equal(new URL(calls[1]).searchParams.has('assetIds'), false);
  assert.equal(fleet[0].licensePlate, 'ABC-123');
  assert.equal(fleet[1].licensePlate, null);
  assert.equal(await provider.plate('123'), 'ABC-123');
  assert.deepEqual(await provider.devices(), [
    { deviceId: '123', licensePlate: 'ABC-123' },
    { deviceId: '789', licensePlate: 'DEF-789' },
  ]);
  assert.equal(calls.filter((url) => url.includes('/light/assets')).length, 1);
  assert.deepEqual(Object.keys(fleet[0]).sort(), [
    'deviceId',
    'latitude',
    'licensePlate',
    'longitude',
    'timestamp',
  ]);
});
