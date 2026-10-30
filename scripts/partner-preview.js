// Only the SMTP adapter reads mail settings from .env; production storage is never loaded.
const { createPortalApp } = require('../portal/app');
const portalEnv = require('../portal/config').loadPortalConfig();
const port = Number(portalEnv.PORTAL_PORT || 3002);
const mailer = require('../portal/mailer').createPortalMailer();
console.log('Password reset email: ' + (mailer.configured ? 'SMTP configured' : 'SMTP missing'));
const { app, store, ready, tick } = createPortalApp({
  monitorToken: portalEnv.PORTAL_MONITOR_TOKEN,
  databaseUrl: portalEnv.PORTAL_DATABASE_URL,
  filename: portalEnv.PORTAL_DB_PATH,
  sendEmail: mailer.send,
  publicOrigin: portalEnv.PORTAL_PUBLIC_ORIGIN || 'http://localhost:' + port,
});
ready
  .then((credentials) => {
    if (credentials) {
      const fs = require('fs');
      const path = require('path');
      const file = path.join(__dirname, '../data/partner-admin-access.txt');
      fs.writeFileSync(
        file,
        'Céges belépés: http://localhost:' +
          port +
          '/partner-admin/\nFelhasználónév: ' +
          credentials.username +
          '\nJelszó: ' +
          credentials.password +
          '\n',
      );
      console.log('Admin credentials saved to data/partner-admin-access.txt');
    }
    const server = app.listen(port, '127.0.0.1', () => {
      console.log('Kebpro partner preview: http://localhost:' + port + '/partner/');
      console.log('Local preview. Push is simulated; requested password-reset emails use SMTP.');
    });
    server.on('error', (err) => {
      console.error(err.message);
      process.exit(1);
    });
    const worker = require('../portal/worker').createWorker({
      store,
      backupDirectory:
        portalEnv.PORTAL_BACKUP_DIR || require('path').join(__dirname, '../data/backups'),
      live: portalEnv.PORTAL_PUSH_LIVE === 'true',
      subject: portalEnv.PORTAL_VAPID_SUBJECT,
      origin: portalEnv.PORTAL_PUBLIC_ORIGIN,
    });
    worker.tick().catch((err) => console.error('Worker:', err.message));
    const timer = setInterval(
      () => worker.tick().catch((err) => console.error('Reminder:', err.message)),
      60000,
    );
    timer.unref();
    const shutdown = () => {
      clearInterval(timer);
      server.close(() =>
        worker
          .idle()
          .catch(() => {})
          .then(() => store.close())
          .then(() => process.exit(0)),
      );
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch(() => {
    console.error('Portal startup failed. Check storage and private configuration.');
    process.exit(1);
  });
