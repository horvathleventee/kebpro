// Isolated loopback preview. Reads provider settings only; never reads configured database settings.
const fs = require('node:fs');
const path = require('node:path');
const config = require('../portal/config').loadPortalConfig();
if (config.PORTAL_TRACKING_ENABLED !== 'true')
  throw Error('A követés nincs bekapcsolva a privát beállításokban.');
const provider = require('../portal/holazauto').fromConfig(config);
const directory = path.join(__dirname, '../data/tracking-live-preview');
fs.mkdirSync(directory, { recursive: true });
const portal = require('../portal/app').createPortalApp({
  filename: path.join(directory, 'preview.sqlite'),
  trackingProvider: provider,
  geoapifyKey: config.PORTAL_GEOAPIFY_API_KEY || '',
});
portal.ready
  .then(async (credentials) => {
    if (credentials)
      fs.writeFileSync(
        path.join(directory, 'admin-access.txt'),
        `Felhasználónév: ${credentials.username}\nJelszó: ${credentials.password}\n`,
        { mode: 0o600, flag: 'wx' },
      );
    const worker = require('../portal/worker').createWorker({
      store: portal.store,
      trackingProvider: provider,
      live: false,
    });
    const timer = setInterval(
      () => void worker.tick().catch(() => console.error('A teszt háttérmunkás hibát jelzett.')),
      60000,
    );
    timer.unref();
    portal.app.listen(38981, '127.0.0.1', () =>
      console.log('Helyi HolAzAutó-próba: http://127.0.0.1:38981/partner-admin/'),
    );
  })
  .catch(() => {
    console.error('A helyi teszt nem indult el. Ellenőrizd a privát beállításokat.');
    process.exitCode = 1;
  });
