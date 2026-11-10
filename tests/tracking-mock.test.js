const test = require('node:test');
const assert = require('node:assert/strict');
const { createMockProvider } = require('../portal/tracking-mock');

test('each demo vehicle position matches its fleet position and unknown devices are rejected', async () => {
  const provider = createMockProvider({ now: () => new Date('2026-11-10T12:00:00Z') });
  for (const vehicle of await provider.fleet()) {
    const position = await provider.position(vehicle.deviceId);
    assert.deepEqual(position, { latitude: vehicle.latitude, longitude: vehicle.longitude, timestamp: vehicle.timestamp });
  }
  await assert.rejects(provider.position('unknown'));
});
