const { collections } = require('./model');
async function migrate(client) {
  await client.query('CREATE SCHEMA IF NOT EXISTS kebpro_portal');
  await client.query(
    'CREATE TABLE IF NOT EXISTS kebpro_portal.schema_version (version integer PRIMARY KEY, installed_at timestamptz NOT NULL DEFAULT now())',
  );
  const v = await client.query('SELECT max(version) AS version FROM kebpro_portal.schema_version');
  if (Number(v.rows[0].version || 0) > 4)
    throw Error('Portal schema is newer than this application');
  if (Number(v.rows[0].version || 0) === 4) return;
  if (Number(v.rows[0].version || 0) < 1) {
    await client.query(
      'CREATE TABLE kebpro_portal.metadata (key text PRIMARY KEY, body jsonb NOT NULL)',
    );
    for (const table of Object.values(collections))
      await client.query(
        `CREATE TABLE kebpro_portal.${table} (id text PRIMARY KEY, position integer NOT NULL, body jsonb NOT NULL CHECK(jsonb_typeof(body)='object'))`,
      );
    await client.query(
      "CREATE UNIQUE INDEX users_username_unique ON kebpro_portal.users ((body->>'username'))",
    );
    await client.query(
      "CREATE UNIQUE INDEX users_role_email_unique ON kebpro_portal.users ((body->>'role'), (body->>'email')) WHERE body->>'email' IS NOT NULL AND body->>'email' <> ''",
    );
    await client.query(
      "CREATE UNIQUE INDEX order_partner_day_unique ON kebpro_portal.orders ((body->>'partnerId'), (body->>'date'))",
    );
    await client.query(
      "CREATE INDEX order_delivery_date ON kebpro_portal.orders ((body->>'date'))",
    );
    await client.query(
      "CREATE INDEX session_user_id_idx ON kebpro_portal.sessions ((body->>'userId'))",
    );
    await client.query(
      "CREATE INDEX notification_status ON kebpro_portal.notifications ((body->>'status'))",
    );
    await client.query(
      "CREATE UNIQUE INDEX notification_partner_key ON kebpro_portal.notifications ((body->>'partnerId'), (body->>'key'))",
    );
    await client.query("CREATE INDEX audit_at ON kebpro_portal.audit_events ((body->>'at'))");
    await client.query('INSERT INTO kebpro_portal.schema_version(version) VALUES(1)');
  }
  if (Number(v.rows[0].version || 0) < 2) {
    await client.query(
      "CREATE INDEX order_created_page_idx ON kebpro_portal.orders ((body->>'createdAt') DESC,id DESC)",
    );
    await client.query(
      "CREATE INDEX order_partner_created_page_idx ON kebpro_portal.orders ((body->>'partnerId'),(body->>'createdAt') DESC,id DESC)",
    );
    await client.query(
      "CREATE INDEX order_archive_page_idx ON kebpro_portal.orders ((body->>'archivedAt') DESC,id DESC)",
    );
    await client.query('INSERT INTO kebpro_portal.schema_version(version) VALUES(2)');
  }
  if (Number(v.rows[0].version || 0) < 3) {
    await client.query(
      "CREATE TABLE IF NOT EXISTS kebpro_portal.complaint_photos (id text PRIMARY KEY, position integer NOT NULL, body jsonb NOT NULL CHECK(jsonb_typeof(body)='object'))",
    );
    await client.query('INSERT INTO kebpro_portal.schema_version(version) VALUES(3)');
  }
  await client.query('DROP INDEX kebpro_portal.order_partner_day_unique');
  await client.query(
    "CREATE UNIQUE INDEX order_partner_day_route_unique ON kebpro_portal.orders ((body->>'partnerId'), (body->>'date'), (COALESCE(body->>'routeId', '')))",
  );
  await client.query('INSERT INTO kebpro_portal.schema_version(version) VALUES(4)');
}
module.exports = { migrate };
