require("dotenv").config();

const express = require("express");
const path = require("path");
const siteRoutes = require("./routes/siteRoutes");
const { initDb } = require("./utils/db");
const { getLang, getTranslations, buildLangUrl, supportedLanguages } = require("./utils/i18n");

const app = express();
const dbReady = initDb();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

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
  if (!res.locals.t) {
    return res.status(500).send("Internal Server Error");
  }
  return res.status(500).render("500", {
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

