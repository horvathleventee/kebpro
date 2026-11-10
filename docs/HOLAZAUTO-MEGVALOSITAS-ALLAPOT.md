# Járműkövetés – működés és beállítás

## Működés

A munkatárs a **Járműkövetés** fülön kiválasztja a napot, a túrát és a HolAzAutó járműlistájából az autót; a mentéskor a rendszer a katalógusban is rögzíti az eszközt. Az aktuális pozíció nélkül rendelkezésre álló eszköz is kiválasztható. A hozzárendelés csak az adott napra érvényes, módosítható és eltávolítható.

A partner a **Beállítások / Szállítási pont a térképen** résznél megjelölheti a nyilvántartott címéhez tartozó pontot. Ez javaslat, amelyet a munkatársnak a **Járműkövetés / Partner szállítási pontja** résznél térképen ellenőriznie és jóváhagynia kell. A munkatárs közvetlenül is kijelölheti a partner pontját, illetve a rendelésben szereplő eltérő címhez külön pontot adhat meg. A nyilvántartott címet a munkatárs ugyanitt módosíthatja; ez csak a későbbi rendelésekre vonatkozik, a meglévő rendelés címét nem írja át. A javaslat önmagában nem ad követési jogosultságot. A rendszer nem geokódol automatikusan: a tényleges cím és a kiválasztott pont összevetése szükséges. Címváltozáskor új ellenőrzés kell; hiányzó, eltérő vagy bizonytalan cím esetén nincs helymegjelenítés.

A partner a kiszállítás napján, magyarországi idő szerint éjféltől éjfélig, csak a saját egyértelmű, tényleges rendelésének túrájához rendelt járművet láthatja, ha az legfeljebb 20 km-re van a címétől. Áthelyezéskor a hozzárendelés nem kerül át az új napra. Régi, túra nélküli vagy ütköző rendelés esetén nincs hozzáférés. Az archiválás önmagában nem szünteti meg a jogosultságot.

A térkép percenként frissül, és öt percnél régebbi mérés nem látható. A beállítás vagy jogosultság módosítása a következő ellenőrzéskor jut érvényre; egy már közölt helyadatot visszavonni nem lehet. A mozgatható térkép MapLibre és OpenFreeMap segítségével jelenik meg; a térképszolgáltató megkapja a megjelenített területet és az IP-címet. A kötelező térképi forrásmegjelölés látható. Éles használat előtt ellenőrizni kell a szolgáltatás feltételeit, rendelkezésre állását és az adatkezelési tájékoztatót.

A háttérmunkás a nyitott portáltól függetlenül vizsgálja a feliratkozott partnereket. Az első 20 km-en belüli friss mérésnél naponta egyszer általános push értesítést készít; helyadatot nem ír bele. Küldés előtt újra ellenőrzi a rendelést, hozzárendelést és távolságot. A push külső kézbesítése késhet vagy elmaradhat; a lejárata legfeljebb egy perc és nem nyúlik szándékosan a nap végén túl. Az éles push HTTPS-t, felhasználói engedélyt, élő feliratkozást, VAPID-beállítást és percenként futó megbízható háttérmunkást igényel. iPhone-on a támogatott web push a főképernyőre telepített alkalmazáshoz kötött.

## Helyi bemutató

A projektkönyvtárban futtasd: `node scripts/tracking-preview.cjs`. A cím: `http://127.0.0.1:38980/partner/`. Partner: `demo-partner` / `demo-partner-123`; admin: `admin` / `demo-admin-123`. Ezek kizárólag a külön `data/tracking-demo` SQLite állományhoz tartozó nyilvános mintajelszavak. A pozíció szimulált budapesti pont, a push szimulációs módú; ez nem bizonyítja az éles szolgáltatások működését. A munkás percenként fut a bemutató folyamatában.

## HolAzAutó és háttérfolyamat

Alapállapotban az éles szolgáltató kikapcsolt. Elkülönített, titkos szerverbeállításokban kell megadni: `PORTAL_TRACKING_ENABLED=true`, `HOLAZAUTO_ORIGIN=https://...`, `HOLAZAUTO_LOGIN` és `HOLAZAUTO_PASSWORD`. Az origin csak HTTPS eredet lehet útvonal nélkül. Titkot ne tegyél forráskódba vagy böngészőbe. A szerver újrahasználja a tokent, a partnernél kizárólag a hozzárendelt numerikus eszközazonosítót kérdezi le, öt másodperces időkorláttal, korlátozott válaszmérettel és átirányítás nélkül. Sikertelen belépés vagy 401-es válasz után ugyanaz a folyamat nem próbál újra bejelentkezni az újraindításáig. A külön indított folyamatok ezt a tiltást nem osztják meg; az éles időzítésnél a többszöri belépési hiba elleni tartós védelem külön ellenőrzendő. A partnernek a szerver csak koordinátát és mérési időt ad tovább, sebességet vagy más telemetriát nem.

