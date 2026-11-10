const { AsyncLocalStorage } = require('node:async_hooks');
const crypto = require('node:crypto');
const context = new AsyncLocalStorage();
const fields = {
  products: ['name', 'active', 'prices', 'promotions'],
  routes: ['name', 'days', 'reminder', 'cutoff', 'reschedules', 'trackingRadiusKm'],
  partners: ['name', 'address', 'routeId', 'routeIds', 'prices'],
  responses: ['status', 'archivedAt', 'archivedBy', 'revision', 'date', 'routeId'],
  news: ['title', 'body', 'kind'],
  users: ['username', 'role', 'status', 'partnerId'],
  staffInvitations: ['email', 'status', 'invitedBy'],
  trackingVehicles: ['label', 'licensePlate'],
  trackingAssignments: ['routeId', 'date', 'vehicleId'],
};
function snapshot(state) {
  const result = {};
  for (const [collection, keys] of Object.entries(fields))
    result[collection] = (state[collection] || []).map((item) =>
      Object.fromEntries(
        ['id', ...keys].filter((k) => item[k] !== undefined).map((k) => [k, item[k]]),
      ),
    );
  result.trackingAddressChecks = (state.responses || []).filter((r) => r.trackingAddress?.verified).map((r) => ({
    id: r.id, verified: true, verificationId: r.trackingAddress.verificationId || null,
    addressMatches: r.trackingAddress.address === r.address,
  }));
  result.trackingPartnerAddressChecks = (state.partners || []).flatMap((p) => (p.trackingAddresses || []).map((a) => ({
    id: p.id + ':' + crypto.createHash('sha256').update(String(a.address || '')).digest('hex'),
    partnerId: p.id, verified: !!a.verified, verificationId: a.verificationId || null,
  })));
  result.complaints = (state.partners || []).flatMap((p) =>
    (p.complaints || []).map((c) => ({
      id: c.id,
      partnerId: p.id,
      status: c.status,
      updatedAt: c.updatedAt || null,
      updatedBy: c.updatedBy || null,
      hasReply: !!c.reply,
    })),
  );
  return JSON.parse(JSON.stringify(result));
}
function record(state, before, actor) {
  const after = snapshot(state),
    changes = [];
  for (const collection of [...Object.keys(fields), 'complaints', 'trackingAddressChecks', 'trackingPartnerAddressChecks']) {
    const old = new Map(before[collection].map((x) => [x.id, x]));
    for (const item of after[collection]) {
      const prev = old.get(item.id);
      if (JSON.stringify(prev) !== JSON.stringify(item))
        changes.push({ collection, id: item.id, before: prev || null, after: item });
      old.delete(item.id);
    }
    for (const item of old.values())
      changes.push({ collection, id: item.id, before: item, after: null });
  }
  if (changes.length)
    (state.auditLog ||= []).push({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.username,
      action: actor.action,
      changes,
    });
}
function setAccountStatus(state, input, actorId) {
  const { assert } = require('./domain');
  const actor = state.users.find(
    (u) => u.id === actorId && u.role === 'staff' && u.status === 'approved',
  );
  assert(actor, 'Nincs jogosultság.', 403);
  const user = state.users.find((u) => u.id === input.id);
  assert(user && ['approved', 'disabled'].includes(user.status), 'Ez a fiók nem módosítható.', 400);
  assert(['approved', 'disabled'].includes(input.status), 'Érvénytelen állapot.');
  assert(user.id !== actorId, 'A saját fiókodat nem tilthatod le.', 409);
  if (user.role === 'staff' && input.status === 'disabled')
    assert(
      state.users.filter((u) => u.role === 'staff' && u.status === 'approved').length > 1,
      'Az utolsó aktív admin nem tiltható le.',
      409,
    );
  user.status = input.status;
  if (input.status === 'disabled') {
    state.sessions = state.sessions.filter((s) => s.userId !== user.id);
    state.passwordResets = (state.passwordResets || []).filter((s) => s.userId !== user.id);
    for (const invite of state.staffInvitations || [])
      if (invite.invitedBy === user.id && ['pending', 'sending'].includes(invite.status)) {
        invite.status = 'revoked';
        delete invite.hash;
      }
    if (user.role === 'staff') {
      state.subscriptions = state.subscriptions.filter((s) => s.staffUserId !== user.id);
      for (const message of state.outbox)
        if (message.staffUserId === user.id && message.status === 'pending')
          message.status = 'cancelled';
    }
    if (user.partnerId) {
      state.subscriptions = state.subscriptions.filter((s) => s.partnerId !== user.partnerId);
      for (const message of state.outbox)
        if (message.partnerId === user.partnerId && message.status === 'pending')
          message.status = 'cancelled';
    }
  }
}
module.exports = { context, snapshot, record, setAccountStatus };
