const crypto = require('node:crypto');
// Demo texts are frozen snapshots. Replace them only by adding a new version after legal approval.
const previousDocs = Object.freeze({
  terms: Object.freeze({
    version: 'draft-2026-10-28',
    title: 'Partnerfelület használati feltételei – tervezet',
    sections: [
      [
        'A tervezetről',
        'Ez a helyi bemutatóhoz készült tervezet, nem végleges vagy jogilag jóváhagyott feltétel. A tényleges szolgáltatási és üzleti feltételeket a Halasi Kebpro Kft.-vel kell véglegesíteni.',
      ],
      [
        'A felület célja',
        'A jóváhagyott üzleti partnerek a felületen keresztül rendelést adhatnak le, kezelhetik a rendeléseiket, híreket olvashatnak, és rendeléshez kapcsolódó bejelentést küldhetnek.',
      ],
      [
        'Regisztráció és hozzáférés',
        'A regisztráció jóváhagyásra vár. A belépési adatok védelme a felhasználó feladata. A hozzáférés letiltható; a részletes jogosultsági és megszüntetési feltételeket külön egyeztetni kell.',
      ],
      [
        'Rendelés és árak',
        'A felület a rendelkezésre álló árat és kiszállítási határidőt mutatja. Az árak áfatartalmát, az egyeztetendő árú termékek kezelését és a rendelés üzleti következményeit a végleges dokumentumban kell meghatározni.',
      ],
      [
        'Működés és értesítések',
        'Az alkalmazás internetkapcsolattól és az eszköz beállításaitól függ. Az értesítések nem garantáltan kézbesülnek; a hír- és akcióértesítések külön állíthatók.',
      ],
      [
        'Kapcsolat és panasz',
        'A rendeléshez kapcsolódó probléma az alkalmazásban is jelezhető. A cég kapcsolattartási és panaszkezelési adatait a végleges változatban kell ellenőrizni.',
      ],
    ],
  }),
  privacy: Object.freeze({
    version: 'draft-2026-10-28',
    title: 'Partneralkalmazás adatkezelési tájékoztatója – tervezet',
    sections: [
      [
        'A tervezetről',
        'Ez a helyi bemutatóhoz készült, hiányos tájékoztató. Az adatkezelőnek az éles indulás előtt kell véglegesítenie az adatokat, jogalapokat, címzetteket és megőrzési időket.',
      ],
      [
        'A felületen kezelt adatok',
        'A regisztráció cégnevet, kapcsolattartót, telefonszámot, címet, e-mail-címet, felhasználónevet és jelszólenyomatot kezel. A rendszer rendeléseket, mentett listákat, partnerárakat, bejelentéseket, munkatársi műveleteket és értesítési beállításokat is tárolhat.',
      ],
      [
        'Értesítések és eszköz',
        'Az értesítéshez a böngésző külön engedélye szükséges. Az eszközfeliratkozás adatait a rendszer tárolja. A rendelési piszkozat és bizonyos felületi beállítások az adott böngésző helyi tárhelyén lehetnek; a felhasználás és jogalap véglegesítendő.',
      ],
      [
        'Megőrzés',
        'A helyi példában a három hónapnál régebben archivált, elmúlt kiszállítású rendelések sikeres mentés után törlődhetnek. A mentett listák és bejelentések nem tartoznak ebbe a törlésbe. Az éles megőrzési és mentési szabályokat az adatkezelőnek kell meghatároznia.',
      ],
      [
        'További egyeztetés',
        'Az adatkezelő és elérhetőségei, az egyes célokhoz tartozó jogalapok, adatfeldolgozók és esetleges adattovábbítások, pontos tárolási idők, érintetti jogok, panasztételi lehetőség, valamint a tervezett GPS-kezelés véglegesítésre várnak.',
      ],
    ],
  }),
});
// The previous snapshots remain available for existing acceptances.
const company =
  'Halasi Kebpro Kft.; székhely: 6400 Kiskunhalas, Szegedi út 8.; cégjegyzékszám: 03-09-111668; adószám: 13289665-2-03; képviselő: Horváth Anikó; telefon: +36 70 451 5002; e-mail: info@kebpro.hu; honlap: kebpro.hu.';