A staging munkást (`scripts/partner-staging-worker.cjs`) a telepítési környezetben percenként ütemezni kell, és ugyanazokat a privát szolgáltatói beállításokat kell megkapnia. Az éles push meglévő `PORTAL_PUSH_LIVE`, `PORTAL_VAPID_SUBJECT`, HTTPS origin és feliratkozás beállításait is ellenőrizni kell. A SQLite állapotban a követési adatok az állapotdokumentumban, PostgreSQL-ben metaadatként tárolódnak; a normál szerializált írás, import és mentés validálja a túra/nap ütközést. A mentés tartalmazza ezeket az adatokat. A párhuzamos PostgreSQL-írásokat az alkalmazás tranzakciós zára védi; közvetlen SQL-módosítás nem támogatott.

**Élesítés előtt:** a szolgáltatóval ellenőrizni kell a tényleges URL-t, jogosultságot, azonosítókat, tokenlejáratot, válaszformátumot és kvótát. A térkép és címkezelés adatvédelmi, ár- és licencfeltételeit, a telepített háttérütemezőt, az éles PostgreSQL-t, valamint az Android és iPhone push-kézbesítést valós környezetben külön tesztelni kell. A tesztek nem végeztek élő szolgáltatói hívást vagy valódi push-küldést.

## Ellenőrzés

`node --test tests/holazauto.test.js tests/tracking-policy.test.js tests/tracking-service.test.js tests/tracking-monitor.test.js`, majd `npm run test:partner` és `npm run build:partner-react`.

## Flottanézet és címek – következő fejlesztési lépés

A céges kezelőben külön **Járműkövetés** fül mutatja a HolAzAutó-fiók érvényes helyadattal rendelkező eszközeit. Az „Összes jármű” vagy egy jármű választható; az adatok percenként frissülnek. A térkép húzható és nagyítható. Az admin végpont a dokumentált `positions/current` hívást `assetIds` nélkül végzi, és csak munkatársi munkamenettel érhető el. A rendszámot a `light/assets` listában az adott `DeviceAsset` saját `licensePlate` mezőjéből olvassuk, ötperces memóriabeli gyorsítótárral; járműveket és eszközöket nem párosítunk név alapján. Hiányzó rendszámhoz a munkatárs a helyi katalógusban adhat meg rendszámot; más esetben az eszközazonosító látható. A partner a rendszámot is kizárólag a jogosult, 20 km-en belüli autóhoz kapja meg.

Az ellenőrzött címkoordináták ugyanannál a partnernél, azonos szállítási címszöveghez a későbbi rendeléshez is felhasználhatók. Az újonnan ellenőrzött érték a partner adatában is megmarad; a régebbi rendelések ellenőrzött adatait is figyelembe vesszük. Több eltérő, ellenőrzött történeti találat esetén nincs automatikus választás. A módosított vagy hiányzó címhez nincs automatikus jogosultság. Másik partner koordinátája nem használható fel.

A túránkénti, légvonalban mért láthatósági távolság a túra beállításaiban módosítható (1–500 km); meglévő beállítás nélkül 20 km. A jármű láthatósága és az értesítés ugyanazt a határt használja.

Új regisztrációkor a szállítási cím automatikus keresése csak külön beállított `ADDRESS_SEARCH_URL` esetén fut. A keresőnek alkalmasnak kell lennie partnercímek kezelésére, és a Nominatim keresési formátumát kell támogatnia. A megtalált pont jóváhagyásra váró javaslat, nem ellenőrzött koordináta. Keresési hiba nem akadályozza a regisztrációt. A nyilvános Nominatim személyes vagy bizalmas adatok beküldését nem kéri, ezért azt nem szabad automatikus regisztrációs címkeresőként beállítani.

A partner és a munkatárs kifejezetten indított címkereséssel segítheti a pont kijelölését. A keresett címet a szerver a Nominatim szolgáltatásnak továbbítja; nincs automatikus keresés vagy gépelés közbeni lekérdezés. A találatot a felhasználó választja ki és a térképen pontosíthatja; a partner javaslata továbbra is munkatársi jóváhagyást igényel. A helyi előnézetben gyorsítótár és sebességkorlát védi a szolgáltatást. Éles bevezetés előtt ellenőrizni kell a szolgáltató használati és adatkezelési feltételeit, valamint több szerveres működésnél közös sebességkorlátot kell biztosítani.
