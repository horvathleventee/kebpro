const express = require("express");
const {
  insertSubmission,
  listSubmissions,
  getNotificationSettings,
  updateNotificationEmail,
  setEmailEnabled,
  updateSubmissionStatus,
} = require("../utils/db");
const { sendNotificationEmail } = require("../utils/mailer");
const {
  getGrantItems,
  getWholesaleCatalog,
  getLogisticsRegions,
} = require("../utils/i18n");

const router = express.Router();

function getValidationMessages(lang) {
  if (lang === "en") {
    return {
      name: "Name is required.",
      company: "Company name is required.",
      email: "A valid email address is required.",
      phone: "A valid phone number is required.",
      product: "Product is required.",
      message: "Please provide at least 10 characters.",
      quantity: "Quantity is required.",
      address: "Delivery address is required.",
    };
  }

  if (lang === "de") {
    return {
      name: "Name ist erforderlich.",
      company: "Firmenname ist erforderlich.",
      email: "Eine gültige E-Mail-Adresse ist erforderlich.",
      phone: "Eine gültige Telefonnummer ist erforderlich.",
      product: "Produkt ist erforderlich.",
      message: "Bitte geben Sie mindestens 10 Zeichen an.",
      quantity: "Menge ist erforderlich.",
      address: "Lieferadresse ist erforderlich.",
    };
  }

  return {
    name: "A név megadása kötelező.",
    company: "A cégnév megadása kötelező.",
    email: "Érvényes e-mail cím szükséges.",
    phone: "Érvényes telefonszám szükséges.",
    product: "A termék megadása kötelező.",
    message: "Az igény rövid leírása legalább 10 karakter legyen.",
    quantity: "A mennyiség megadása kötelező.",
    address: "A szállítási cím megadása kötelező.",
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

function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, encoded] = authHeader.split(" ");

  if (scheme !== "Basic" || !encoded) {
    res.set("WWW-Authenticate", 'Basic realm="Kebpro Admin"');
    return res.status(401).send("Hitelesítés szükséges.");
  }

  const [username, password] = Buffer.from(encoded, "base64").toString("utf8").split(":");
  const expectedUser = process.env.ADMIN_USER || "admin";
  const expectedPass = process.env.ADMIN_PASS || "admin123";

  if (username !== expectedUser || password !== expectedPass) {
    return res.status(403).send("Hibás admin hitelesítés.");
  }

  return next();
}

router.get("/", (req, res) => {
  const logisticsRegions = getLogisticsRegions(res.locals.lang);
  res.render("index", {
    title: res.locals.t.nav.home,
    logisticsRegions,
    activeRegion: logisticsRegions[0],
  });
});

router.get("/rolunk", (req, res) => {
  res.render("about", { title: res.locals.t.nav.about });
});

router.get("/minoseg", (req, res) => {
  res.render("quality", { title: res.locals.t.nav.quality });
});

router.get("/termekek", (req, res) => {
  res.redirect(res.locals.withLang("/termekek/nagykereskedelem"));
});

router.get("/termekek/nagykereskedelem", (req, res) => {
  res.render("services", {
    title: `${res.locals.t.nav.products} - ${res.locals.t.nav.wholesale}`,
    categories: getWholesaleCatalog(res.locals.lang),
  });
});

router.get("/termekek/kiskereskedelem", (req, res) => {
  res.render("retail", { title: `${res.locals.t.nav.products} - ${res.locals.t.nav.retail}` });
});

router.get("/szolgaltatasok", (req, res) => {
  res.redirect(res.locals.withLang("/termekek/nagykereskedelem"));
});

router.get("/palyazatok", (req, res) => {
  res.render("grants", {
    title: res.locals.t.nav.grants,
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
  res.render("contact", { title: res.locals.t.nav.contact });
});

router.get("/ajanlatkeres", (req, res) => {
  res.render("quote", {
    title: res.locals.t.nav.quote,
    errors: {},
    formData: {},
    successMessage: null,
  });
});

router.get("/ajanlat-keres", (req, res) => {
  res.redirect(res.locals.withLang("/ajanlatkeres"));
});

router.post("/ajanlatkeres", async (req, res, next) => {
  try {
    const { errors, data, messages } = validateCommon(req.body, res.locals.lang);

    if (data.message.length < 10) {
      errors.message = messages.message;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).render("quote", {
        title: res.locals.t.nav.quote,
        errors,
        formData: data,
        successMessage: null,
      });
    }

    const payload = { ...data, type: "quote", lang: res.locals.lang };

    await insertSubmission(payload);
    const settings = await getNotificationSettings();
    await sendNotificationEmail(payload, settings);

    return res.render("quote", {
      title: res.locals.t.nav.quote,
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
    errors: {},
    formData: {},
    successMessage: null,
  });
});

router.get("/megrendelesek", (req, res) => {
  res.redirect(res.locals.withLang("/megrendeles"));
});

router.post("/megrendeles", async (req, res, next) => {
  try {
    const { errors, data, messages } = validateCommon(req.body, res.locals.lang);

    if (data.quantity.length < 1) {
      errors.quantity = messages.quantity;
    }

    if (data.address.length < 5) {
      errors.address = messages.address;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).render("order", {
        title: res.locals.t.nav.order,
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
      errors: {},
      formData: {},
      successMessage: res.locals.t.order.success,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/megrendelesek", async (req, res, next) => {
  req.url = `/megrendeles${req.query.lang ? `?lang=${req.query.lang}` : ""}`;
  return router.handle(req, res, next);
});

router.get("/admin/igenyek", basicAuth, async (req, res, next) => {
  try {
    const type = req.query.type || "all";
    const rows = await listSubmissions(type);
    const settings = await getNotificationSettings();

    return res.render("admin", {
      title: "Admin - Beérkezett igények",
      rows,
      selectedType: type,
      settings,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/email-settings/update", basicAuth, async (req, res, next) => {
  try {
    const email = (req.body.notificationEmail || "").trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (valid) {
      await updateNotificationEmail(email);
    }

    return res.redirect("/admin/igenyek");
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/email-settings/toggle", basicAuth, async (req, res, next) => {
  try {
    const settings = await getNotificationSettings();
    await setEmailEnabled(!settings.emailEnabled);
    return res.redirect("/admin/igenyek");
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/igenyek/:id/status", basicAuth, async (req, res, next) => {
  try {
    const allowedStatuses = ["new", "in_progress", "closed", "called_back"];
    const status = (req.body.status || "").trim();

    if (!allowedStatuses.includes(status)) {
      return res.redirect("/admin/igenyek");
    }

    await updateSubmissionStatus(req.params.id, status);
    return res.redirect(`/admin/igenyek${req.query.type ? `?type=${req.query.type}` : ""}`);
  } catch (error) {
    return next(error);
  }
});

router.get("/adatkezelesi-tajekoztato", (req, res) => {
  res.render("legal-privacy", { title: "Adatkezelési tájékoztató" });
});

router.get("/panaszkezelesi-szabalyzat", (req, res) => {
  res.render("legal-complaints", { title: "Panaszkezelési szabályzat" });
});

router.get("/impresszum", (req, res) => {
  res.render("legal-impresszum", { title: "Impresszum" });
});

router.get("/belso-visszaeles-bejelentes", (req, res) => {
  res.render("legal-whistleblowing", { title: "Belső Visszaélés-Bejelentés" });
});

module.exports = router;
