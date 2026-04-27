const path = require("path");
const fs = require("fs");

function cleanEnv(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['\"]|['\"]$/g, "");
}

const envAdapter = cleanEnv(process.env.DB_ADAPTER).toLowerCase();
const connectionString =
  cleanEnv(process.env.DATABASE_URL) ||
  cleanEnv(process.env.POSTGRES_URL) ||
  cleanEnv(process.env.POSTGRES_PRISMA_URL) ||
  "";

const adapter =
  envAdapter ||
  (connectionString ? "postgres" : process.env.VERCEL ? "memory" : "sqlite");

let sqlite;
let db;
let Pool;
let pool;
let dbInitError = null;
let submissionsMemory = [];
let positionsMemory = [];
let careerApplicationsMemory = [];
let settingsMemory = {
  notificationEmail:
    process.env.NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL || "info@kebpro.hu",
  emailEnabled: process.env.ENABLE_EMAIL === "true",
  careerNotificationEmail:
    process.env.CAREER_NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL || "info@kebpro.hu",
  careerEmailEnabled: process.env.ENABLE_CAREER_EMAIL === "true",
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

  try {
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
          company_headquarters TEXT,
          tax_number TEXT,
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
      await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS company_headquarters TEXT`);
      await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tax_number TEXT`);

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

      await pool.query(`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS career_notification_email TEXT NOT NULL DEFAULT 'info@kebpro.hu'`);
      await pool.query(`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS career_email_enabled BOOLEAN NOT NULL DEFAULT FALSE`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS positions (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          location TEXT,
          type TEXT,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS career_applications (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          motivation TEXT,
          position_id INTEGER REFERENCES positions(id),
          cv_filename TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      dbInitError = null;
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
        company_headquarters TEXT,
        tax_number TEXT,
        product TEXT NOT NULL,
        quantity TEXT,
        address TEXT,
        requested_date TEXT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`ALTER TABLE submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'new'`).catch(() => {});
    await run(`ALTER TABLE submissions ADD COLUMN company_headquarters TEXT`).catch(() => {});
    await run(`ALTER TABLE submissions ADD COLUMN tax_number TEXT`).catch(() => {});

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

    await run(`ALTER TABLE app_settings ADD COLUMN career_notification_email TEXT NOT NULL DEFAULT 'info@kebpro.hu'`).catch(() => {});
    await run(`ALTER TABLE app_settings ADD COLUMN career_email_enabled INTEGER NOT NULL DEFAULT 0`).catch(() => {});

    await run(`
      CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        type TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS career_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        motivation TEXT,
        position_id INTEGER REFERENCES positions(id),
        cv_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    dbInitError = null;
  } catch (error) {
    dbInitError = error;
    throw error;
  }
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
      company_headquarters: payload.companyHeadquarters || "",
      tax_number: payload.taxNumber || "",
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
          (type, status, name, email, phone, company, company_headquarters, tax_number, product, quantity, address, requested_date, message)
        VALUES ($1, 'new', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `,
      [
        payload.type,
        payload.name,
        payload.email,
        payload.phone,
        payload.company,
        payload.companyHeadquarters || "",
        payload.taxNumber || "",
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
        (type, status, name, email, phone, company, company_headquarters, tax_number, product, quantity, address, requested_date, message)
      VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.type,
      payload.name,
      payload.email,
      payload.phone,
      payload.company,
      payload.companyHeadquarters || "",
      payload.taxNumber || "",
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
  const isCallbackLike = (row) =>
    row.type === "callback" ||
    /visszahív|visszahiv|callback|telefon/i.test(`${row.product || ""} ${row.message || ""}`);

  if (adapter === "memory") {
    if (type === "all") return submissionsMemory.slice(0, 300);
    if (type === "callback") return submissionsMemory.filter(isCallbackLike).slice(0, 300);
    if (type === "quote") {
      return submissionsMemory
        .filter((row) => row.type === "quote" && !isCallbackLike(row))
        .slice(0, 300);
    }
    return submissionsMemory.filter((row) => row.type === type).slice(0, 300);
  }

  if (adapter === "postgres") {
    if (type === "all") {
      const result = await pool.query(
        `
          SELECT id, type, status, name, email, phone, company, company_headquarters, tax_number, product, quantity, address, requested_date, message, created_at
          FROM submissions
          ORDER BY created_at DESC, id DESC
          LIMIT 300
        `
      );
      return result.rows;
    }

    if (type === "callback") {
      const result = await pool.query(
        `
          SELECT id, type, status, name, email, phone, company, company_headquarters, tax_number, product, quantity, address, requested_date, message, created_at
          FROM submissions
          WHERE type = 'callback'
             OR CONCAT(COALESCE(product, ''), ' ', COALESCE(message, '')) ~* 'visszahív|visszahiv|callback|telefon'
          ORDER BY created_at DESC, id DESC
          LIMIT 300
        `
      );
      return result.rows;
    }

    if (type === "quote") {
      const result = await pool.query(
        `
          SELECT id, type, status, name, email, phone, company, company_headquarters, tax_number, product, quantity, address, requested_date, message, created_at
          FROM submissions
          WHERE type = 'quote'
            AND CONCAT(COALESCE(product, ''), ' ', COALESCE(message, '')) !~* 'visszahív|visszahiv|callback|telefon'
          ORDER BY created_at DESC, id DESC
          LIMIT 300
        `
      );
      return result.rows;
    }

    const result = await pool.query(
      `
        SELECT id, type, status, name, email, phone, company, company_headquarters, tax_number, product, quantity, address, requested_date, message, created_at
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

  if (type === "callback") {
    whereClause = "WHERE type = 'callback' OR LOWER(COALESCE(product, '') || ' ' || COALESCE(message, '')) LIKE '%visszahív%' OR LOWER(COALESCE(product, '') || ' ' || COALESCE(message, '')) LIKE '%visszahiv%' OR LOWER(COALESCE(product, '') || ' ' || COALESCE(message, '')) LIKE '%callback%' OR LOWER(COALESCE(product, '') || ' ' || COALESCE(message, '')) LIKE '%telefon%'";
  } else if (type === "quote") {
    whereClause = "WHERE type = 'quote' AND LOWER(COALESCE(product, '') || ' ' || COALESCE(message, '')) NOT LIKE '%visszahív%' AND LOWER(COALESCE(product, '') || ' ' || COALESCE(message, '')) NOT LIKE '%visszahiv%' AND LOWER(COALESCE(product, '') || ' ' || COALESCE(message, '')) NOT LIKE '%callback%' AND LOWER(COALESCE(product, '') || ' ' || COALESCE(message, '')) NOT LIKE '%telefon%'";
  } else if (type !== "all") {
    whereClause = "WHERE type = ?";
    params.push(type);
  }

  return all(
    `
      SELECT id, type, status, name, email, phone, company, company_headquarters, tax_number, product, quantity, address, requested_date, message, created_at
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
      "SELECT notification_email, email_enabled, career_notification_email, career_email_enabled FROM app_settings WHERE id = 1"
    );
    const row = result.rows[0];
    return {
      notificationEmail:
        row?.notification_email || process.env.NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL,
      emailEnabled: Boolean(row?.email_enabled),
      careerNotificationEmail:
        row?.career_notification_email || process.env.CAREER_NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL,
      careerEmailEnabled: Boolean(row?.career_email_enabled),
    };
  }

  const row = await get("SELECT notification_email, email_enabled, career_notification_email, career_email_enabled FROM app_settings WHERE id = 1");
  return {
    notificationEmail:
      row?.notification_email || process.env.NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL,
    emailEnabled: Boolean(row?.email_enabled),
    careerNotificationEmail:
      row?.career_notification_email || process.env.CAREER_NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL,
    careerEmailEnabled: Boolean(row?.career_email_enabled),
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

async function updateCareerNotificationEmail(email) {
  if (adapter === "memory") {
    settingsMemory.careerNotificationEmail = email;
    return;
  }

  if (adapter === "postgres") {
    await pool.query("UPDATE app_settings SET career_notification_email = $1 WHERE id = 1", [email]);
    return;
  }

  await run("UPDATE app_settings SET career_notification_email = ? WHERE id = 1", [email]);
}

async function setCareerEmailEnabled(enabled) {
  if (adapter === "memory") {
    settingsMemory.careerEmailEnabled = Boolean(enabled);
    return;
  }

  if (adapter === "postgres") {
    await pool.query("UPDATE app_settings SET career_email_enabled = $1 WHERE id = 1", [Boolean(enabled)]);
    return;
  }

  await run("UPDATE app_settings SET career_email_enabled = ? WHERE id = 1", [enabled ? 1 : 0]);
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

async function getDbDiagnostics() {
  const diagnostics = {
    adapter,
    envAdapter,
    configured: Boolean(connectionString) || adapter !== "postgres",
    connectionStringPresent: Boolean(connectionString),
    initError: dbInitError ? dbInitError.message || String(dbInitError) : null,
    writableStore:
      adapter === "postgres" ? "persistent" : adapter === "sqlite" ? "local file" : "memory only",
    submissionCount: 0,
    lastWriteAt: null,
  };

  if (adapter === "memory") {
    diagnostics.submissionCount = submissionsMemory.length;
    diagnostics.lastWriteAt = submissionsMemory[0]?.created_at || null;
    return diagnostics;
  }

  try {
    if (adapter === "postgres") {
      const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM submissions");
      const lastResult = await pool.query(
        "SELECT created_at FROM submissions ORDER BY created_at DESC, id DESC LIMIT 1"
      );

      diagnostics.submissionCount = countResult.rows[0]?.count || 0;
      diagnostics.lastWriteAt = lastResult.rows[0]?.created_at || null;
      return diagnostics;
    }

    const countRow = await get("SELECT COUNT(*) AS count FROM submissions");
    const lastRow = await get(
      "SELECT created_at FROM submissions ORDER BY created_at DESC, id DESC LIMIT 1"
    );

    diagnostics.submissionCount = countRow?.count || 0;
    diagnostics.lastWriteAt = lastRow?.created_at || null;
    return diagnostics;
  } catch (error) {
    diagnostics.initError = error.message || String(error);
    return diagnostics;
  }
}

/* ── Positions (career) ── */

async function listPositions(activeOnly = false) {
  if (adapter === "memory") {
    if (activeOnly) return positionsMemory.filter((p) => p.active);
    return positionsMemory;
  }

  if (adapter === "postgres") {
    const where = activeOnly ? "WHERE active = TRUE" : "";
    const result = await pool.query(
      `SELECT id, title, description, location, type, active, created_at FROM positions ${where} ORDER BY created_at DESC`
    );
    return result.rows;
  }

  const where = activeOnly ? "WHERE active = 1" : "";
  return all(`SELECT id, title, description, location, type, active, created_at FROM positions ${where} ORDER BY created_at DESC`);
}

async function addPosition(payload) {
  if (adapter === "memory") {
    const id = positionsMemory.length + 1;
    positionsMemory.unshift({
      id,
      title: payload.title,
      description: payload.description || "",
      location: payload.location || "",
      type: payload.type || "",
      active: 1,
      created_at: new Date().toISOString(),
    });
    return id;
  }

  if (adapter === "postgres") {
    const result = await pool.query(
      `INSERT INTO positions (title, description, location, type) VALUES ($1, $2, $3, $4) RETURNING id`,
      [payload.title, payload.description || "", payload.location || "", payload.type || ""]
    );
    return result.rows[0]?.id;
  }

  const result = await run(
    `INSERT INTO positions (title, description, location, type) VALUES (?, ?, ?, ?)`,
    [payload.title, payload.description || "", payload.location || "", payload.type || ""]
  );
  return result.lastID;
}

async function deletePosition(id) {
  if (adapter === "memory") {
    positionsMemory = positionsMemory.filter((p) => Number(p.id) !== Number(id));
    careerApplicationsMemory = careerApplicationsMemory.map((a) =>
      Number(a.position_id) === Number(id) ? { ...a, position_id: null } : a
    );
    return;
  }

  if (adapter === "postgres") {
    await pool.query("UPDATE career_applications SET position_id = NULL WHERE position_id = $1", [id]);
    await pool.query("DELETE FROM positions WHERE id = $1", [id]);
    return;
  }

  await run("UPDATE career_applications SET position_id = NULL WHERE position_id = ?", [id]);
  await run("DELETE FROM positions WHERE id = ?", [id]);
}

/* ── Career applications ── */

async function insertCareerApplication(payload) {
  if (adapter === "memory") {
    const id = careerApplicationsMemory.length + 1;
    careerApplicationsMemory.unshift({
      id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      motivation: payload.motivation || "",
      position_id: payload.positionId || null,
      cv_filename: payload.cvFilename || null,
      created_at: new Date().toISOString(),
    });
    return id;
  }

  if (adapter === "postgres") {
    const result = await pool.query(
      `INSERT INTO career_applications (name, email, phone, motivation, position_id, cv_filename)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [payload.name, payload.email, payload.phone, payload.motivation || "", payload.positionId || null, payload.cvFilename || null]
    );
    return result.rows[0]?.id;
  }

  const result = await run(
    `INSERT INTO career_applications (name, email, phone, motivation, position_id, cv_filename)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [payload.name, payload.email, payload.phone, payload.motivation || "", payload.positionId || null, payload.cvFilename || null]
  );
  return result.lastID;
}

async function listCareerApplications() {
  if (adapter === "memory") return careerApplicationsMemory.slice(0, 300);

  if (adapter === "postgres") {
    const result = await pool.query(
      `SELECT ca.*, p.title AS position_title
       FROM career_applications ca
       LEFT JOIN positions p ON ca.position_id = p.id
       ORDER BY ca.created_at DESC LIMIT 300`
    );
    return result.rows;
  }

  return all(
    `SELECT ca.*, p.title AS position_title
     FROM career_applications ca
     LEFT JOIN positions p ON ca.position_id = p.id
     ORDER BY ca.created_at DESC LIMIT 300`
  );
}

module.exports = {
  initDb,
  insertSubmission,
  listSubmissions,
  getNotificationSettings,
  updateNotificationEmail,
  setEmailEnabled,
  updateCareerNotificationEmail,
  setCareerEmailEnabled,
  updateSubmissionStatus,
  getDbDiagnostics,
  listPositions,
  addPosition,
  deletePosition,
  insertCareerApplication,
  listCareerApplications,
  adapter,
};
