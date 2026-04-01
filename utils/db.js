const path = require("path");
const fs = require("fs");

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "";

const adapter =
  process.env.DB_ADAPTER ||
  (connectionString ? "postgres" : process.env.VERCEL ? "memory" : "sqlite");

let sqlite;
let db;
let Pool;
let pool;
let submissionsMemory = [];
let settingsMemory = {
  notificationEmail:
    process.env.NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL || "info@kebpro.hu",
  emailEnabled: process.env.ENABLE_EMAIL === "true",
};

if (adapter === "sqlite") {
  sqlite = require("sqlite3").verbose();
  const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "kebpro.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new sqlite.Database(dbPath);
}

if (adapter === "postgres") {
  ({ Pool } = require("pg"));
  const sslEnabled = !/(localhost|127\.0\.0\.1)/i.test(connectionString);
  pool = new Pool({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      return resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      return resolve(row);
    });
  });
}

async function initDb() {
  if (adapter === "memory") return;

  if (adapter === "postgres") {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        company TEXT NOT NULL,
        product TEXT NOT NULL,
        quantity TEXT,
        address TEXT,
        requested_date TEXT,
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE submissions
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY,
        notification_email TEXT NOT NULL,
        email_enabled BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);

    await pool.query(
      `
        INSERT INTO app_settings (id, notification_email, email_enabled)
        VALUES (1, $1, $2)
        ON CONFLICT (id)
        DO NOTHING
      `,
      [
        process.env.NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL || "info@kebpro.hu",
        process.env.ENABLE_EMAIL === "true",
      ]
    );

    return;
  }

  await run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      company TEXT NOT NULL,
      product TEXT NOT NULL,
      quantity TEXT,
      address TEXT,
      requested_date TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`ALTER TABLE submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'new'`).catch(() => {});

  await run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      notification_email TEXT NOT NULL,
      email_enabled INTEGER NOT NULL DEFAULT 0
    )
  `);

  await run(
    `
      INSERT OR IGNORE INTO app_settings (id, notification_email, email_enabled)
      VALUES (1, ?, ?)
    `,
    [
      process.env.NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL || "info@kebpro.hu",
      process.env.ENABLE_EMAIL === "true" ? 1 : 0,
    ]
  );
}

async function insertSubmission(payload) {
  if (adapter === "memory") {
    const id = submissionsMemory.length + 1;
    submissionsMemory.unshift({
      id,
      type: payload.type,
      status: "new",
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      company: payload.company,
      product: payload.product,
      quantity: payload.quantity || "",
      address: payload.address || "",
      requested_date: payload.requestedDate || "",
      message: payload.message || "",
      created_at: new Date().toISOString(),
    });
    return id;
  }

  if (adapter === "postgres") {
    const result = await pool.query(
      `
        INSERT INTO submissions
          (type, status, name, email, phone, company, product, quantity, address, requested_date, message)
        VALUES ($1, 'new', $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `,
      [
        payload.type,
        payload.name,
        payload.email,
        payload.phone,
        payload.company,
        payload.product,
        payload.quantity || "",
        payload.address || "",
        payload.requestedDate || "",
        payload.message || "",
      ]
    );

    return result.rows[0]?.id;
  }

  const result = await run(
    `
      INSERT INTO submissions
        (type, status, name, email, phone, company, product, quantity, address, requested_date, message)
      VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.type,
      payload.name,
      payload.email,
      payload.phone,
      payload.company,
      payload.product,
      payload.quantity || "",
      payload.address || "",
      payload.requestedDate || "",
      payload.message || "",
    ]
  );

  return result.lastID;
}

async function listSubmissions(type = "all") {
  if (adapter === "memory") {
    if (type === "all") return submissionsMemory.slice(0, 300);
    return submissionsMemory.filter((row) => row.type === type).slice(0, 300);
  }

  if (adapter === "postgres") {
    if (type === "all") {
      const result = await pool.query(
        `
          SELECT id, type, status, name, email, phone, company, product, quantity, address, requested_date, message, created_at
          FROM submissions
          ORDER BY created_at DESC, id DESC
          LIMIT 300
        `
      );
      return result.rows;
    }

    const result = await pool.query(
      `
        SELECT id, type, status, name, email, phone, company, product, quantity, address, requested_date, message, created_at
        FROM submissions
        WHERE type = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 300
      `,
      [type]
    );
    return result.rows;
  }

  const params = [];
  let whereClause = "";

  if (type !== "all") {
    whereClause = "WHERE type = ?";
    params.push(type);
  }

  return all(
    `
      SELECT id, type, status, name, email, phone, company, product, quantity, address, requested_date, message, created_at
      FROM submissions
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT 300
    `,
    params
  );
}

async function getNotificationSettings() {
  if (adapter === "memory") return { ...settingsMemory };

  if (adapter === "postgres") {
    const result = await pool.query(
      "SELECT notification_email, email_enabled FROM app_settings WHERE id = 1"
    );
    const row = result.rows[0];
    return {
      notificationEmail:
        row?.notification_email || process.env.NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL,
      emailEnabled: Boolean(row?.email_enabled),
    };
  }

  const row = await get("SELECT notification_email, email_enabled FROM app_settings WHERE id = 1");
  return {
    notificationEmail:
      row?.notification_email || process.env.NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL,
    emailEnabled: Boolean(row?.email_enabled),
  };
}

async function updateNotificationEmail(email) {
  if (adapter === "memory") {
    settingsMemory.notificationEmail = email;
    return;
  }

  if (adapter === "postgres") {
    await pool.query("UPDATE app_settings SET notification_email = $1 WHERE id = 1", [email]);
    return;
  }

  await run("UPDATE app_settings SET notification_email = ? WHERE id = 1", [email]);
}

async function setEmailEnabled(enabled) {
  if (adapter === "memory") {
    settingsMemory.emailEnabled = Boolean(enabled);
    return;
  }

  if (adapter === "postgres") {
    await pool.query("UPDATE app_settings SET email_enabled = $1 WHERE id = 1", [Boolean(enabled)]);
    return;
  }

  await run("UPDATE app_settings SET email_enabled = ? WHERE id = 1", [enabled ? 1 : 0]);
}

async function updateSubmissionStatus(id, status) {
  if (adapter === "memory") {
    submissionsMemory = submissionsMemory.map((row) =>
      Number(row.id) === Number(id) ? { ...row, status } : row
    );
    return;
  }

  if (adapter === "postgres") {
    await pool.query("UPDATE submissions SET status = $1 WHERE id = $2", [status, id]);
    return;
  }

  await run("UPDATE submissions SET status = ? WHERE id = ?", [status, id]);
}

module.exports = {
  initDb,
  insertSubmission,
  listSubmissions,
  getNotificationSettings,
  updateNotificationEmail,
  setEmailEnabled,
  updateSubmissionStatus,
  adapter,
};
