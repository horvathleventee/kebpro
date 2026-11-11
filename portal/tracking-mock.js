// Explicitly injected by local preview/tests only. Never enable for a live deployment.
function createMockProvider({
  latitude = 47.4979,
  longitude = 19.0402,
  now = () => new Date(),
} = {}) {
  return {
    async devices() {
      return [
        { deviceId: 'mock', licensePlate: 'MINTA-01' },
        { deviceId: '9002', licensePlate: 'MINTA-02' },
      ];
    },
    async plate(deviceId) {
      return deviceId === 'mock' ? 'MINTA-01' : deviceId === '9002' ? 'MINTA-02' : null;
    },
    async fleet() {
      return [
        {
          deviceId: 'mock',
          latitude,
          longitude,
          timestamp: now().toISOString(),
          licensePlate: 'MINTA-01',
        },
        {
          deviceId: '9002',
          latitude: latitude + 0.035,
          longitude: longitude + 0.08,
          timestamp: now().toISOString(),
          licensePlate: 'MINTA-02',
        },
      ];
    },
    async position(deviceId) {
      if (deviceId !== 'mock' && deviceId !== '9002') throw Error('Unknown mock device');
      return {
        latitude: latitude + (deviceId === '9002' ? 0.035 : 0),
        longitude: longitude + (deviceId === '9002' ? 0.08 : 0),
        timestamp: now().toISOString(),
      };
    },
  };
}
module.exports = { createMockProvider };
