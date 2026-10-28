// Explicitly enabled, password-protected staging. Never reuse the website database.
const auth = require('./auth');

function stagingConfig(env = process.env) {
  if (env.PORTAL_STAGING_ENABLED !== 'true') return null;
  if (!env.PORTAL_DATABASE_URL) throw Error('PORTAL_DATABASE_URL is required');
  const database = new URL(env.PORTAL_DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname || !database.pathname || database.pathname === '/') throw Error('Invalid staging database URL');
  if (env.DATABASE_URL) {
    const website = new URL(env.DATABASE_URL);
    // Also reject matching database names on aliases such as localhost and 127.0.0.1.
    if (website.pathname === database.pathname) throw Error('The staging database must differ from the website database');
  }
  const origin = new URL(env.PORTAL_PUBLIC_ORIGIN || '');
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw Error('PORTAL_PUBLIC_ORIGIN must be an HTTPS origin');
  const username = env.PORTAL_TEST_USER || '';
  const password = env.PORTAL_TEST_PASSWORD || '';
  if (!/^[a-zA-Z0-9._-]{4,64}$/.test(username) || password.length < 24 || password.length > 128 || password.includes(':')) throw Error('Staging access credentials are missing or invalid');
  const supplied = [env.PORTAL_BOOTSTRAP_USER, env.PORTAL_BOOTSTRAP_PASSWORD, env.PORTAL_BOOTSTRAP_EMAIL];
  let adminCredentials;
  if (supplied.some(Boolean)) {
    if (!supplied.every(Boolean) || supplied[1].length < 16) throw Error('All bootstrap credentials are required, with a password of at least 16 characters');
    adminCredentials = {username: auth.username(supplied[0]), password: supplied[1], email: auth.emailAddress(supplied[2])};
  }
  return { databaseUrl: env.PORTAL_DATABASE_URL, publicOrigin: origin.origin, staging: {username, password}, adminCredentials, monitorToken: env.PORTAL_MONITOR_TOKEN };
}

function createStaging(config, { createApp = require('./app').createPortalApp, mailer = require('./mailer').createPortalMailer() } = {}) {
  if (!config) return null;
  if (!mailer.configured) throw Error('SMTP must be configured for staging');
  return createApp({...config, sendEmail: mailer.send});
}

module.exports = {stagingConfig, createStaging};
