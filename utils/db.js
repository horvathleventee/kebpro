const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "kebpro.sqlite");
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        return reject(err);
      }
      return resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      return resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        return reject(err);
      }
      return resolve(row);
    });
  });
}

async function initDb() {
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
    [process.env.NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL || "info@kebpro.hu", process.env.ENABLE_EMAIL === "true" ? 1 : 0]
  );
}

async function insertSubmission(payload) {
  const sql = `
    INSERT INTO submissions
      (type, name, email, phone, company, product, quantity, address, requested_date, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await run(sql, [
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
  ]);

  return result.lastID;
}

async function listSubmissions(type = "all") {
  const params = [];
  let whereClause = "";

  if (type !== "all") {
    whereClause = "WHERE type = ?";
    params.push(type);
  }

  const sql = `
    SELECT id, type, name, email, phone, company, product, quantity, address, requested_date, message, created_at
    FROM submissions
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT 300
  `;

  return all(sql, params);
}

async function getNotificationSettings() {
  const row = await get("SELECT notification_email, email_enabled FROM app_settings WHERE id = 1");
  return {
    notificationEmail: row?.notification_email || process.env.NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL,
    emailEnabled: Boolean(row?.email_enabled),
  };
}

async function updateNotificationEmail(email) {
  await run("UPDATE app_settings SET notification_email = ? WHERE id = 1", [email]);
}

async function setEmailEnabled(enabled) {
  await run("UPDATE app_settings SET email_enabled = ? WHERE id = 1", [enabled ? 1 : 0]);
}

module.exports = {
  initDb,
  insertSubmission,
  listSubmissions,
  getNotificationSettings,
  updateNotificationEmail,
  setEmailEnabled,
};
