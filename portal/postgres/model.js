// Fixed identifiers only: no SQL identifier comes from a request or environment.
const collections = {
  users: 'users',
  partners: 'partners',
  products: 'products',
  routes: 'routes',
  responses: 'orders',
  sessions: 'sessions',
  subscriptions: 'subscriptions',
  outbox: 'notifications',
  news: 'news',
  passwordResets: 'password_resets',
  staffInvitations: 'staff_invitations',
  auditLog: 'audit_events',
  complaintPhotos: 'complaint_photos',
};
const crypto = require('node:crypto');
function key(collection, row) {
  const value =
    collection === 'sessions' || collection === 'passwordResets'
      ? row.hash
      : collection === 'subscriptions'
        ? crypto.createHash('sha256').update(row.endpoint).digest('hex')
        : row.id;
  if (typeof value !== 'string' || !value) throw Error('Missing record key: ' + collection);
  return value;
}
function split(state) {
  const records = {};
  for (const [name, table] of Object.entries(collections)) {
    records[table] = new Map();
    for (const [position, row] of (state[name] || []).entries()) {
      const id = key(name, row);
      if (records[table].has(id)) throw Error('Duplicate record key: ' + name);
      records[table].set(id, { position, body: JSON.stringify(row) });
    }
  }
  const metadata = {};
  for (const [k, v] of Object.entries(state)) if (!collections[k]) metadata[k] = v;
  return { records, metadata };
}
function emptyState() {
  const state = require('../domain').seed();
  require('../migrations').migrateDailyRoutes(state);
  state.partners = [];
  state.news = [];
  state.users = [];
  delete state.authVersion;
  return state;
}
module.exports = { collections, key, split, emptyState };
