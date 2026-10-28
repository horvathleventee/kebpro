require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const siteRoutes = require("./routes/siteRoutes");
const { initDb } = require("./utils/db");
const { getLang, getTranslations, buildLangUrl, supportedLanguages } = require("./utils/i18n");

const app = express();
const dbReady = initDb();
const PRIMARY_ORIGIN = "https://kebpro.hu";

function buildLocalAssetVersion(directory) {
  const hash = crypto.createHash("sha256");

  const walk = (currentDirectory) => {
    const entries = fs.readdirSync(currentDirectory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    entries.forEach((entry) => {
      const absolutePath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        return;
      }

      const stats = fs.statSync(absolutePath);
      const relativePath = path.relative(directory, absolutePath).replace(/\\/g, "/");
      hash.update(`${relativePath}:${stats.size}:${Math.trunc(stats.mtimeMs)};`);
    });
  };

  walk(directory);
  return `local-${hash.digest("hex").slice(0, 12)}`;
}

const ASSET_VERSION =
  process.env.ASSET_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  buildLocalAssetVersion(path.join(__dirname, "public"));

const DOMAIN_REDIRECTS = {
  "/kezdolap": "/",
  "/bemutatkozas": "/rolunk",
  "/termekek-es-gyartas": "/termekek",
  "/logisztika": "/",
  "/referencia": "/minoseg",
  "/megrendeles": "/megrendeles",
  "/ajanlatkeres": "/ajanlatkeres",
  "/elerhetoseg": "/kapcsolat",
};

// Trust Vercel / reverse-proxy headers (needed for correct IP in rate limiting)
app.set("trust proxy", 1);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Opt-in private staging: failures are confined to partner routes, not the website.
let portalStaging = null, portalStagingReady = false;
let portalDiagnose = () => 'UNKNOWN';
let portalErrorDetails = () => [];
function recordPortalStagingStatus(code, phase, error) {
  try {
    const directory = path.join(__dirname, 'data');
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(directory, 'partner-staging-status.json'), JSON.stringify({ status: code, phase, details: portalErrorDetails(error), time: new Date().toISOString() }, null, 2), { mode: 0o600 });
  } catch { console.error('[partner staging] Unable to write private status file.'); }
}
if (process.env.PORTAL_STAGING_ENABLED === 'true') {
  try {
    const { stagingConfig, createStaging, diagnoseStagingError, stagingErrorDetails } = require('./portal/staging');
    portalDiagnose = diagnoseStagingError;
    portalErrorDetails = stagingErrorDetails;
    portalStaging = createStaging(stagingConfig());
    portalStaging.ready.then(() => { portalStagingReady = true; recordPortalStagingStatus('READY', 'ready'); }).catch(error => { const code = diagnoseStagingError(error); recordPortalStagingStatus(code, 'startup', error); console.error('[partner staging] Startup failed: ' + code); });
  } catch (error) { const code = portalDiagnose(error); recordPortalStagingStatus(code, 'configuration', error); console.error('[partner staging] Invalid configuration: ' + code); }
}
app.use((req, res, next) => {
  if (!/^\/partner(?:-admin)?(?:\/|$)/.test(req.path) || process.env.PORTAL_STAGING_ENABLED !== 'true') return next();
  if (!portalStagingReady) return res.status(503).send('Partner tesztkörnyezet átmenetileg nem érhető el.');
  return portalStaging.app.handle(req, res, next);
});

app.use((req, res, next) => {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");

  const shouldRedirect =
    host === "csirkegyros.hu" ||
    host === "www.csirkegyros.hu";

  if (!shouldRedirect) return next();

  const cleanPath = req.path.replace(/\/+$/, "") || "/";
  const targetPath = DOMAIN_REDIRECTS[cleanPath] || cleanPath;
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  return res.redirect(301, `${PRIMARY_ORIGIN}${targetPath}${query}`);
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "maps.gstatic.com", "*.googleapis.com"],
      frameSrc: ["'self'", "maps.google.com", "www.google.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(express.static(path.join(__dirname, "public"), {
  etag: true,
  immutable: process.env.NODE_ENV === "production",
  maxAge: process.env.NODE_ENV === "production" ? "1y" : 0,
  setHeaders(res, filePath) {
    if (/\.(?:png|jpe?g|gif|webp|svg|ico)$/i.test(filePath)) {
      res.setHeader("Cache-Control", process.env.NODE_ENV === "production"
        ? "public, max-age=31536000, immutable"
        : "public, max-age=0");
    }
  },
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: "Túl sok kérés rövid időn belül. Kérjük, próbálja újra később.",
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.urlencoded({
  extended: true,
  limit: "80kb",
  parameterLimit: 120,
}));
app.use(express.json({ limit: "20kb" }));

// Lightweight cookie parser — no extra package needed
app.use((req, res, next) => {
  req.cookies = Object.fromEntries(
    (req.headers.cookie || "").split(";").flatMap((part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return [];
      const key = part.slice(0, idx).trim();
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      return key ? [[key, val]] : [];
    })
  );
  next();
});

app.use(async (req, res, next) => {
  try {
    await dbReady;

    const lang = getLang(req.query.lang);
    res.locals.lang = lang;
    res.locals.t = getTranslations(lang);
    res.locals.supportedLanguages = supportedLanguages;
    res.locals.withLang = (pathname, extraQuery = {}) => buildLangUrl(pathname, lang, extraQuery);
    res.locals.buildLangUrl = (pathname, targetLang, extraQuery = {}) =>
      buildLangUrl(pathname, targetLang, extraQuery);
    res.locals.currentPath = req.path;
    res.locals.assetVersion = ASSET_VERSION;
    res.locals.company = {
      name: process.env.COMPANY_NAME || "Halasi Kebpro Kft.",
      phone: process.env.COMPANY_PHONE || "+36 70 451 5003",
      phone2: process.env.COMPANY_PHONE2 || "+36 70 451 5002",
      fax: process.env.COMPANY_FAX || "+36 77 426 014",
      email: process.env.COMPANY_EMAIL || "info@kebpro.hu",
      address: process.env.COMPANY_ADDRESS || "Szegedi út 8., 6400 Kiskunhalas, HUNGARY",
    };

    next();
  } catch (error) {
    next(error);
  }
});

app.use("/", siteRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  if (status === 413) {
    return res.status(413).send("A beküldött adat túl nagy.");
  }
  if (!res.locals.t) {
    return res.status(status).send(status === 500 ? "Internal Server Error" : "Request error");
  }
  return res.status(status).render(status === 500 ? "500" : "404", {
    title: res.locals.t.errors.serverTitle,
  });
});

app.use((req, res) => {
  if (!res.locals.t) {
    return res.status(404).send("Not Found");
  }
  return res.status(404).render("404", {
    title: res.locals.t.errors.notFoundTitle,
  });
});

module.exports = { app, dbReady };

