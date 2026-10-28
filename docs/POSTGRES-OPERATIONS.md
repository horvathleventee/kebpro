# PostgreSQL storage and operational monitoring

## Storage choice

The preview accepts `PORTAL_DATABASE_URL`. This is intentionally separate from the existing website's `DATABASE_URL`: no existing production database is opened automatically. Without the portal variable, local SQLite remains in use. With it, PostgreSQL must connect successfully; no silent SQLite fallback is allowed. The local-only and production startup guards remain: this change prepares storage, not a public deployment.

The dedicated `kebpro_portal` schema contains separate users, partners, products, routes, orders, sessions, subscriptions, notifications, news, reset tokens, invitations and audit tables. Each entity has its own primary key and JSONB payload; it is no longer one JSON document for the entire application. Versioned schema installation, uniqueness constraints for usernames, role/email pairs, partner/delivery-day orders and notification keys prevent duplicate logical records. The old SQLite file is unchanged.

Changes use a single PostgreSQL connection and transaction, acquire a transaction-scoped application lock, then persist only modified/added/deleted rows. Audit changes commit together with the business change. Multi-process writers therefore cannot overwrite each other's snapshots. PostgreSQL connection pool: maximum 5, connect timeout 5 seconds, statement timeout 15 seconds. API parameter values use SQL parameters. Fixed schema/table names cannot come from requests. TLS verification is not disabled.

**Transitional performance limit:** business mutation callbacks still load the full domain snapshot and writers are serialized by the application lock. This preserves existing business invariants during migration but is not a high-throughput final repository. Session authentication and partner reads now use targeted SQL; admin history still loads all orders. Before larger production traffic, move mutations to narrow SQL repositories, add admin pagination/retention, benchmark the actual expected data volume and concurrent ordering peak. This implementation does not claim that these remaining bottlenecks have been removed.

## Migration and rollback

1. Provision a dedicated PostgreSQL database and credentials. For first installation the role needs schema/table/index creation; production role separation is an additional deployment step.
2. Stop writes during the final cutover and create a verified backup with the existing backup module. Keep the original SQLite file and backup securely.
3. Set `PORTAL_DATABASE_URL` explicitly in the process environment. Example configuration: `docs/portal.env.example`. Do not paste passwords in chat or commit the real config. The preview, importer and monitor read only allowlisted portal variables from the ignored `.env.portal.local` file; process environment variables take precedence. They do not load the website DATABASE_URL.
4. Run `node scripts/partner-import-postgres.js PATH-TO-BACKUP.json`. Import requires an empty dedicated schema; it refuses to overwrite a populated target. Schema creation and data import are transactional. The importer compares users, partners and orders after reading them back.
5. Imported sessions/reset tokens and pending invitations are revoked; pending notifications are cancelled; push stays simulated. Users log in again. Start the preview with `PORTAL_DATABASE_URL`, verify order submission/modification/archiving, authorization and backup restore before cutover.
6. For rollback BEFORE accepting new PG orders, stop the app and return to the preserved SQLite configuration. AFTER accepting new PG orders, do not simply switch back: first reconcile/export the new data, otherwise those orders disappear.

A fresh PostgreSQL start does not seed fictional partners or sample news; the product catalogue and seven routes are prepared, and the existing secure admin bootstrap applies. Demo import deliberately retains imported sample data; production cutover must choose the intended actual dataset.

## Verification

`npm run test:partner` runs all existing tests, storage mapping/failure tests, monitoring tests and an opt-in real PG integration test. Set `PORTAL_TEST_DATABASE_URL` ONLY to a disposable database with no `kebpro_portal` schema. The test refuses an existing schema, creates its own schema, checks concurrent writes, rollback, audit atomicity and unchanged product row versions, then drops only that schema. Never point it at a live application database. Without that variable it is explicitly skipped, not reported as a successful PG integration test.

## Monitoring

Start `npm run partner:monitor` as an independently supervised process, ideally on a separate machine. It requires:

- `PORTAL_MONITOR_URL`: protected `/partner/health` endpoint.
- `PORTAL_MONITOR_TOKEN`: identical secret in the app and monitor, sent in a header, never in a URL.
- `PORTAL_ALERT_EMAIL`: explicit recipient. Empty = no automatic alert sending; monitor startup refuses missing configuration.
- `PORTAL_ALERTS_ENABLED=true`: explicit live-email activation. The saved local setting remains false during development.
- Existing SMTP settings and a private writable `PORTAL_MONITOR_STATE` file. Do not run two monitor processes sharing this state file.

The monitor probes once per minute with a 10-second timeout. It checks HTTP availability, database access, worker heartbeat (3 minutes), daily backup freshness (26 hours), terminal push failures in the last 24 hours and recent internal server errors. After 3 consecutive failed checks it sends an email. Repeated incidents are limited to once per hour; failed SMTP attempts retry after 5 minutes. Recovery email is sent once, subject to the send retry interval. Alert state persists separately from the app database, so a DB failure cannot prevent recording the incident. Messages include only category/time and operational instructions, no credentials or customer/order data.

The app health endpoint discloses only booleans and is hidden without the token. Local-only preview still blocks remote requests; external monitoring needs the eventual controlled HTTPS deployment/reverse proxy. The monitor must not depend on the monitored web process remaining alive. Its SMTP/network can also fail, and it cannot report its own machine's power loss: independent process supervision/external uptime monitoring is still required. Historical terminal push failures remain unhealthy until they age out of the 24-hour window; do not interpret recovery as guaranteed phone delivery.

Current JSON snapshots still work with either store. They are not PostgreSQL physical backups/PITR. Production requires provider-managed PG backups or `pg_dump` plus tested restore/offsite retention, in addition to these app snapshots.

## Local verification completed

The requested alert recipient has been stored in `.env.portal.local` (not in Git), along with a random monitor token and the local monitor URL. Live alerts remain disabled. `node scripts/partner-monitor.js --once --dry-run` successfully returned healthy HTTP/database/worker/backup/push/server checks against the running local preview. This command never sends email or modifies alert delivery state.

52 tests pass; 1 opt-in PostgreSQL integration test remains skipped because no PostgreSQL server is available. A Docker Desktop launch was attempted but no engine became available. Provision a disposable PG database, run the integration test, then perform the documented verified import before declaring PostgreSQL cutover complete.
