const express = require("express");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { buildPageSeo } = require("../utils/seo");
const {
  insertSubmission,
  listSubmissions,
  getNotificationSettings,
  updateNotificationEmail,
  setEmailEnabled,
  updateCareerNotificationEmail,
  setCareerEmailEnabled,
  updateSubmissionStatus,
  deleteSubmission,
  getDbDiagnostics,
  listPositions,
  addPosition,
  deletePosition,
  insertCareerApplication,
  listCareerApplications,
  deleteCareerApplication,
} = require("../utils/db");
const { sendNotificationEmail, sendCareerNotificationEmail } = require("../utils/mailer");
const {
  getGrantItems,
  getWholesaleCatalog,
  getRetailCatalog,
  getOrderProductOptions,
  getLogisticsRegions,
} = require("../utils/i18n");

const router = express.Router();

const fs = require("fs");
// Store CV uploads OUTSIDE public/ so they are not served as static files
const uploadsDir = process.env.VERCEL
  ? "/tmp/uploads"
  : path.join(__dirname, "..", "uploads");
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) {}

const ALLOWED_CV_EXTS = /\.(pdf|doc|docx)$/i;
const ALLOWED_CV_MIMES = ["application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

const cvUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) {}
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `cv-${unique}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extOk = ALLOWED_CV_EXTS.test(path.extname(file.originalname));
    const mimeOk = ALLOWED_CV_MIMES.includes(file.mimetype);
    cb(null, extOk && mimeOk);
  },
});

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Túl sok bejelentkezési kísérlet. Próbálja újra 15 perc múlva.",
  standardHeaders: true,
  legacyHeaders: false,
});

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: "Túl sok kérés. Próbálja újra később.",
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Legacy URL 301 redirects (csirkegyros.hu old URLs) ──────────────────────
const LEGACY_REDIRECTS = {
  "/kezdolap":            "/",
  "/bemutatkozas":        "/rolunk",
  "/termekek-es-gyartas": "/termekek/horeca",
  "/logisztika":          "/rolunk",
  "/referencia":          "/rolunk",
  "/elerhetoseg":         "/kapcsolat",
};
Object.entries(LEGACY_REDIRECTS).forEach(([from, to]) => {
  router.get(from, (req, res) => res.redirect(301, to));
});

// ── Sitemap ──────────────────────────────────────────────────────────────────
router.get("/sitemap.xml", (req, res) => {
  const configuredUrl = process.env.SITE_URL || process.env.BASE_URL || "";
  const siteUrl = (/kebpro\.hu/i.test(configuredUrl) ? "https://csirkegyros.hu" : configuredUrl || "https://csirkegyros.hu").replace(/\/$/, "");
  const today = new Date().toISOString().split("T")[0];
  const urls = [
    { loc: "/",                          priority: "1.0", changefreq: "weekly"  },
    { loc: "/rolunk",                    priority: "0.8", changefreq: "monthly" },
    { loc: "/minoseg",                   priority: "0.8", changefreq: "monthly" },
    { loc: "/termekek/horeca", priority: "0.9", changefreq: "monthly" },
    { loc: "/termekek/kiskereskedelem",  priority: "0.6", changefreq: "monthly" },
    { loc: "/palyazatok",                priority: "0.5", changefreq: "monthly" },
    { loc: "/ajanlatkeres",              priority: "0.9", changefreq: "monthly" },
    { loc: "/megrendeles",               priority: "0.9", changefreq: "monthly" },
    { loc: "/karrier",                   priority: "0.7", changefreq: "weekly"  },
    { loc: "/kapcsolat",                 priority: "0.8", changefreq: "monthly" },
  ];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => [
      "  <url>",
      `    <loc>${siteUrl}${u.loc}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      "  </url>",
    ].join("\n")),
    "</urlset>",
  ].join("\n");
  res.setHeader("Content-Type", "application/xml; charset=UTF-8");
  res.send(xml);
});

