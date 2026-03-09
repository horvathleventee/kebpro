const express = require("express");
const {
  insertSubmission,
  listSubmissions,
  getNotificationSettings,
  updateNotificationEmail,
  setEmailEnabled,
} = require("../utils/db");
const { sendNotificationEmail } = require("../utils/mailer");

const router = express.Router();

const grantItems = [
  {
    slug: "vp3-4.2.1-4.2.2-2-21",
    title: "VP3-4.2.1-4.2.2-2-21",
    image: "/images/141mil.jpg",
    beneficiary: "KISKUNHALASI KEBPRO Élelmiszerfeldolgozó és Kereskedelmi Kft.",
    call: "Élelmiszeripari üzemek komplex fejlesztése; VP3-4.2.1-4.2.2-2-21",
    project: "A Kiskunhalasi Kebpro Kft. komplex fejlesztése; 3301640506",
    amount: "141.447.690 Ft",
    supportRate: "50%",
    summary: [
      "A projekt célja volt, hogy a termékek értéknövelését és a piacra jutást elősegítő, a technológiai fejlesztést, továbbá a környezeti erőforrás-hatékonyságot célzó komplex beruházásokat támogassa az élelmiszerfeldolgozás vállalati hatékonyságának növelése érdekében.",
      "A projekt végrehajtása elősegítette a KISKUNHALASI KEBPRO Kft. versenyképességének javítását a legkorszerűbb, innovatív technológiák megvalósításával.",
      "A projekt műszaki-szakmai előrehaladása a tervezettek szerint alakult.",
      "Beszerzésre és beüzemelésre került: 2 db Fiat Ducato teherjármű, 1 db sütőtéri temperált levegős légcsere rendszer, 5 db ALKADUR DCR-2 szeletelő robot, 1 db BAOLI KBD25+ diesel targonca, 1 db HASTAMAT R 270 CP 10 csomagológép.",
    ],
    endDate: "2023.08.30.",
  },
  {
    slug: "vp-3-4.2.1-15",
    title: "VP-3-4.2.1-15",
    image: "/images/159mil.jpg",
    beneficiary: "KISKUNHALASI KEBPRO Élelmiszer feldolgozó és Kereskedelmi Kft.",
    call: "Mezőgazdasági termékek értéknövelése és erőforrás-hatékonyságának elősegítése a feldolgozásban című, VP-3-4.2.1-15",
    project: "Mezőgazdasági termékek értéknövelése; Hússütő üzem építése a KISKUNHALASI KEBPRO KFT-nél; 1773089087",
    amount: "159.777.828 Ft",
    supportRate: "50%",
    summary: [
      "A projektben magasabb hozzáadott értékű termékek előállítása és piacbővítés érdekében új hússütő üzem létesült fagyasztott sült csirke kebab gyártására napi 2,5 t termelési kapacitással.",
      "A beruházás része volt a teljes technológia és infrastruktúra kialakítása, környezetkímélő technológiák bevezetése, megújuló energia felhasználása és új munkahelyek létrehozása.",
      "Kialakításra került a kapcsolódó üzemi út és járda, továbbá az alapanyag hűtéséhez és sütött termék fagyasztásához szükséges berendezések beüzemelése.",
      "Újdonságként bevezetésre került hővisszanyerő rendszer, megújuló energiatermelés és biológiai szennyvízkezelés.",
    ],
    endDate: "2018.10.31.",
  },
];

function validateCommon(body) {
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

  if (data.name.length < 2) errors.name = "A név megadása kötelező.";
  if (data.company.length < 2) errors.company = "A cégnév megadása kötelező.";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) errors.email = "Érvényes e-mail cím szükséges.";

  const phoneRegex = /^[+()\d\s-]{7,20}$/;
  if (!phoneRegex.test(data.phone)) errors.phone = "Érvényes telefonszám szükséges.";

  if (data.product.length < 2) errors.product = "A termék megadása kötelező.";

  return { errors, data };
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
  res.render("index", { title: "Kezdőlap" });
});

router.get("/rolunk", (req, res) => {
  res.render("about", { title: "Rólunk" });
});

