// Keep dated PDF URLs: replacing content under a cached URL can show an old document.
const documents = [
  { id: "composition", url: "/pdf/kornyezet/anyagfelhasznalasi-nyilatkozat-2026-01-21.pdf", date: "2026-01-21" },
  { id: "compliance", url: "/pdf/kornyezet/pfas-nehezfem-nyilatkozat-2026-06-12.pdf", date: "2026-06-12" },
];
const copy = {
  hu: {
    title: "Környezeti tájékoztató",
    eyebrow: "Csomagolás és környezet",
    lead: "A csomagolóanyag gyártójának összetételre és megfelelőségre vonatkozó nyilatkozatai, egy helyen.",
    documentsTitle: "Letölthető dokumentumok",
    issuer: "Kiállító: Rolf Bayer Vacuumverpackung GmbH",
    metadata: "Angol nyelvű PDF · 1 oldal · kb. 0,6 MB",
    open: "PDF megnyitása",
    newTab: "új lapon",
    download: "Letöltés",
    note: "A nyilatkozatok hatályát, a felsorolt csomagolóanyagokat, a kivételeket és az időbeli feltételeket az eredeti dokumentumok tartalmazzák.",
    help: "Kérdésed van a dokumentumokkal kapcsolatban?",
    contact: "Kapcsolatfelvétel",
    home: "Vissza a főoldalra",
    documents: [
      {
        title: "Csomagolóanyagok összetétele",
        description: "Gyártói nyilatkozat az újrahasznosított anyagok, PVC, ftalátok, MOSH/MOAH és BPA felhasználásáról, a dokumentumban megadott kivételekkel.",
        dateLabel: "2026. január 21.",
      },
      {
        title: "PFAS- és nehézfém-határértékek",
        description: "Gyártói nyilatkozat a PPWR szerinti határértékek teljesítéséről, a megjelölt csomagolóanyagokra és gyártási időpontokra vonatkozóan.",
        dateLabel: "2026. június 12.",
      },
    ],
  },
  en: {
    title: "Environmental information",
    eyebrow: "Packaging and the environment",
    lead: "Declarations from the packaging manufacturer on material composition and compliance, in one place.",
    documentsTitle: "Documents to download",
    issuer: "Issued by: Rolf Bayer Vacuumverpackung GmbH",
    metadata: "PDF in English · 1 page · approx. 0.6 MB",
    open: "Open PDF",
    newTab: "in a new tab",
    download: "Download",
    note: "Please refer to the original documents for their scope, the packaging materials covered, exceptions and applicable production dates.",
    help: "Have a question about the documents?",
    contact: "Get in touch",
    home: "Back to home",
    documents: [
      {
        title: "Packaging material composition",
        description: "Manufacturer’s declaration on the use of recycled materials, PVC, phthalates, MOSH/MOAH and BPA, with the exceptions specified in the document.",
        dateLabel: "January 21, 2026",
      },
      {
        title: "PFAS and heavy metal limits",
        description: "Manufacturer’s declaration on compliance with PPWR limits for the specified packaging materials and production dates.",
        dateLabel: "June 12, 2026",
      },
    ],
  },
  de: {
    title: "Umweltinformationen",
    eyebrow: "Verpackung und Umwelt",
    lead: "Erklärungen des Verpackungsherstellers zu Materialzusammensetzung und Konformität an einem Ort.",
    documentsTitle: "Dokumente zum Herunterladen",
    issuer: "Aussteller: Rolf Bayer Vacuumverpackung GmbH",
    metadata: "PDF auf Englisch · 1 Seite · ca. 0,6 MB",
    open: "PDF öffnen",
    newTab: "in einem neuen Tab",
    download: "Herunterladen",
    note: "Geltungsbereich, erfasste Verpackungsmaterialien, Ausnahmen und zeitliche Bedingungen sind in den Originaldokumenten aufgeführt.",
    help: "Haben Sie Fragen zu den Dokumenten?",
    contact: "Kontakt aufnehmen",
    home: "Zur Startseite",
    documents: [
      {
        title: "Zusammensetzung der Verpackungsmaterialien",
        description: "Herstellererklärung zur Verwendung von Recyclingmaterial, PVC, Phthalaten, MOSH/MOAH und BPA mit den im Dokument genannten Ausnahmen.",
        dateLabel: "21. Januar 2026",
      },
      {
        title: "PFAS- und Schwermetallgrenzwerte",
        description: "Herstellererklärung zur Einhaltung der PPWR-Grenzwerte für die angegebenen Verpackungsmaterialien und Produktionszeiträume.",
        dateLabel: "12. Juni 2026",
      },
    ],
  },
};
for (const content of Object.values(copy)) {
  content.documents = content.documents.map((document, index) => ({ ...documents[index], ...document }));
}
module.exports = copy;