function getValidationMessages(lang) {
  if (lang === "en") {
    return {
      name: "Name is required.",
      company: "Company name is required.",
      email: "A valid email address is required.",
      phone: "A valid phone number is required.",
      product: "Product is required.",
      cv: "CV upload is required.",
      message: "Please provide at least 10 characters.",
      quantity: "Quantity is required.",
      address: "Delivery address is required.",
      companyHeadquarters: "Company registered address is required.",
      taxNumber: "Tax number is required.",
    };
  }

  if (lang === "de") {
    return {
      name: "Name ist erforderlich.",
      company: "Firmenname ist erforderlich.",
      email: "Eine gültige E-Mail-Adresse ist erforderlich.",
      phone: "Eine gültige Telefonnummer ist erforderlich.",
      product: "Produkt ist erforderlich.",
      cv: "Lebenslauf ist erforderlich.",
      message: "Bitte geben Sie mindestens 10 Zeichen an.",
      quantity: "Menge ist erforderlich.",
      address: "Lieferadresse ist erforderlich.",
      companyHeadquarters: "Firmensitz ist erforderlich.",
      taxNumber: "Steuernummer ist erforderlich.",
    };
  }

  return {
    name: "A név megadása kötelező.",
    company: "A cégnév megadása kötelező.",
    email: "Érvényes e-mail cím szükséges.",
    phone: "Érvényes telefonszám szükséges.",
    product: "A termék megadása kötelező.",
    cv: "Az önéletrajz feltöltése kötelező.",
    message: "Az igény rövid leírása legalább 10 karakter legyen.",
    quantity: "A mennyiség megadása kötelező.",
    address: "A szállítási cím megadása kötelező.",
    companyHeadquarters: "A székhely megadása kötelező.",
    taxNumber: "Az adószám megadása kötelező.",
  };
}

function validateCommon(body, lang) {
  const messages = getValidationMessages(lang);
  const errors = {};
  const data = {
    name: (body.name || "").trim(),
    email: (body.email || "").trim(),
    phone: (body.phone || "").trim(),
    company: (body.company || "").trim(),
    companyHeadquarters: (body.companyHeadquarters || "").trim(),
    taxNumber: (body.taxNumber || "").trim(),
    product: (body.product || "").trim(),
    quantity: (body.quantity || "").trim(),
    address: (body.address || "").trim(),
    requestedDate: (body.requestedDate || "").trim(),
    message: (body.message || "").trim(),
  };

  if (data.name.length < 2) errors.name = messages.name;
  if (data.company.length < 2) errors.company = messages.company;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) errors.email = messages.email;

  const phoneRegex = /^[+()\d\s-]{7,20}$/;
  if (!phoneRegex.test(data.phone)) errors.phone = messages.phone;

  if (data.product.length < 2) errors.product = messages.product;

  return { errors, data, messages };
}

function getSelectedProducts(body) {
  const products = Array.isArray(body.products)
    ? body.products
    : body.products ? [body.products] : [];
  const quantities = Array.isArray(body.productQuantities)
    ? body.productQuantities
    : body.productQuantities ? [body.productQuantities] : [];

  return products
    .map((product, index) => ({
      product: (product || "").trim(),
      quantity: (quantities[index] || "").trim(),
    }))
    .filter((item) => item.product);
}

function applySelectedProducts(data, errors, selectedProducts) {
  if (selectedProducts.length === 0) return;

  delete errors.product;
  data.product = selectedProducts
    .map((item) => `${item.product}${item.quantity ? ` - ${item.quantity}` : ""}`)
    .join("\n");
  data.quantity = selectedProducts
    .map((item) => item.quantity)
    .filter(Boolean)
    .join("; ");
  data.products = selectedProducts;
}

function normalizeEmailList(value) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((email) => email.trim())
    .filter(Boolean)
    .join(", ");
}