router.get("/minoseg", (req, res) => {
  res.render("quality", { title: "Minőség" });
});

router.get("/termekek", (req, res) => {
  res.redirect("/termekek/nagykereskedelem");
});

router.get("/termekek/nagykereskedelem", (req, res) => {
  res.render("services", { title: "Termékek - Nagykereskedelem" });
});

router.get("/termekek/kiskereskedelem", (req, res) => {
  res.render("retail", { title: "Termékek - Kiskereskedelem" });
});

router.get("/szolgaltatasok", (req, res) => {
  res.redirect("/termekek/nagykereskedelem");
});

router.get("/palyazatok", (req, res) => {
  res.render("grants", {
    title: "Pályázatok",
    grants: grantItems,
  });
});

router.get("/palyazatok/:slug", (req, res) => {
  const grant = grantItems.find((item) => item.slug === req.params.slug);

  if (!grant) {
    return res.status(404).render("404", { title: "Pályázat nem található" });
  }

  return res.render("grant-detail", {
    title: `Pályázat - ${grant.title}`,
    grant,
    grants: grantItems,
  });
});

router.get("/kapcsolat", (req, res) => {
  res.render("contact", {
    title: "Kapcsolat",
  });
});

router.get("/ajanlatkeres", (req, res) => {
  res.render("quote", {
    title: "Ajánlatkérés",
    errors: {},
    formData: {},
    successMessage: null,
  });
});

router.get("/ajanlat-keres", (req, res) => {
  res.redirect("/ajanlatkeres");
});

router.post("/ajanlatkeres", async (req, res, next) => {
  try {
    const { errors, data } = validateCommon(req.body);

    if (data.message.length < 10) {
      errors.message = "Az igény rövid leírása legalább 10 karakter legyen.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).render("quote", {
        title: "Ajánlatkérés",
        errors,
        formData: data,
        successMessage: null,
      });
    }

    const payload = { ...data, type: "quote" };

    await insertSubmission(payload);
    const settings = await getNotificationSettings();
    await sendNotificationEmail(payload, settings);

    return res.render("quote", {
      title: "Ajánlatkérés",
      errors: {},
      formData: {},
      successMessage: "Köszönjük ajánlatkérését! Hamarosan jelentkezünk.",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/ajanlat-keres", async (req, res, next) => {
  req.url = "/ajanlatkeres";
  return router.handle(req, res, next);
});

router.get("/megrendeles", (req, res) => {
  res.render("order", {
    title: "Megrendelés",
    errors: {},
    formData: {},
    successMessage: null,
  });
});

router.get("/megrendelesek", (req, res) => {
  res.redirect("/megrendeles");
});

router.post("/megrendeles", async (req, res, next) => {
  try {
    const { errors, data } = validateCommon(req.body);

    if (data.quantity.length < 1) {
      errors.quantity = "A mennyiség megadása kötelező.";
    }

    if (data.address.length < 5) {
      errors.address = "A szállítási cím megadása kötelező.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).render("order", {
        title: "Megrendelés",
        errors,
        formData: data,
        successMessage: null,
      });
    }

    const payload = { ...data, type: "order" };

    await insertSubmission(payload);
    const settings = await getNotificationSettings();
    await sendNotificationEmail(payload, settings);

    return res.render("order", {
      title: "Megrendelés",
      errors: {},
      formData: {},
      successMessage: "Köszönjük megrendelését! A részletekkel hamarosan keressük.",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/megrendelesek", async (req, res, next) => {
  req.url = "/megrendeles";
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

router.get("/adatkezelesi-tajekoztato", (req, res) => {
  res.render("legal-privacy", { title: "Adatkezelési tájékoztató" });
});

router.get("/panaszkezelesi-szabalyzat", (req, res) => {
  res.render("legal-complaints", { title: "Panaszkezelési szabályzat" });
});

router.get("/impresszum", (req, res) => {
  res.render("legal-impressum", { title: "Impresszum" });
});

router.get("/belso-visszaeles-bejelentes", (req, res) => {
  res.render("legal-whistleblowing", { title: "Belső Visszaélés-Bejelentés" });
});

module.exports = router;

