/**
 * Per-page SEO metadata. Keys match route names.
 * Canonical and OG URL are built at render time using SITE_URL env var.
 */
const pageSeo = {
  hu: {
    home: {
      title: "Halasi Kebpro Kft. - Gyros- és kebab hús gyártás | Országos kiszállítás",
      description: "Minőségbiztosított gyros- és kebab hús gyártás Kiskunhalason, országos hűtős kiszállítással HORECA partnereknek.",
    },
    about: {
      title: "Rólunk - Halasi Kebpro Kft. | Magyar kebab gyártó 2004 óta",
      description: "A Halasi Kebpro Kft. 2004 óta gyárt minőségi gyros és kebab termékeket. Heti 14-15 tonna kapacitás, exportjog, 80+ alkalmazott.",
    },
    quality: {
      title: "Minőségbiztosítás - Halasi Kebpro Kft. | Ellenőrzött gyros és kebab gyártás",
      description: "Ellenőrzött alapanyagok, -42 °C sokkolásos fagyasztás és teljes nyomonkövethetőség. Ismerje meg a Halasi Kebpro minőségbiztosítási folyamatát.",
    },
    wholesale: {
      title: "HORECA termékek - Gyros, kebab, pita és húskészítmények | Halasi Kebpro",
      description: "Gyros- és kebab nyársak, saslik, elősütött termékek, különlegességek és joghurtok HORECA partnereknek. Rendelje online!",
    },
    retail: {
      title: "Kiskereskedelmi termékek - Halasi Kebpro Kft.",
      description: "Piták, tortillák, desszertek, kiegészítők és csomagolóanyagok a Halasi Kebpro Kft. kínálatából.",
    },
    quote: {
      title: "Ajánlatkérés - Személyre szabott árajánlat gyros és kebab termékekre | Halasi Kebpro",
      description: "Kérjen személyre szabott árajánlatot gyros- és kebab termékeinkre. Kollégáink rövid időn belül visszajeleznek.",
    },
    order: {
      title: "Megrendelés - Online megrendelés leadása | Halasi Kebpro Kft.",
      description: "Adja le gyros- és kebab termék megrendelését online. Visszaigazolást küldünk rövid időn belül.",
    },
    career: {
      title: "Karrier - Álláslehetőségek Kiskunhalason | Halasi Kebpro Kft.",
      description: "Csatlakozzon a Halasi Kebpro Kft. csapatához! Tekintse meg nyitott pozícióinkat és küldje el jelentkezését online.",
    },
    contact: {
      title: "Kapcsolat - Halasi Kebpro Kft. | Kiskunhalas, Szegedi út 8.",
      description: "Vegye fel velünk a kapcsolatot telefonon, e-mailben vagy online. Halasi Kebpro Kft., 6400 Kiskunhalas, Szegedi út 8.",
    },
    grants: {
      title: "Pályázatok - EU-s fejlesztési projektek | Halasi Kebpro Kft.",
      description: "A Halasi Kebpro Kft. európai uniós támogatással valósítja meg kapacitásfejlesztési és technológiai projektjeit.",
    },
  },
  en: {
    home: {
      title: "Halasi Kebpro Kft. - Gyros and kebab meat production | Nationwide delivery",
      description: "Quality-assured gyros and kebab meat production in Kiskunhalas with nationwide refrigerated delivery for HORECA partners.",
    },
    about: {
      title: "About us - Halasi Kebpro Kft. | Hungarian kebab producer since 2004",
      description: "Halasi Kebpro Kft. has been producing quality gyros and kebab products since 2004. Weekly capacity 14-15 tonnes, export licence, 80+ employees.",
    },
    quality: {
      title: "Quality assurance - Halasi Kebpro Kft. | Controlled production",
      description: "Controlled raw materials, -42 °C shock freezing and full traceability across every production batch.",
    },
    wholesale: {
      title: "HORECA products - Gyros, kebab, pita and specialities | Halasi Kebpro",
      description: "Gyros and kebab skewers, shashlik, pre-cooked products, specialities and yoghurts for HORECA partners. Order online.",
    },
    retail: {
      title: "Retail products - Halasi Kebpro Kft.",
      description: "Pitas, tortillas, desserts, extras and packaging materials from Halasi Kebpro Kft.",
    },
    quote: {
      title: "Request a quote - Gyros and kebab products | Halasi Kebpro",
      description: "Request a personalised quote for our gyros and kebab products. Our team will reply shortly.",
    },
    order: {
      title: "Place an order - Online ordering | Halasi Kebpro Kft.",
      description: "Place your gyros and kebab product order online. Confirmation sent shortly.",
    },
    career: {
      title: "Career - Job openings in Kiskunhalas | Halasi Kebpro Kft.",
      description: "Join the Halasi Kebpro Kft. team! View our open positions and apply online.",
    },
    contact: {
      title: "Contact - Halasi Kebpro Kft. | Kiskunhalas, Szegedi út 8.",
      description: "Get in touch by phone, email or online. Halasi Kebpro Kft., 6400 Kiskunhalas, Szegedi út 8., Hungary.",
    },
    grants: {
      title: "Projects - EU development projects | Halasi Kebpro Kft.",
      description: "Halasi Kebpro Kft. develops production capacity and technology with EU co-funded projects.",
    },
  },
  de: {
    home: {
      title: "Halasi Kebpro Kft. - Gyros- und Kebabfleischproduktion | Landesweite Lieferung",
      description: "Qualitätsgesicherte Gyros- und Kebabproduktion in Kiskunhalas mit landesweiter Kühllieferung für HORECA-Partner.",
    },
    about: {
      title: "Über uns - Halasi Kebpro Kft. | Ungarischer Kebabproduzent seit 2004",
      description: "Die Halasi Kebpro Kft. produziert seit 2004 Gyros- und Kebabprodukte. Wöchentliche Kapazität 14-15 Tonnen, Exportlizenz, 80+ Mitarbeitende.",
    },
    quality: {
      title: "Qualitätssicherung - Halasi Kebpro Kft. | Kontrollierte Produktion",
      description: "Kontrollierte Rohstoffe, -42 °C Schockfrosten und vollständige Rückverfolgbarkeit über alle Produktionschargen.",
    },
    wholesale: {
      title: "HORECA-Produkte - Gyros, Kebab, Pita und Spezialitäten | Halasi Kebpro",
      description: "Gyros- und Kebabspieße, Schaschlik, vorgegarte Produkte, Spezialitäten und Joghurts für HORECA-Partner. Online bestellen.",
    },
    retail: {
      title: "Einzelhandelsprodukte - Halasi Kebpro Kft.",
      description: "Pitas, Tortillas, Desserts, Ergänzungen und Verpackungsmaterialien von Halasi Kebpro Kft.",
    },
    quote: {
      title: "Angebotsanfrage - Gyros- und Kebabprodukte | Halasi Kebpro",
      description: "Fordern Sie ein individuelles Angebot für unsere Gyros- und Kebabprodukte an. Unser Team meldet sich kurzfristig.",
    },
    order: {
      title: "Bestellung - Online bestellen | Halasi Kebpro Kft.",
      description: "Geben Sie Ihre Gyros- und Kebabbestellung online auf. Bestätigung erfolgt kurzfristig.",
    },
    career: {
      title: "Karriere - Stellenangebote in Kiskunhalas | Halasi Kebpro Kft.",
      description: "Werden Sie Teil des Halasi Kebpro Kft. Teams! Entdecken Sie offene Stellen und bewerben Sie sich online.",
    },
    contact: {
      title: "Kontakt - Halasi Kebpro Kft. | Kiskunhalas, Szegedi út 8.",
      description: "Kontaktieren Sie uns telefonisch, per E-Mail oder online. Halasi Kebpro Kft., 6400 Kiskunhalas, Szegedi út 8., Ungarn.",
    },
    grants: {
      title: "Förderprojekte - EU-Entwicklungsprojekte | Halasi Kebpro Kft.",
      description: "Die Halasi Kebpro Kft. entwickelt Produktionskapazitäten und Technologie mit EU-geförderten Projekten.",
    },
  },
};

/**
 * Build seo object for a given page and language.
 * @param {string} pageKey - key from pageSeo (e.g. 'home', 'about')
 * @param {string} lang - 'hu' | 'en' | 'de'
 * @param {string} canonicalPath - e.g. '/', '/rolunk'
 * @returns {{ title, description, canonical, ogImage }}
 */
function buildPageSeo(pageKey, lang, canonicalPath) {
  const siteUrl = (process.env.SITE_URL || "https://csirkegyros.hu").replace(/\/$/, "");
  const langData = pageSeo[lang] || pageSeo.hu;
  const data = langData[pageKey] || pageSeo.hu[pageKey] || {};
  return {
    title: data.title || "Halasi Kebpro Kft.",
    description: data.description || "",
    canonical: siteUrl + canonicalPath,
    ogImage: siteUrl + "/images/og-default.jpg",
  };
}

module.exports = { buildPageSeo };