function isValidEmailList(value) {
  const emails = normalizeEmailList(value).split(", ").filter(Boolean);
  return emails.length > 0 && emails.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

// --- Signed cookie auth (stateless, works on Vercel serverless) ---
const COOKIE_NAME = "kbp_admin";
const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

function signToken(secret) {
  return crypto.createHmac("sha256", secret).update("admin:ok").digest("hex");
}

function setAdminCookie(res, secret) {
  const token = signToken(secret);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE * 1000,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

function clearAdminCookie(res) {
  res.cookie(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

function isAdminAuthenticated(req) {
  const secret = process.env.SESSION_SECRET || "kebpro-admin-secret-2024";
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return false;
  try {
    const expected = Buffer.from(signToken(secret));
    const actual = Buffer.from(token);
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function requireAdminSession(req, res, next) {
  if (isAdminAuthenticated(req)) return next();
  return res.redirect("/admin/login");
}

router.get("/admin/login", (req, res, next) => {
  try {
    if (isAdminAuthenticated(req)) return res.redirect("/admin");
    return res.render("admin-login", { error: null });
  } catch (err) {
    return next(err);
  }
});

router.post("/admin/login", loginLimiter, (req, res) => {
  const username = (req.body.username || "").trim();
  const password = (req.body.password || "").trim();
  const expectedUser = process.env.ADMIN_USER || "admin";
  const expectedPass = process.env.ADMIN_PASS || "admin123";

  // Timing-safe comparison to prevent timing attacks
  const userBuf = Buffer.alloc(64); const passBuf = Buffer.alloc(64);
  const expUserBuf = Buffer.alloc(64); const expPassBuf = Buffer.alloc(64);
  userBuf.write(username); expUserBuf.write(expectedUser);
  passBuf.write(password); expPassBuf.write(expectedPass);
  const userMatch = crypto.timingSafeEqual(userBuf, expUserBuf);
  const passMatch = crypto.timingSafeEqual(passBuf, expPassBuf);

  if (userMatch && passMatch) {
    const secret = process.env.SESSION_SECRET || "kebpro-admin-secret-2024";
    setAdminCookie(res, secret);
    return res.redirect("/admin");
  }

  return res.render("admin-login", { error: "Hibás felhasználónév vagy jelszó." });
});

router.get("/admin/logout", (req, res) => {
  clearAdminCookie(res);
  return res.redirect("/admin/login");
});

// alias - backward compat
const ALLOWED_TYPES = new Set(["all", "quote", "order", "callback"]);
function safeType(raw) { return ALLOWED_TYPES.has(raw) ? raw : null; }

router.get("/admin/igenyek", requireAdminSession, (req, res) => {
  const t = safeType(req.query.type);
  return res.redirect("/admin" + (t ? `?type=${t}` : ""));
});

router.get("/", (req, res) => {
  const lang = res.locals.lang;
  const logisticsRegions = getLogisticsRegions(lang);
  res.render("index", {
    title: res.locals.t.nav.home,
    seo: buildPageSeo("home", lang, "/"),
    logisticsRegions,
    activeRegion: logisticsRegions[0],
    productCatalog: getWholesaleCatalog(lang),
  });
});

router.get("/rolunk", (req, res) => {
  const lang = res.locals.lang;
  res.render("about", {
    title: res.locals.t.nav.about,
    seo: buildPageSeo("about", lang, "/rolunk"),
  });
});

router.get("/minoseg", (req, res) => {
  res.render("quality", {
    title: res.locals.t.nav.quality,
    seo: buildPageSeo("quality", res.locals.lang, "/minoseg"),
  });
});

router.get("/termekek", (req, res) => {
  res.render("products", {
    title: res.locals.t.nav.products,
    seo: buildPageSeo("products", res.locals.lang, "/termekek"),
  });
});

router.get("/termekek/nagykereskedelem", (req, res) => {
  res.redirect(301, res.locals.withLang("/termekek/horeca"));
});

router.get("/termekek/horeca", (req, res) => {
  res.render("services", {
    title: `${res.locals.t.nav.products} - ${res.locals.t.nav.wholesale}`,
    seo: buildPageSeo("wholesale", res.locals.lang, "/termekek/horeca"),
    categories: getWholesaleCatalog(res.locals.lang),
  });
});

router.get("/termekek/kiskereskedelem", (req, res) => {
  res.render("retail", {
    title: `${res.locals.t.nav.products} - ${res.locals.t.nav.retail}`,
    seo: buildPageSeo("retail", res.locals.lang, "/termekek/kiskereskedelem"),
    categories: getRetailCatalog(res.locals.lang),
  });
});

router.get("/szolgaltatasok", (req, res) => {
  res.redirect(res.locals.withLang("/termekek/horeca"));
});

router.get("/palyazatok", (req, res) => {
  res.render("grants", {
    title: res.locals.t.nav.grants,
    seo: buildPageSeo("grants", res.locals.lang, "/palyazatok"),
    grants: getGrantItems(res.locals.lang),
  });
});

router.get("/palyazatok/:slug", (req, res) => {
  const grants = getGrantItems(res.locals.lang);
  const grant = grants.find((item) => item.slug === req.params.slug);

  if (!grant) {
    return res.status(404).render("404", { title: res.locals.t.errors.notFoundTitle });
  }

  return res.render("grant-detail", {
    title: `${res.locals.t.nav.grants} - ${grant.title}`,
    grant,
  });
});

router.get("/kapcsolat", (req, res) => {
  res.render("contact", {
    title: res.locals.t.nav.contact,
    seo: buildPageSeo("contact", res.locals.lang, "/kapcsolat"),
  });
});

router.get("/ajanlatkeres", (req, res) => {
  const prefill = {};
  if (req.query.product) prefill.product = req.query.product;
  if (req.query.quantity) prefill.quantity = req.query.quantity;
  res.render("quote", {
    title: res.locals.t.nav.quote,
    seo: buildPageSeo("quote", res.locals.lang, "/ajanlatkeres"),
    productOptions: getOrderProductOptions(res.locals.lang),
    errors: {},
    formData: prefill,
    successMessage: null,
  });
});

router.get("/ajanlat-keres", (req, res) => {
  res.redirect(res.locals.withLang("/ajanlatkeres"));
});

router.post("/ajanlatkeres", formLimiter, async (req, res, next) => {
  try {
    const selectedProducts = getSelectedProducts(req.body);
    const derivedProduct = selectedProducts
      .map((item) => `${item.product}${item.quantity ? ` - ${item.quantity}` : ""}`)
      .join("\n");
    const derivedQuantity = selectedProducts.map((item) => item.quantity).filter(Boolean).join("; ");
    const validationBody = {
      ...req.body,
      product: req.body.product || derivedProduct,
      quantity: req.body.quantity || derivedQuantity,
    };
    const { errors, data } = validateCommon(validationBody, res.locals.lang);

    applySelectedProducts(data, errors, selectedProducts);

    if (Object.keys(errors).length > 0) {
      return res.status(400).render("quote", {
        title: res.locals.t.nav.quote,
        seo: buildPageSeo("quote", res.locals.lang, "/ajanlatkeres"),
        productOptions: getOrderProductOptions(res.locals.lang),
        errors,
        formData: data,
        successMessage: null,
      });
    }

    const isCallbackRequest = /visszah(?:í|i)v|callback|telefon/i.test(`${data.product} ${data.message}`);
    const payload = {
      ...data,
      type: isCallbackRequest ? "callback" : "quote",
      product: isCallbackRequest ? "" : data.product,
      lang: res.locals.lang,
    };

    await insertSubmission(payload);
    const settings = await getNotificationSettings();
    await sendNotificationEmail(payload, settings);

    return res.render("quote", {
      title: res.locals.t.nav.quote,
      seo: buildPageSeo("quote", res.locals.lang, "/ajanlatkeres"),
      productOptions: getOrderProductOptions(res.locals.lang),
      errors: {},
      formData: {},
      successMessage: res.locals.t.quote.success,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/ajanlat-keres", async (req, res, next) => {
  req.url = `/ajanlatkeres${req.query.lang ? `?lang=${req.query.lang}` : ""}`;
  return router.handle(req, res, next);
});

router.get("/megrendeles", (req, res) => {
  res.render("order", {
    title: res.locals.t.nav.order,
    seo: buildPageSeo("order", res.locals.lang, "/megrendeles"),
    productOptions: getOrderProductOptions(res.locals.lang),
    errors: {},
    formData: {},
    successMessage: null,
  });
});

router.get("/megrendelesek", (req, res) => {
  res.redirect(res.locals.withLang("/megrendeles"));
});

router.post("/megrendeles", formLimiter, async (req, res, next) => {
  try {
    const { errors, data, messages } = validateCommon(req.body, res.locals.lang);
    const selectedProducts = getSelectedProducts(req.body);
    applySelectedProducts(data, errors, selectedProducts);

    if (data.quantity.length < 1) {
      errors.quantity = messages.quantity;
    }

    if (data.address.length < 5) {
      errors.address = messages.address;
    }

    if (data.companyHeadquarters.length < 3) {
      errors.companyHeadquarters = messages.companyHeadquarters;
    }

    if (data.taxNumber.length < 3) {
      errors.taxNumber = messages.taxNumber;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).render("order", {
        title: res.locals.t.nav.order,
        seo: buildPageSeo("order", res.locals.lang, "/megrendeles"),
        productOptions: getOrderProductOptions(res.locals.lang),
        errors,
        formData: data,
        successMessage: null,
      });
    }

    const payload = { ...data, type: "order", lang: res.locals.lang };

    await insertSubmission(payload);
    const settings = await getNotificationSettings();
    await sendNotificationEmail(payload, settings);

    return res.render("order", {
      title: res.locals.t.nav.order,
      seo: buildPageSeo("order", res.locals.lang, "/megrendeles"),
      productOptions: getOrderProductOptions(res.locals.lang),
      errors: {},
      formData: {},
      successMessage: res.locals.t.order.success,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/megrendelesek", formLimiter, async (req, res, next) => {
  req.url = `/megrendeles${req.query.lang ? `?lang=${req.query.lang}` : ""}`;
  return router.handle(req, res, next);
});

/* ── Callback widget ── */

router.post("/visszahivas", formLimiter, async (req, res, next) => {
  try {
    const { name, phone, timeslot } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "missing fields" });
    const payload = {
      name: name.trim().slice(0, 120),
      phone: phone.trim().slice(0, 40),
      message: `Visszahívás kérés — idősáv: ${(timeslot || "").slice(0, 60)}`,
      type: "callback",
      email: "",
      company: "",
      product: "",
      lang: res.locals.lang,
    };
    await insertSubmission(payload);
    const settings = await getNotificationSettings();
    await sendNotificationEmail(payload, settings);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/* ── Career ── */

function getCareerValidation(lang) {
  if (lang === "en") return { name: "Name is required.", email: "A valid email is required.", phone: "A valid phone number is required.", motivation: "Please tell us about yourself (min 10 characters).", positionId: "Please select a position.", cv: "CV upload is required." };
  if (lang === "de") return { name: "Name ist erforderlich.", email: "Eine gültige E-Mail ist erforderlich.", phone: "Eine gültige Telefonnummer ist erforderlich.", motivation: "Bitte erzählen Sie uns von sich (mind. 10 Zeichen).", positionId: "Bitte wählen Sie eine Position.", cv: "Lebenslauf ist erforderlich." };
  return { name: "A név megadása kötelező.", email: "Érvényes e-mail cím szükséges.", phone: "Érvényes telefonszám szükséges.", motivation: "Kérjük, írjon magáról (min. 10 karakter).", positionId: "Kérjük, válasszon pozíciót.", cv: "Az önéletrajz feltöltése kötelező." };
}

router.get("/karrier", async (req, res, next) => {
  try {
    const positions = await listPositions(true);
    res.render("career", {
      title: res.locals.t.nav.career,
      seo: buildPageSeo("career", res.locals.lang, "/karrier"),
      positions,
      errors: {},
      formData: {},
      successMessage: null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/karrier", formLimiter, cvUpload.single("cv"), async (req, res, next) => {
  try {
    const positions = await listPositions(true);
    const v = getCareerValidation(res.locals.lang);
    const errors = {};
    const data = {
      name: (req.body.name || "").trim(),
      email: (req.body.email || "").trim(),
      phone: (req.body.phone || "").trim(),
      motivation: (req.body.motivation || "").trim(),
      positionId: (req.body.positionId || "").trim(),
    };

    if (data.name.length < 2) errors.name = v.name;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = v.email;
    if (!/^[+()\d\s-]{7,20}$/.test(data.phone)) errors.phone = v.phone;
    if (data.motivation.length < 10) errors.motivation = v.motivation;
    if (!data.positionId) errors.positionId = v.positionId;
    if (!req.file) errors.cv = v.cv;

    if (Object.keys(errors).length > 0) {
      return res.status(400).render("career", {
        title: res.locals.t.nav.career,
        seo: buildPageSeo("career", res.locals.lang, "/karrier"),
        positions,
        errors,
        formData: data,
        successMessage: null,
      });
    }

    await insertCareerApplication({
      name: data.name,
      email: data.email,
      phone: data.phone,
      motivation: data.motivation,
      positionId: data.positionId,
      cvFilename: req.file ? req.file.filename : null,
    });

    const selectedPosition = positions.find((p) => String(p.id) === String(data.positionId));
    const settings = await getNotificationSettings();
    const cvFilePath = req.file ? req.file.path : null;
    await sendCareerNotificationEmail(
      { ...data, positionTitle: selectedPosition ? selectedPosition.title : data.positionId },
      settings,
      cvFilePath
    );

    return res.render("career", {
      title: res.locals.t.nav.career,
      seo: buildPageSeo("career", res.locals.lang, "/karrier"),
      positions,
      errors: {},
      formData: {},
      successMessage: res.locals.t.career.success,
    });
  } catch (error) {
    next(error);
  }
});

/* ── Admin ── */

router.get("/admin", requireAdminSession, async (req, res, next) => {
  try {
    const type = safeType(req.query.type) || "all";
    const rows = await listSubmissions(type);
    const settings = await getNotificationSettings();
    const diagnostics = await getDbDiagnostics();
    const positions = await listPositions();
    const careerApplications = await listCareerApplications();

    return res.render("admin", {
      title: "Admin - Beérkezett igények",
      seo: null,
      rows,
      selectedType: type,
      settings,
      diagnostics,
      positions,
      careerApplications,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/email-settings/update", requireAdminSession, async (req, res, next) => {
  try {
    const email = normalizeEmailList(req.body.notificationEmail);
    const valid = isValidEmailList(email);

    if (valid) {
      await updateNotificationEmail(email);
    }

    return res.redirect("/admin");
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/email-settings/toggle", requireAdminSession, async (req, res, next) => {
  try {
    const settings = await getNotificationSettings();
    await setEmailEnabled(!settings.emailEnabled);
    return res.redirect("/admin");
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/career-email-settings/update", requireAdminSession, async (req, res, next) => {
  try {
    const email = normalizeEmailList(req.body.careerNotificationEmail);
    if (isValidEmailList(email)) {
      await updateCareerNotificationEmail(email);
    }
    return res.redirect("/admin");
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/career-email-settings/toggle", requireAdminSession, async (req, res, next) => {
  try {
    const settings = await getNotificationSettings();
    await setCareerEmailEnabled(!settings.careerEmailEnabled);
    return res.redirect("/admin");
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/igenyek/:id/status", requireAdminSession, async (req, res, next) => {
  try {
    const allowedStatuses = ["new", "in_progress", "closed", "called_back"];
    const status = (req.body.status || "").trim();

    if (!allowedStatuses.includes(status)) {
      return res.redirect("/admin");
    }

    await updateSubmissionStatus(req.params.id, status);
    const t = safeType(req.query.type);
    return res.redirect(`/admin${t ? `?type=${t}` : ""}`);
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/igenyek/:id/delete", requireAdminSession, async (req, res, next) => {
  try {
    await deleteSubmission(req.params.id);
    const t = safeType(req.query.type);
    return res.redirect(`/admin${t ? `?type=${t}` : ""}`);
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/positions/add", requireAdminSession, async (req, res, next) => {
  try {
    const title = (req.body.title || "").trim();
    const description = (req.body.description || "").trim();
    const location = (req.body.location || "").trim();
    const type = (req.body.type || "").trim();

    if (title.length >= 2) {
      await addPosition({ title, description, location, type });
    }

    return res.redirect("/admin");
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/positions/:id/delete", requireAdminSession, async (req, res, next) => {
  try {
    await deletePosition(req.params.id);
    return res.redirect("/admin");
  } catch (error) {
    return next(error);
  }
});

// Authenticated CV download — files stored outside public/
router.post("/admin/career-applications/:id/delete", requireAdminSession, async (req, res, next) => {
  try {
    const cvFilename = await deleteCareerApplication(req.params.id);
    if (cvFilename) {
      const safeFilename = path.basename(cvFilename);
      const filePath = path.join(uploadsDir, safeFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return res.redirect("/admin");
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/cv/:filename", requireAdminSession, (req, res) => {
  const filename = path.basename(req.params.filename); // strip any path traversal
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");
  res.download(filePath, filename);
});

router.get("/adatkezelesi-tajekoztato", (req, res) => {
  res.render("legal-privacy", { title: "Adatkezelési tájékoztató", seo: null });
});

router.get("/panaszkezelesi-szabalyzat", (req, res) => {
  res.render("legal-complaints", { title: "Panaszkezelési szabályzat", seo: null });
});

router.get("/impresszum", (req, res) => {
  res.render("legal-impressum", { title: "Impresszum", seo: null });
});

router.get("/belso-visszaeles-bejelentes", (req, res) => {
  res.render("legal-whistleblowing", { title: "Belső Visszaélés-Bejelentés", seo: null });
});

module.exports = router;