const previousDocsV2 = Object.freeze({
  terms: Object.freeze({
    version: 'draft-2026-10-28-v2',
    title: 'Partnerfelület használati feltételei – tervezet',
    sections: [
      [
        'Tervezet',
        'A dokumentum a weboldal közzétett cégadatai és a partnerfelület működése alapján készült. Az üzleti feltételeket a Halasi Kebpro Kft.-nek és jogi szakértőjének véglegesítenie kell.',
      ],
      ['Szolgáltató', company],
      [
        'A felület használata',
        'A jóváhagyott üzleti partnerek rendelést adhatnak le és módosíthatnak a megjelölt határidőig, tájékoztatásokat olvashatnak, és üzenetet vagy rendeléshez kapcsolódó bejelentést küldhetnek.',
      ],
      [
        'Hozzáférés',
        'A regisztrációhoz valós adatok szükségesek, a hozzáférést a vállalkozás hagyja jóvá. A felhasználó köteles a belépési adatait védeni; a hozzáférés felfüggeszthető. A felfüggesztés és megszüntetés részletes feltételeit véglegesíteni kell.',
      ],
      [
        'Rendelés és árak',
        'Az alkalmazásban megadott árak nettó árak. A termékek, mértékegységek, esetleges árkedvezmények, a rendelés visszaigazolásának és a számlázásnak részletes üzleti szabályai véglegesítésre várnak.',
      ],
      [
        'Értesítések',
        'A böngészős értesítések engedélyhez és az eszköz, valamint a szolgáltatások működéséhez kötöttek; a kézbesítés nem garantálható.',
      ],
      [
        'Kapcsolat és panasz',
        'Kapcsolat: info@kebpro.hu, +36 70 451 5002. Rendeléshez kapcsolódó probléma az alkalmazásban is bejelenthető. A cég honlapján panaszkezelési szabályzat található.',
      ],
    ],
  }),
  privacy: Object.freeze({
    version: 'draft-2026-10-28-v2',
    title: 'Partneralkalmazás adatkezelési tájékoztatója – tervezet',
    sections: [
      [
        'Tervezet',
        'Ez a honlap adatkezelési tájékoztatója és az alkalmazás működése alapján összeállított tervezet. A partneralkalmazásra vonatkozó adatkezelési döntéseket és a dokumentumot az adatkezelőnek, jogi szakértő segítségével véglegesítenie kell.',
      ],
      ['Adatkezelő és kapcsolat', company],
      [
        'A kezelt adatok',
        'A regisztrációhoz cégnevet, kapcsolattartót, telefonszámot, címet, e-mail-címet, felhasználónevet és jelszólenyomatot kezelünk. Az alkalmazás rendeléseket, mentett listákat, árakat, üzeneteket, bejelentéseket és azok fényképeit, munkatársi műveleteket és értesítési beállításokat is tárolhat.',
      ],
      [
        'Értesítések és helyi tárolás',
        'A push értesítéshez a böngésző engedélye és eszközfeliratkozási adatok szükségesek. A rendelési piszkozat és egyes felületi beállítások az eszközön tárolódnak.',
      ],
      [
        'Megőrzés és biztonsági mentés',
        'Az alkalmazás a beállításai szerint a régebben archivált, elmúlt kiszállítású rendeléseket törölheti. A honlap tájékoztatója az ottani rendelésekre más megőrzési időt is említ: az alkalmazás, a számlázási adatok, a bejelentések, fényképek és biztonsági mentések tényleges megőrzését külön kell meghatározni.',
      ],
      [
        'Érintetti jogok és panasz',
        'Az adatkezeléssel kapcsolatos kérdésekkel a fenti címen lehet a vállalkozáshoz fordulni. A tájékoztató az érintetti jogokat és a hatósági panasz lehetőségét a honlap adatkezelési tájékoztatója alapján részletezi; a végleges alkalmazási változatban ezeket ellenőrizni és pontosítani kell.',
      ],
      [
        'Véglegesítendő',
        'Az egyes kezelési célok jogalapjai, adatfeldolgozók, adattovábbítások, a képek és a mentések kezelése, megőrzési idők, címzettek, valamint a ténylegesen használt szolgáltatások adatai egyeztetésre várnak.',
      ],
    ],
  }),
});
// New versions do not change the recorded content or hashes of earlier acceptances.
const previousDocsV3 = Object.freeze({
  terms: Object.freeze({
    version: '2026-10-28-v3',
    title: 'Partnerfelület használati feltételei',
    sections: [
      ['Szolgáltató', company],
      [
        'A partnerfelület használata',
        'A felület üzleti partnerek számára készült. Regisztráció után a hozzáférésről a Halasi Kebpro Kft. munkatársai döntenek. A felhasználó a belépési adatait köteles bizalmasan kezelni.',
      ],
      [
        'Rendelések',
        'A partner a megjelenített kiszállítási napokra adhat le rendelést vagy jelezheti, ha nem kér szállítást. A rendelés módosítása a felületen látható határidőig lehetséges. A rendelés beérkezése és feldolgozása a felületen követhető.',
      ],
      [
        'Árak',
        'A felületen szereplő árak nettó árak. A partnerhez beállított egyedi ár, ennek hiányában az alapár érvényes. Az általános akciók módosíthatják a megjelenített árat. Hiányzó ár esetén az értékesítő munkatársakkal szükséges egyeztetni.',
      ],
      [
        'Értesítések',
        'A böngészős értesítésekhez az eszköz engedélye szükséges, és azok a beállításokban kezelhetők. A kézbesítés függ az eszköz és az értesítési szolgáltatás működésétől.',
      ],
      [
        'Kapcsolat és panasz',
        'Kapcsolat: info@kebpro.hu, +36 70 451 5002. A partnerfelületen rendeléshez kapcsolódó reklamáció és általános visszajelzés is küldhető. A társaság panaszkezelési szabályzata a kebpro.hu/panaszkezelesi-szabalyzat oldalon érhető el.',
      ],
    ],
  }),
  privacy: Object.freeze({
    version: '2026-10-28-v3',
    title: 'Partnerfelület adatkezelési tájékoztatója',
    sections: [
      ['Adatkezelő', company],
      [
        'A partnerfelület adatai',
        'A regisztráció során a felület a cég nevét, a kapcsolattartó nevét, telefonszámát, szállítási címét, e-mail-címét, felhasználónevét és a jelszó védett lenyomatát kezeli. A használat során rendelések, mentett rendelési listák, árak, üzenetek, bejelentések és azokhoz csatolt képek, valamint a hozzáférés és az értesítések beállításai is tárolásra kerülhetnek.',
      ],
      [
        'Értesítések és eszköz',
        'Az értesítés küldéséhez a böngésző engedélye és az eszköz push-feliratkozásának adatai szükségesek. A rendelési piszkozat és egyes beállítások a felhasználó eszközén is tárolódhatnak.',
      ],
      [
        'Megőrzés',
        'A partnerfelületen a legalább három hónapja archivált, elmúlt kiszállítású rendelések sikeres mentés után törlődhetnek. A kezeletlen rendelések, a mentett listák és a bejelentések nem tartoznak e törlés alá. A rendszer a helyi biztonsági mentésekből legfeljebb 14 példányt tart meg.',
      ],
      [
        'Adatkezelési tájékoztató',
        'A Halasi Kebpro Kft. weboldalának adatkezelési tájékoztatója a kebpro.hu/adatkezelesi-tajekoztato oldalon érhető el. Ebben a társaság az érintetti jogokról és a panasztételi lehetőségekről is tájékoztatást ad. Adatvédelmi kérdés esetén keress minket az info@kebpro.hu címen.',
      ],
    ],
  }),
});
const docs = Object.freeze({
  terms: previousDocsV3.terms,
  privacy: Object.freeze({
    ...previousDocsV3.privacy,
    version: '2026-10-29-v4',
    sections: previousDocsV3.privacy.sections.map(([title, body]) =>
      title === 'Megőrzés'
        ? [
            title,
            'A partnerfelületen a legalább három hónapja archivált, elmúlt kiszállítású rendelések sikeres mentés után törlődhetnek. A lezárt bejelentések és csatolt képeik a lezárás után négy héttel automatikusan törlődhetnek; a nyitott bejelentések nem. A mentett rendelési listák nem tartoznak e törlés alá. A rendszer a helyi biztonsági mentésekből legfeljebb öt példányt tart meg.',
          ]
        : [title, body],
    ),
  }),
});
function hash(doc) {
  return crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex');
}
function snapshot(kind) {
  const d = docs[kind];
  return { version: d.version, hash: hash(d) };
}
function resolve(kind, version) {
  return docs[kind]?.version === version
    ? docs[kind]
    : previousDocsV3[kind]?.version === version
      ? previousDocsV3[kind]
      : previousDocsV2[kind]?.version === version
        ? previousDocsV2[kind]
        : previousDocs[kind]?.version === version
          ? previousDocs[kind]
          : null;
}
function verifyAcceptance(input) {
  const terms = snapshot('terms'),
    privacy = snapshot('privacy');
  const { assert } = require('./domain');
  assert(input.termsAccepted === true, 'A használati feltételek elfogadása szükséges.');
  assert(
    input.termsVersion === terms.version &&
      input.termsHash === terms.hash &&
      input.privacyVersion === privacy.version &&
      input.privacyHash === privacy.hash,
    'A dokumentumok időközben megváltoztak. Frissítsd az oldalt és olvasd el őket újra.',
    409,
  );
  return {
    terms,
    privacy,
    termsDocument: JSON.stringify(docs.terms),
    privacyDocument: JSON.stringify(docs.privacy),
    acceptedAt: new Date().toISOString(),
  };
}
module.exports = { snapshot, resolve, verifyAcceptance };
