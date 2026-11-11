// Isolated local-only example; never reads .env or production storage.
const path = require('node:path');
const fs = require('node:fs');
const { createPortalApp } = require('../portal/app');
const { createMockProvider } = require('../portal/tracking-mock');
const { localTime } = require('../portal/domain');
const provider = createMockProvider();
const directory = path.join(__dirname, '../data/tracking-demo');
fs.mkdirSync(directory, { recursive: true });
const portal = createPortalApp({
  filename: path.join(directory, 'demo.sqlite'),
  trackingProvider: provider,
  registrationSearchDemo: true,
  geoapifyKey: require('../portal/config').loadPortalConfig().PORTAL_GEOAPIFY_API_KEY || '',
  adminCredentials: { username: 'admin', password: 'demo-admin-123' },
});
portal.ready
  .then(async () => {
    const digest = await require('../portal/auth').passwordHash('demo-partner-123');
    await portal.store.change((s) => {
      const date = localTime(new Date()).date;
      const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
      const route = s.routes.find((r) => r.days.includes(weekday));
      const partner = s.partners[0];
      if (!route || !partner) throw Error('Preview seed is missing');
      partner.routeId = route.id;
      partner.routeIds = [route.id];
      partner.address = 'Budapest, Deák Ferenc tér (minta)';
      if (!s.users.some((u) => u.username === 'demo-partner'))
        s.users.push({
          id: 'tracking-demo-user',
          username: 'demo-partner',
          passwordHash: digest,
          role: 'partner',
          status: 'approved',
          partnerId: partner.id,
        });
      s.responses = s.responses.filter((r) => r.id !== 'tracking-demo-order');
      s.responses.push({
        id: 'tracking-demo-order',
        partnerId: partner.id,
        partnerName: partner.name,
        address: 'Budapest, Deák Ferenc tér (minta)',
        routeId: route.id,
        date,
        kind: 'order',
        status: 'received',
        items: [],
        createdAt: new Date().toISOString(),
        trackingAddress: {
          address: 'Budapest, Deák Ferenc tér (minta)',
          verified: true,
          latitude: 47.4979,
          longitude: 19.054,
        },
      });
      s.trackingVehicles ||= [];
      if (
        !s.trackingVehicles.some((v) => v.id === 'tracking-demo-vehicle' || v.deviceId === 'mock')
      )
        s.trackingVehicles.push({
          id: 'tracking-demo-vehicle',
          label: 'Bemutató jármű',
          deviceId: 'mock',
        });
      s.trackingAssignments ||= [];
      if (
        !s.trackingAssignments.some((a) => a.routeId === route.id && a.date === date) &&
        s.trackingVehicles.some((v) => v.id === 'tracking-demo-vehicle')
      )
        s.trackingAssignments.push({
          id: 'tracking-demo-assignment-' + date,
          routeId: route.id,
          date,
          vehicleId: 'tracking-demo-vehicle',
        });
    });
    const worker = require('../portal/worker').createWorker({
      store: portal.store,
      trackingProvider: provider,
    });
    await worker.tick();
    const timer = setInterval(() => void worker.tick().catch(() => {}), 60000);
    timer.unref();
    portal.app.listen(38980, '127.0.0.1', () =>
      console.log('Tracking demo: http://127.0.0.1:38980/partner/'),
    );
  })
  .catch(() => {
    console.error('Tracking preview could not start.');
    process.exitCode = 1;
  });
