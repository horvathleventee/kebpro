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
const previousDocsV4 = Object.freeze({
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
// The new local preview is a draft until the controller verifies the missing legal and operational facts.
const previousDocsV5 = Object.freeze({
  terms: previousDocsV4.terms,
  privacy: Object.freeze({
    version: 'draft-2026-11-10-v5',
    title: 'Partnerfelület adatkezelési tájékoztatója – tervezet',
    sections: [
      ['A dokumentum állapota', 'Ez a helyi előnézethez készített tervezet. A tényleges adatkezelési jogalapokat, szolgáltatókat, megőrzési időket és nemzetközi adattovábbításokat az adatkezelőnek élesítés előtt ellenőriznie és véglegesítenie kell.'],
      ['Adatkezelő és kapcsolat', company],
      ['Érintettek és kezelt adatok', 'A partner és kapcsolattartó adatai: cégnév, név, e-mail, telefonszám, szállítási cím, felhasználónév, védett jelszólenyomat, regisztráció és hozzáférés állapota. A felület rendeléseket, árakat, mentett listákat, rendelési megjegyzéseket, bejelentéseket és azokhoz csatolt képeket, beállításokat, műveleti naplókat és értesítési adatokat is kezelhet. A cégadatok önmagukban nem minden esetben személyes adatok.'],
      ['Célok és jogalapok', 'A kezelés célja a partnerkapcsolat és rendelés kezelése, a kiszállítás szervezése, a kért értesítések és hírek küldése, a bejelentések kezelése, valamint a hozzáférés biztonsága és visszakövethetősége. A fiókhoz és rendeléshez szükséges adatok hiányában e szolgáltatások nem működnek. A tényleges érintetti kör, a célonkénti jogalap, az esetleges jogosérdek-mérlegelés és az opcionális értesítések jogalapja adatkezelői felülvizsgálatra vár; a böngésző engedélye vagy a használati feltételek elfogadása önmagában nem általános adatkezelési hozzájárulás.'],
      ['Címkeresés és szállítási pont', 'A Geoapify használatakor a beírt keresett cím a szerverről a címkereső szolgáltatóhoz kerül, amely a kérő szerver IP-címét is megismerheti. A kiválasztott címet és koordinátát a rendszer a partnerhez kapcsolhatja, a munkatárs ellenőrizheti vagy módosíthatja. A szolgáltató adatfeldolgozói megállapodását és a tájékoztatás részleteit élesítés előtt ellenőrizni kell.'],
      ['Térkép és járműkövetés', 'A térképet a böngésző az OpenFreeMap szolgáltatótól tölti be; a szolgáltató a böngésző IP-címét és a lekért térképi területre utaló adatokat megismerheti. A HolAzAutó a járművek helyadatait szolgáltatja a szervernek. A partner kizárólag a saját, aznapi rendeléséhez tartozó hozzárendelt jármű friss helyzetét és rendszámát láthatja, ha a jármű a túrán beállított, légvonalban számolt távolságon belül van az ellenőrzött szállítási ponthoz. A térképi kérelmek során külső szolgáltató bevonása és az érintettek tájékoztatása ellenőrzendő.'],
      ['Sofőrök és munkavállalók', 'A jármű helyzete a sofőrrel vagy más természetes személlyel összekapcsolható lehet. A gépjárműkövetés célját, jogalapját, hozzáféréseit és megőrzését, valamint a sofőrök és munkavállalók részére adandó külön tájékoztatást a bevezetés előtt az adatkezelőnek külön meg kell vizsgálnia.'],
      ['Értesítések és helyi tárhely', 'A böngészős értesítésekhez eszközengedély és a böngésző pushszolgáltatójának feliratkozási adatai szükségesek. Az értesítési kategóriák a felületen kezelhetők. A böngészőben munkamenetsüti, rendelési piszkozat és egyéb felületi beállítások, valamint a működést és értesítést támogató alkalmazáskód tárolódhat. A push szolgáltatója a böngészőtől függhet.'],
      ['Megőrzés', 'A jelenlegi alkalmazás a legalább három hónapja archivált, elmúlt kiszállítású rendeléseket, valamint a legalább 28 napja lezárt bejelentéseket és kapcsolódó képeiket megfelelő friss mentés után törölheti. A helyi mentési beállítás alapértéke öt mentés. A fiókok, helyadatok, naplók, feliratkozások, külső mentések és számviteli bizonylatok éles megőrzését, továbbá a mentésekből való törlés kezelését az adatkezelőnek célonként meg kell határoznia.'],
      ['Hozzáférés és címzettek', 'Az adatokhoz a jogosultsággal rendelkező céges munkatársak férhetnek hozzá. A tényleges tárhely-, adatbázis-, e-mail-, mentési és pushszolgáltatók, a HolAzAutó és a Geoapify szerződéses szerepeit, alvállalkozóit és az esetleges EGT-n kívüli adattovábbításokat a bevezetett szolgáltatás alapján kell véglegesíteni.'],
      ['Jogok és jogorvoslat', 'Az érintett a jogszabályi feltételek szerint hozzáférést, helyesbítést, törlést, korlátozást kérhet, tiltakozhat, és adott esetben adathordozhatósággal élhet. A hozzájáruláson alapuló adatkezeléshez adott hozzájárulás visszavonható. Kérelemmel az info@kebpro.hu címen vagy az adatkezelő fenti elérhetőségein lehet fordulni. Panasz tehető a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (naih.hu), valamint bírósági jogorvoslat is igénybe vehető.'],
    ],
  }),
});
const docs = Object.freeze({
  terms: previousDocsV5.terms,
  privacy: Object.freeze({
    version: 'draft-2026-11-10-v6',
    title: 'Partnerfelület adatkezelési tájékoztatója – tervezet',
    sections: [
      ['Adatkezelő és kapcsolat', company],
      ['A tájékoztató hatálya', 'A tájékoztató a Halasi Kebpro Kft. partnerfelületének használatához kapcsolódó adatkezelést ismerteti. Érintettek lehetnek a partnerek természetes személy kapcsolattartói, egyéni vállalkozók, munkatársak és a kiszállító járművek sofőrjei.'],
      ['A kezelt adatok', 'A regisztrációhoz a cég vagy üzlet neve, a kapcsolattartó neve, e-mail-címe, telefonszáma, a szállítási cím, a felhasználónév és a jelszó védett lenyomata tartozik. A portál kezelheti a regisztráció és hozzáférés állapotát, a rendelések adatait, a mentett listákat, árakat, rendelési megjegyzéseket, bejelentéseket és a csatolt képeket, az értesítési beállításokat és a munkatársi műveletek adatait.'],
      ['Az adatkezelés célja', 'Az adatok kezelése a partnerkapcsolat és a hozzáférés biztosítását, a rendelések fogadását és teljesítését, a kiszállítás szervezését, a bejelentések kezelését, a kiválasztott értesítések küldését, valamint a hozzáférés és a módosítások biztonságát szolgálja. A regisztrációhoz és rendeléshez szükséges adatok nélkül e szolgáltatások nem vehetők igénybe.'],
      ['Címkeresés és szállítási pont', 'A Geoapify címkereső használatakor a megadott keresési szöveg a portál szerveréről eljut a Geoapify szolgáltatóhoz, amely a kérő szerver IP-címét és technikai adatait is megismerheti. A kiválasztott cím és koordináta a partnerhez kapcsolódó szállítási pont meghatározására szolgál. A pontot munkatárs ellenőrizheti és pontosíthatja.'],
      ['Térkép és járműkövetés', 'A térképet a böngésző az OpenFreeMap szolgáltatótól tölti be; a szolgáltató és közreműködői a böngésző IP-címét és a kért térképi területre utaló adatokat megismerhetik. A HolAzAutó a jármű helyadatait a portál szerverének adja át. A partner az adott napi saját rendeléséhez rendelt jármű friss helyzetét és – ha rendelkezésre áll – rendszámát láthatja, amikor a jármű a túránál beállított, légvonalban mért távolságon belül van az ellenőrzött szállítási ponthoz. A funkció a partner készülékének GPS-helyzetét nem igényli.'],
      ['Értesítések és böngészőben tárolt adatok', 'A böngészős pushértesítéshez a készülék engedélye és a böngésző pushszolgáltatójának feliratkozási adatai szükségesek. Az értesítések egyes kategóriái a beállításokban kezelhetők. A bejelentkezéshez munkamenetsütit használunk; a rendelési piszkozat, egyes felületi beállítások és az alkalmazás működését támogató állományok a böngészőben is tárolódhatnak.'],
      ['Hozzáférés és szolgáltatók', 'A partneradatokhoz a társaság ügyintézésre jogosult munkatársai férhetnek hozzá. A címkeresésben a Geoapify, a térkép megjelenítésében az OpenFreeMap, a jármű helyadatainak biztosításában a HolAzAutó vesz részt. Az értesítések kézbesítésében a használt böngészőtől függő pushszolgáltató működhet közre.'],
      ['Megőrzés és törlés', 'A partnerfelület jelenlegi működésében a legalább három hónapja archivált, elmúlt kiszállítású rendelések megfelelő friss mentés után törlődhetnek. A legalább 28 napja lezárt bejelentések és kapcsolódó képeik megfelelő friss mentés után törlődhetnek; a nyitott bejelentésekre ez a szabály nem vonatkozik. A helyi mentési beállítás alapértéke öt példány.'],
      ['Érintetti jogok', 'Az érintett a jogszabályi feltételek szerint tájékoztatást és hozzáférést kérhet, helyesbítést, törlést vagy adatkezelés-korlátozást kérhet, tiltakozhat, és adott esetben adathordozhatósággal élhet. A hozzájáruláson alapuló adatkezeléshez adott hozzájárulás visszavonható; ez a visszavonás előtti adatkezelés jogszerűségét nem érinti. Kérelmével az info@kebpro.hu címen vagy az adatkezelő fenti elérhetőségein fordulhat a társasághoz.'],
      ['Panasz és jogorvoslat', 'Az érintett panaszt tehet a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH, naih.hu), és bírósági jogorvoslatot is igénybe vehet. A társaság a kérelmekre a GDPR szerinti határidőben válaszol. A társaság honlapjának külön adatkezelési tájékoztatója a kebpro.hu/adatkezelesi-tajekoztato oldalon érhető el.'],
    ],
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
    : previousDocsV5[kind]?.version === version
      ? previousDocsV5[kind]
    : previousDocsV4[kind]?.version === version
      ? previousDocsV4[kind]
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
