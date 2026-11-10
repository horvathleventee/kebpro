# Kebpro partnerportál – tesztelési és állapotjelentés

Dátum: 2026. november 10. Hatókör: a helyi munkaterületen található partner- és adminportál, a címkeresés, a szállítási pont, a HolAzAutó integráció és az ezekhez kapcsolódó böngészős felületek. A vizsgálat nem jelent éles telepítést vagy teljes körű biztonsági, jogi, akadálymentességi auditot.

## Eredmények

| Ellenőrzés | Eredmény | Mire terjedt ki |
|---|---|---|
| `npm run build:partner-react` | Sikeres | TypeScript-ellenőrzés és a partner/admin React bundle fordítása. |
| `npm run test:partner` | 142 sikeres, 1 kihagyott | Rendelés, árak, regisztráció, hozzáférés, panasz, üzenetek, munkamenet, háttérfolyamatok, tárolás és egyéb portáltesztek. |
| `npm run test:tracking` | 34 sikeres | Jogosultság, távolsághatár, dátum, cím, járműhozzárendelés, járműlista, háttérellenőrzés, adatvédelem, címkeresés és állapotváltozás közbeni újraellenőrzés. |
| `node --test tests/address-search.test.js tests/registration-address-demo.test.js tests/legal-privacy-version.test.js tests/tracking-mock.test.js` | 5 sikeres | Címkereső-adapterek, regisztrációs találat és cím összerendelése, régi és új tájékoztatóváltozat, mintajárművek pozíciója. |
| `node --test tests/news-retention.test.js` | 1 sikeres | Hírek megőrzési szabálya. |
| 5 izolált mobil Chromium UI smoke | Sikeres a mobil elrendezés javítása után | A külön felsorolt felhasználói és adminfolyamatok. |
| Külön izolált regisztrációs térkép | Sikeres | Kérelmi pont és jelölő megjelenik; az ellenőrzés és hozzáférés jóváhagyása mentett, ellenőrzött koordinátát eredményez. |

Az egy kihagyott PostgreSQL-teszt valódi adatbázis-kapcsolatot, újraindítást, visszagörgetést és párhuzamos írást vizsgálna. A `PORTAL_TEST_DATABASE_URL` nem állt rendelkezésre; a teszthez dedikált, üres tesztadatbázis szükséges. A többi ellenőrzés eredménye nem bizonyítja a valódi PostgreSQL-környezet helyességét.

## Böngészős próbák

A böngészős tesztek izolált, memóriabeli SQLite-környezetben, fej nélküli Chromiumon futottak. Külső levelezés és valós partneradatok helyett tesztadatokat, illetve helyettesítő szolgáltatásokat használtak.

- `node scripts/partner-auth-react-smoke.cjs` – jelszó-visszaállítás, meghívó és belépési tartalékfelület.
- `node scripts/partner-calls-smoke.cjs` – mobil híváscsoportok és szűrés.
- `node scripts/partner-reschedule-smoke.cjs` – túra áthelyezése mobil felületen.
- `node scripts/partner-session-react-smoke.cjs` – partneri és munkatársi munkamenet megújítása.
- `node scripts/partner-ui-smoke.cjs` – mobil regisztráció és feltételek, rendelés, ár, bejelentés és válasz, csomagolás, piszkozat visszatöltése és történeti ár; oldalhiba nélkül.

## A tesztelés során javított hibák

1. **Mobil regisztrációs elrendezés:** egy későbbi CSS-szabály két oszlopot kényszerített keskeny képernyőn, így a regisztráció gombja túlnyúlt a nézeten. A mobil nézet ismét egyoszlopos; az érintett teljes mobil UI smoke a javítás után sikeres.
2. **Demójárművek helyzete:** a helyi mintaszolgáltató korábban eszközazonosítótól függetlenül az első mintajármű helyét adta vissza. Most minden mintajármű a saját flottabeli helyét kapja, ismeretlen azonosítót a szolgáltató elutasít. Ez a hiba a demószolgáltatóban volt; a valódi HolAzAutó-szolgáltatóra nem következtethető.
3. **Adatkezelési szöveg elavultsága:** az aktív helyi tájékoztató korábbi változata nem írta le az új Geoapify, OpenFreeMap és HolAzAutó adatfolyamokat. Új, kifejezetten tervezetként jelölt helyi verzió és részletes felülvizsgálati tervezet készült; a korábbi verzió visszakereshető marad.

## Nem igazolt vagy külön próbát igényel

- Valódi PostgreSQL roundtrip, újraindítás, visszagörgetés és konkurens írás; ehhez külön dedikált tesztadatbázis kell.
- Valós járművel végzett teljes kiszállítás, egy tényleges partner rendelésének és helyének végponttól végpontig ellenőrzése, illetve az időközben változó GPS-jel viselkedése. A tesztelés nem indított ismételt HolAzAutó-bejelentkezést.
- Élő, készülékre megérkező push-értesítés, éles SMTP-kézbesítés, Android- és iOS-készülék, telepített alkalmazás viselkedése; a helyi előnézet szimulált push-folyamatot használ.
- Éles szerver, jogosultságok, visszaállított mentések, több szerveren működés, kvóták, többfelhasználós terhelés, biztonsági teszt és akadálymentesség.
- A Geoapify kapcsolata egy korábbi helyi próbában nyilvános mintacímmel sikeres volt; a címek lefedettsége és minősége minden magyar címre nem bizonyított.
- Geoapify-kulccsal a jelenlegi regisztráció találat kiválasztását követeli; szolgáltatáskieséskor vagy nem található cím esetén nincs kész, kézi megadáson alapuló végleges kerülőút. A választási azonosítók folyamatmemóriában vannak, ezért újraindítás és több példány esetén a folyamat megszakadhat.
- A partnernek megjelenő általános „helyadat nem érhető el” üzenet több különböző okot fedhet, többek között a mai rendelés vagy a napi hozzárendelés hiányát.

## Adatkezelési állapot

Az új, részletes [adatkezelési tájékoztató tervezet](PARTNER-ADATKEZELESI-TAJEKOZTATO-2026-11-10.md) a megvalósított adatfolyamokat és a még tisztázandó tényeket tartalmazza. A helyi portál új verziója szintén tervezetként jelöli a szöveget, a korábbi dokumentumváltozat változatlanul feloldható. A szöveg nem állítja, hogy a cég már elfogadta a szolgáltatói adatfeldolgozási szerződéseket, megállapította a végleges megőrzési időket vagy elvégezte a sofőrök jogalapjának vizsgálatát. Ezeket az adatkezelőnek és szakértőjének éles bevezetés előtt véglegesítenie kell.

Részletes funkcionális és üzemeltetési leírás: [Rendszerműködési útmutató](RENDSZER-MUKODESI-UTMUTATO.md).
