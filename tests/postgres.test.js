const test = require('node:test'),
  assert = require('node:assert/strict');
const { split, emptyState } = require('../portal/postgres/model');
const { createPostgresStore } = require('../portal/postgres/store');
test('Postgres mapping stores each entity separately, retains credentials as private metadata and detects duplicate keys', () => {
  const state = emptyState();
  state.sessions = [{ hash: 'session', userId: 'user', expires: 5 }];
  state.passwordResets = [{ hash: 'reset', userId: 'user' }];
  state.subscriptions = [{ endpoint: 'https://fcm.googleapis.com/1', partnerId: 'p' }];
  const s = split(state);
  assert.equal(s.records.sessions.size, 1);
  assert.equal(s.records.password_resets.size, 1);
  assert.equal(s.records.subscriptions.size, 1);
  assert.equal('sessions' in s.metadata, false);
  assert.ok(s.metadata.vapid.privateKey);
  assert.equal(state.partners.length, 0);
  state.sessions.push(state.sessions[0]);
  assert.throws(() => split(state), /Duplicate/);
});
test('Postgres startup failure is not silently replaced with SQLite and releases failed connection', async () => {
  const queries = [];
  let released = 0,
    ended = 0;
  const pool = {
    on() {},
    connect: async () => ({
      query: async (sql) => {
        queries.push(sql);
        if (sql === 'CREATE SCHEMA IF NOT EXISTS kebpro_portal')
          throw Error('database unavailable');
        return { rows: [] };
      },
      release() {
        released++;
      },
    }),
    end: async () => ended++,
  };
  const store = createPostgresStore({ pool });
  await assert.rejects(store.ready, /database unavailable/);
  assert.ok(queries.includes('ROLLBACK'));
  assert.equal(released, 1);
  await store.close();
  assert.equal(ended, 1);
});
// Opt-in only: dedicated empty database. Never use the existing website DATABASE_URL.
test(
  'Real PostgreSQL: roundtrip, restart, rollback, concurrent writers and record-level updates',
  { skip: !process.env.PORTAL_TEST_DATABASE_URL },
  async () => {
    const { Pool } = require('pg'),
      url = process.env.PORTAL_TEST_DATABASE_URL,
      admin = new Pool({ connectionString: url });
    const existing = await admin.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name='kebpro_portal'",
    );
    assert.equal(
      existing.rows.length,
      0,
      'Integration test requires a fresh database without kebpro_portal schema',
    );
    const first = createPostgresStore({ connectionString: url }),
      second = createPostgresStore({ connectionString: url });
    try {
      await Promise.all([first.ready, second.ready]);
      // Simulate an existing v3 installation and verify that migration keeps its orders.
      await first.change((s) => {
        s.responses.push({
          id: 'migration-order',
          partnerId: 'migration-partner',
          routeId: 'a',
          date: '2026-11-02',
          kind: 'order',
          items: [],
          createdAt: '2026-10-01T10:00:00Z',
        });
      });
      const migrationClient = await admin.connect();
      try {
        await migrationClient.query('BEGIN');
        await migrationClient.query('DROP INDEX kebpro_portal.order_partner_day_route_unique');
        await migrationClient.query(
          "CREATE UNIQUE INDEX order_partner_day_unique ON kebpro_portal.orders ((body->>'partnerId'), (body->>'date'))",
        );
        await migrationClient.query('DELETE FROM kebpro_portal.schema_version WHERE version=4');
        await require('../portal/postgres/schema').migrate(migrationClient);
        await migrationClient.query('COMMIT');
      } catch (error) {
        await migrationClient.query('ROLLBACK');
        throw error;
      } finally {
        migrationClient.release();
      }
      await first.change((s) => {
        s.responses.push({
          id: 'migration-order-2',
          partnerId: 'migration-partner',
          routeId: 'b',
          date: '2026-11-02',
          kind: 'order',
          items: [],
          createdAt: '2026-10-01T10:00:00Z',
        });
      });
      assert.equal(
        (await first.read()).responses.filter((r) => r.partnerId === 'migration-partner').length,
        2,
      );
      const migratedPage = await require('../portal/listing').sqlPage(
        admin,
        require('../portal/listing').options(),
      );
      assert.equal(migratedPage.rows.find((r) => r.id === 'migration-order').sameDayOrderCount, 2);
      await first.change((s) => {
        s.responses = [];
      });
      await first.change((s) => (s.counter = 0));
      await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          (i % 2 ? first : second).change((s) => {
            s.counter++;
          }),
        ),
      );
      assert.equal((await first.read()).counter, 8);
      await assert.rejects(
        first.change((s) => {
          s.counter = 999;
          throw Error('rollback');
        }),
      );
      assert.equal((await second.read()).counter, 8);
      const before = await admin.query(
        'SELECT id,xmin::text AS version FROM kebpro_portal.products ORDER BY id',
      );
      await first.change((s) => (s.operations = { lastTick: new Date().toISOString() }));
      const after = await admin.query(
        'SELECT id,xmin::text AS version FROM kebpro_portal.products ORDER BY id',
      );
      assert.deepEqual(after.rows, before.rows);
      const audit = require('../portal/audit');
      await first.change((s) => {
        s.users = [{ id: 'admin', username: 'admin', role: 'staff', status: 'approved' }];
      });
      await audit.context.run(
        { id: 'admin', username: 'admin', role: 'staff', action: 'routes' },
        () => first.change((s) => (s.routes[0].name = 'Updated')),
      );
      assert.equal((await second.read()).auditLog.length, 1);
      const listing = require('../portal/listing'),
        domain = require('../portal/domain');
      await first.change((s) => {
        s.partners.push({
          id: 'paging',
          name: 'Paging',
          routeId: 'route-1',
          preferences: { news: false },
        });
        s.responses = Array.from({ length: 61 }, (_, i) => ({
          id: String(i).padStart(3, '0'),
          partnerId: 'paging',
          partnerName: i === 0 ? 'Keresett' : 'Partner',
          kind: 'order',
          date: domain.addDays('2025-01-01', i),
          createdAt: '2026-10-01T10:00:00Z',
          items: [],
          ...(i < 30 ? { archivedAt: '2026-10-02T22:30:00Z' } : {}),
        }));
      });
      const whole = await first.read();
      for (const query of [
        { view: 'archived' },
        { view: 'archived', page: 2 },
        { view: 'archived', search: 'Keresett', sort: 'archivedAt', day: '2026-10-03' },
        { view: 'new', page: 99 },
      ]) {
        const options = listing.options(query),
          result = await first.readAdmin('2026-10-20', '2026-10-21', options);
        assert.deepEqual(result._orders, listing.select(whole.responses, options));
        assert.equal(result.responses.length, 0);
      }
      const history = await first.readPartner(
        'paging',
        listing.options({ page: 2 }, true),
        new Date('2026-10-20T10:00:00Z'),
      );
      assert.equal(history._history.rows.length, 25);
      assert.equal(history._history.pagination.total, 61);
      assert.equal(history.responses.length, 0);
      let complaintId;
      await first.change((s) => {
        domain.updatePrice(s, { productId: s.products[0].id, unit: 'kg', price: 1900 });
        domain.updatePrice(s, {
          productId: s.products[0].id,
          unit: 'kg',
          partnerId: 'paging',
          price: 1200,
        });
        complaintId = domain.submitComplaint(s, 'paging', {
          orderId: '000',
          message: 'Synthetic PostgreSQL complaint',
          requestId: domain.id(),
          photo: 'data:image/jpeg;base64,/9j/2Q==',
          labelPhoto: 'data:image/jpeg;base64,/9j/2Q==',
        }).id;
      });
      await audit.context.run(
        { id: 'admin', username: 'admin', role: 'staff', action: 'complaints' },
        () =>
          second.change((s) =>
            domain.updateComplaint(
              s,
              { id: complaintId, status: 'resolved', reply: 'Handled', expectedRevision: 1 },
              'admin',
            ),
          ),
      );
      const partnerState = await first.readPartner(
        'paging',
        listing.options({ page: 1 }, true),
        new Date('2026-10-20T10:00:00Z'),
      );
      const partnerView = domain.safePartner(
        partnerState,
        partnerState.partners[0],
        new Date('2026-10-20T10:00:00Z'),
        listing.options({ page: 1 }, true),
      );
      assert.equal(partnerView.products[0].prices.kg, 1200);
      assert.equal(partnerView.complaints[0].reply, 'Handled');
      assert.equal(partnerView.complaints[0].status, 'resolved');
      assert.ok(
        (await first.read()).auditLog.at(-1).changes.some((c) => c.collection === 'complaints'),
      );
      const complaintState = await first.read(),
        record = complaintState.partners.find((p) => p.id === 'paging').complaints[0];
      assert.ok(record.photoId && record.labelPhotoId);
      assert.ok(await first.lookupComplaintPhoto(record.photoId));
      assert.ok(await second.lookupComplaintPhoto(record.labelPhotoId));
      assert.match(
        require('../portal/complaint-export').exportComplaint(complaintState, record.id),
        /data:image\/jpeg;base64,/,
      );
      const removalTime = new Date('2026-12-01T12:00:00Z');
      await first.change((s) => {
        const c = s.partners.find((p) => p.id === 'paging').complaints[0];
        c.resolvedAt = new Date(removalTime.getTime() - 28 * 86400000).toISOString();
        s.operations = { backupAt: removalTime.toISOString() };
        require('../portal/retention').purge(s, removalTime);
      });
      assert.equal(await first.lookupComplaintPhoto(record.photoId), undefined);
      assert.equal(await first.lookupComplaintPhoto(record.labelPhotoId), undefined);
      assert.equal(
        (await first.read()).partners.find((p) => p.id === 'paging').complaints.length,
        0,
      );
      const legal = require('../portal/legal'),
        terms = legal.snapshot('terms'),
        privacy = legal.snapshot('privacy');
      const evidence = legal.verifyAcceptance({
        termsAccepted: true,
        termsVersion: terms.version,
        termsHash: terms.hash,
        privacyVersion: privacy.version,
        privacyHash: privacy.hash,
      });
      await require('../portal/auth').register(
        first,
        {
          username: 'policytest',
          email: 'policy@example.invalid',
          password: 'Password123',
          company: 'Test',
          contact: 'Test',
          phone: '123',
          address: 'Test',
        },
        evidence,
      );
      const policyUser = (await second.read()).users.find((u) => u.username === 'policytest');
      assert.equal(policyUser.termsAcceptance.terms.hash, terms.hash);
      assert.equal(policyUser.termsAcceptance.privacyDocument, evidence.privacyDocument);
      const friday = new Date('2026-10-30T09:00:00Z');
      await first.change((s) => {
        s.routes = [
          { id: 'sat', name: 'Szombat', days: [6] },
          { id: 'mon', name: 'Hétfő', days: [1] },
        ];
        s.partners.push({
          id: 'calltest',
          name: 'Hívandó',
          routeIds: ['sat', 'mon'],
          preferences: {},
        });
        s.responses.push({
          id: 'sat-answer',
          partnerId: 'calltest',
          date: '2026-10-31',
          kind: 'order',
          items: [],
          createdAt: friday.toISOString(),
        });
      });
      const callState = await first.readAdmin(
        '2026-11-03',
        '2026-10-31',
        listing.options({}),
        domain.callDeliveryDates(friday),
      );
      const callGroups = domain.callSchedule(callState, friday);
      assert.equal(callGroups.find((g) => g.date === '2026-10-31').routes[0].pending.length, 0);
      assert.equal(
        callGroups.find((g) => g.date === '2026-11-02').routes[0].pending[0].id,
        'calltest',
      );
      await assert.rejects(first.importEmpty(emptyState()), /empty/);
    } finally {
      await first.close();
      await second.close();
      await admin.query('DROP SCHEMA IF EXISTS kebpro_portal CASCADE');
      await admin.end();
    }
  },
);
