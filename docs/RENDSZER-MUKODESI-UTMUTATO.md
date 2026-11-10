# Kebpro partnerportál – működési és üzemeltetési útmutató

Állapot: 2026. november 10. Ez az útmutató a projektben megtalálható megvalósítást ismerteti. A helyi bemutató és a tesztkörnyezet nem azonos egy éles, jogilag és üzemeltetési szempontból végleges rendszerrel. A vizsgálatok eredményeit külön jelentés rögzíti; a dokumentum önmagában nem bizonyít sikeres éles tesztet vagy telepítést.

**Eltérés a régebbi útmutatóktól:** egyes korábbi HolAzAutó-tervek minden túrára 20 km-t és kizárólag Nominatim-keresést említenek. A jelenlegi kódban a követési távolság túránként állítható, és konfigurált Geoapify-kulccsal a címkeresés a Geoapify szolgáltatást használja.

## 1. Szerepkörök és fő folyamat

* **Partner:** regisztrálhat, céges jóváhagyás után bejelentkezhet, rendelhet vagy jelezheti, hogy nem kér kiszállítást, megnézheti saját rendeléseit, híreit és beállításait. A szállítási pontjára javaslatot adhat, és a feltételek teljesülésekor a saját rendeléséhez rendelt autót követheti.
* **Céges munkatárs:** a saját adminfelületén bírálja el a regisztrációkat, túrákhoz rendeli a partnereket, kezeli a rendeléseket, termékeket, árakat és panaszokat; a járműkövetési felületen dolgozik a járművekkel, napi beosztásokkal és címekkel.
* A partner és az admin külön útvonalat és külön munkamenetet használ. A szerver ellenőrzi a szerepkört; a partner nem választhat tetszőleges követendő eszközt vagy másik partner címét.

A portál fő útvonalai: partner `/partner/`, admin `/partner-admin/`. A kezdőoldali járműkövetési kártya nem bizonyítja önmagában, hogy már van követhető szállítás.

## 2. Regisztráció és szállítási cím

1. A jelentkező megadja a cég, kapcsolattartó, e-mail, mobiltelefonszám, szállítási cím, felhasználónév és jelszó adatait; elfogadja a megjelenített feltételeket. A kérelem jóváhagyásig függőben marad, és a munkatárs dönt róla. A regisztrációs visszaigazoló e-mail hibája nem törli a kérelmet.
2. Ha az alkalmazás Geoapify-kulccsal indult, a regisztrációban címkeresés és találatválasztás működik. A kliens nem az API-kulcsot, hanem az alkalmazás saját végpontját használja; a keresett cím a szerveren át a Geoapify-hoz kerül. A felület gombnyomással keres; nem szükséges térképet kezelni a regisztrálónak.
3. A találat kiválasztása címhez és ponthoz kötött javaslatot hoz létre. A regisztrációkor a szerver az időben korlátozott választási azonosítót és a pontos címszöveget összeveti. A kiválasztott pont önmagában még nem tekinthető ellenőrzöttnek.
4. Az admin a **Regisztrációk** oldalon kijelöli a partner túráit. Ha van címjavaslat, egy kisebb térképen láthatja, kattintással pontosíthatja, és külön jelölőnégyzettel ellenőrzöttnek nyilváníthatja. A hozzáférés jóváhagyásával a külön jelölt pont is menthető. Ha nincs bejelölve az ellenőrzés, a hozzáférés elfogadható, de a pont javaslat marad; a **Járműkövetés / Partner szállítási pontja** részen később ellenőrizhető.
5. Olyan új jóváhagyott partnernél, aki nem adott meg regisztrációs pontot, a rendszer az első rendelés előtt pontjavaslatot kér. A beküldött javaslat után a rendelés engedhető, a járműkövetéshez viszont külön munkatársi jóváhagyás szükséges. A korábban létrehozott partnerekre a jelző nem kerül utólag automatikusan.

**Jelenlegi korlát:** ha a Geoapify-s regisztrációs kereső be van kapcsolva, a kód találatválasztást kér a regisztráció befejezéséhez; nincs kész kézi címre váltó hibakerülő ág. A hiányos magyar címadatok, hálózati hiba, kvóta vagy lejárt választás ezért a regisztrációt akadályozhatja. A folyamatmemóriában őrzött, 30 percig érvényes választási azonosító szerver-újraindításkor elveszik, és több külön webfolyamat között nincs megosztva. Ilyenkor új keresés szükséges; többpéldányos éles futtatáshoz közös tárolás vagy más megoldás kell.

A munkatárs a későbbiekben is módosíthatja a partner nyilvántartott címét. Ez a későbbi rendelésekre hat; a korábbi rendelések címpillanatképét nem írja át. A jóváhagyott pont a **saját partner és pontosan ugyanazon címszöveg** későbbi rendeléseinél újra felhasználható. Új címhez külön pontellenőrzés kell. Eltérő rendelési címnek külön pontja adható meg. Másik partner helye nem használható fel, ellentmondó régebbi adatoknál nincs automatikus választás.

## 3. Rendelések és túrák

* A partner csak a hozzá rendelt túrák rendelkezésre álló napjaira válaszolhat. Naponta és partnerenként a rendszer egy választ kezel; az ismételt kérésazonosító azonos eredményre fut, a módosítás a rendelés azonosítóját és revízióját ellenőrzi.
* A leadható rendeléshez érvényes mennyiségek, egységek és beállított árak szükségesek. A felhasználó által látott árak megerősítését a szerver ellenőrzi. A rendelések szerkesztése a kiszállításhoz tartozó határidőig lehetséges; a jelenlegi logika a kiszállítás előtti nap 14:00 órájával számol magyar idő szerint. A „most nem kérek szállítást” külön válasz, nem megrendelés.
* A munkatárs a túrák nevét, a partnerek túranapjait és a kivételes áthelyezéseket kezeli. Áthelyezett túra esetén az új dátumra külön járműbeosztás szükséges; a régit nem másolja át a rendszer. A régi napon korábban mentett beosztás eltávolítható.
* A túrához tartozó követési távolság az admin beállításoknál megadható 1–500 km között; korábban nem konfigurált túránál az alapértelmezés 20 km. Ez légvonalban, nem közúti útvonalhosszként számított távolság.

## 4. Jármű-hozzárendelés és jogosultság

A **Járműkövetés / Kiszállítások beállítása / Túrához rendelés** résznél a munkatárs kiválasztja a napot, az arra a napra érvényes túrát és a járművet. Egy túra és dátum kombinációhoz legfeljebb egy járműtársítás tartozik; a mentés cserélheti a korábbit. A beosztás csak az adott napra szól. A rendszer a szolgáltató eszközlistájából is kínál járműveket; helyadat nélkül rendelkezésre álló eszköz is választható. Szolgáltatói lista hiba esetén a térképen vagy helyi katalógusban szereplő eszközök jelenthetnek tartalékot.

A rendszám a HolAzAutó `DeviceAsset` elemének saját `licensePlate` adatából származik. Ha a szolgáltató nem ad rendszámot, a munkatárs helyi katalógusban megadhatja, egyébként az eszközazonosító jelenhet meg. A program nem találgatja más eszközből, névegyezés alapján a rendszámot.

A partner részére helyadat csak akkor jelenhet meg, ha minden feltétel teljesül:

1. A fiók és munkamenet jóváhagyott és érvényes.
2. Magyarországi naptári idő szerint ma pontosan egyértelmű tényleges rendelése van; puszta regisztráció vagy kihagyás nem rendelés. A mai nap kezdetétől végéig lehet követni, az adott naphoz kötve.
3. A rendeléshez tartozó túra azon a napon érvényes, és ahhoz egy jármű van hozzárendelve.
4. A rendelés saját szállítási címéhez érvényes, ugyanazon partnerhez kötött ellenőrzött pont tartozik.
5. A kijelölt jármű pozíciója érvényes és legfeljebb ötperces, nem jövőbeli, és a légvonalbeli távolság a túra határán belül van.
6. A szerver a szolgáltatói kérés után újra ellenőrzi a munkamenetet és a feltételeket. Időközben módosult hozzárendelés, rendelés, pont vagy távolság esetén a korábbi válasz nem adható ki.

A partner csak a jogosult jármű koordinátáit, a mérés idejét és rendelkezés esetén a rendszámát kapja meg. A sebesség, gyújtás, más telemetria és más partnerek címei nem részei ennek a válasznak. Öt percnél régebbi mérés nem látható; a képernyő percenként frissít, a rejtett lap nem tartja meg láthatóként a pontot.

Az „A jármű még nincs a közelben” állapot friss, de a beállított távolságon kívüli helyzetet jelez. Az „A helyadat jelenleg nem érhető el” ennél általánosabb: például nincs mai rendelés, nincs megfelelő beosztás vagy ellenőrzött cím, illetve hiányzik, túl régi vagy nem kérhető le a helyadat. A két üzenet önmagában nem elegendő a konkrét hiba megállapításához; az adminnak a fenti feltételeket kell ellenőriznie.

## 5. Térkép és címkereső

* A térképi megjelenítés MapLibre GL és OpenFreeMap szolgáltatással történik. A szolgáltató a böngészőből kért térképterületet és a böngésző kapcsolatának IP-címét megkaphatja. A térkép forrásmegjelölését nem szabad elrejteni.
* A Geoapify-kulcs a szerveren marad. Az adapter a magyarországi keresésre szűr, legfeljebb öt találatot kér, az eredményeket egy óráig folyamatmemóriában gyorsítótárazza, a hálózati várakozást korlátozza. A felület csak a kiválasztott eredmény címét és az alkalmazás saját választási azonosítóját használja; a koordinátát a szerver tárolja.
* Geoapify nélküli konfigurációban a korábbi interaktív térképes címkereső Nominatimot használ. A nyilvános Nominatim nem szolgálhat személyes vagy bizalmas címek automatikus beküldésére; használati feltételei és korlátai éles használat előtt ellenőrzendők. A Geoapify, az OpenStreetMap és az OpenFreeMap előírt forrásjelölései nem ugyanazok.
* A Geoapify-találat pontossága nem garantált; az admin ellenőrzése különösen hiányzó házszám, telephely vagy hozzávetőleges találat esetén lényeges. A szolgáltató feltételei, adatfeldolgozási szerződése és a tájékoztató éles alkalmazás előtt vizsgálandók.

## 6. Értesítések és háttérmunkás

A háttérmunkás a portál nyitva tartásától függetlenül ellenőrizheti a jármű közeledését, és a feliratkozott, jogosult partnernek általános push értesítést készít. A szabály ugyanazt a túránkénti távolságot használja, mint a megjelenítés. A szöveg nem tartalmaz koordinátát; a rendszer az adott partnernél és napon próbálja elkerülni az ismétlődő követési értesítéseket. A küldés előtt a jogosultságot és a helyzetet újból ellenőrzi. A push harmadik fél kézbesítési rendszerétől, az eszköztől és az engedélyektől függ, ezért késhet vagy elmaradhat.

A helyi demó és a HolAzAutó-helyi előnézet a háttérmunkást **szimulációs** beállítással használja, nem bizonyít éles push-kézbesítést. Éles tesztkörnyezetben szükséges a HTTPS, VAPID-kapcsolat, élő feliratkozás és a megfelelő rendszerességgel futó háttérfolyamat. A `scripts/partner-staging-worker.cjs` egy futást végez; a telepítési környezetnek kell ütemeznie. iOS-en és Androidon a valós készülékes értesítési és telepítési viselkedést külön ellenőrizni kell.

## 7. Helyi tesztkörnyezetek

| Környezet | Indítás | Adatok és korlát |
| --- | --- | --- |
| Járműves demó | `node scripts/tracking-preview.cjs` → `http://127.0.0.1:38980/partner/` | Külön `data/tracking-demo` SQLite; járműpozíció szimulált. A Geoapify-kulcs beállítása esetén a címkeresés valódi külső szolgáltatást hívhat. |
| HolAzAutó helyi előnézet | `node scripts/tracking-live-preview.cjs` → `http://127.0.0.1:38981/partner-admin/` | Külön `data/tracking-live-preview` SQLite; az érvényes konfigurációval tényleges HolAzAutó-járműadatot kérhet. Élő push nincs. |

A demó alapfelhasználói: partner `demo-partner` / `demo-partner-123`, admin `admin` / `demo-admin-123`. Ezek csak az elkülönített helyi mintakörnyezetben használhatók, éles célra alkalmatlanok. A másik előnézet első indulásakor létrehozott adminhozzáférés a privát `data/tracking-live-preview/admin-access.txt` fájlba kerül. A két környezet adatbázisa nem közös: egyikbe történő regisztráció, jóváhagyás vagy hozzárendelés a másikban nem jelenik meg.

A demóindító mintapartnert és mintarendelést is létrehozhat vagy frissíthet; nem szabad valódi üzleti adatok tárolására használni. A helyi portoknak a számítógéphez kell kötve maradniuk; ne tedd ki őket az internetre. Leállításhoz a megfelelő folyamatot kell megszakítani, nem az adatbázist törölni.

## 8. Titkos konfiguráció és szolgáltatók

A helyi, Gitből kizárt `.env.portal.local` tartalmazhatja a szolgáltatói beállításokat. A részletes helyi lépések: `docs/HOLAZAUTO-HELYI-PROBA.md`. A fontos változónevek:

* `PORTAL_TRACKING_ENABLED` – HolAzAutó bekapcsolása; `HOLAZAUTO_ORIGIN`, `HOLAZAUTO_LOGIN`, `HOLAZAUTO_PASSWORD` – a szolgáltatói HTTPS origin és API-hozzáférés.
* `PORTAL_GEOAPIFY_API_KEY` – Geoapify keresési kulcs. A változó csak olyan indítási útvonalon hat, amely a konfigurációt betölti és a Geoapify-adapternek átadja. A kulcs és a szolgáltatói jelszó ne kerüljön dokumentumba, forráskódba, Gitbe, kliensoldalra vagy naplóba.
* `PORTAL_STAGING_ENABLED`, `PORTAL_DATABASE_URL`, `PORTAL_PUBLIC_ORIGIN` és a tesztkapu/bootstrap beállításai – az elkülönített HTTPS/PostgreSQL tesztkörnyezethez. Az adatbázist és a nyilvános webes alkalmazás adatbázisát nem szabad összekeverni.
* `PORTAL_PUSH_LIVE`, `PORTAL_VAPID_SUBJECT`, `PORTAL_BACKUP_DIR` – megfelelő munkás- és pushbeállítások; külön HTTPS, feliratkozás és operátori ellenőrzés is szükséges. A mentés privát, nem weben szolgáltatott könyvtárba menjen.

A konfiguráció forrása és elsőbbsége az adott indítószkripttől függ; az engedélyezett kulcsokat a `portal/config.js` sorolja fel. Módosítás után az érintett folyamatot újra kell indítani. A HolAzAutó adapter folyamatonként újrahasználja a tokent; sikertelen bejelentkezés vagy 401 után ugyanabban a folyamatban a belépés újraindításig letiltott. Külön folyamatok ezt a tiltást nem osztják meg; sikertelen hozzáférésnél ne indítsunk újrapróbálási hurkot.

## 9. Tárolás, védelem és üzemeltetés

Az alkalmazás a helyi bemutatóban SQLite, staging esetén PostgreSQL tárolót használhat. A partner, rendelés, pontjavaslat, ellenőrzött pont, járműkatalógus és dátumos hozzárendelés állapotként szerepel; a mentési és helyreállítási eljárásnak ezeket is kezelnie kell. A jelszó hash formában, a munkamenet HTTP-only cookie-val működik; a módosító kérések forrás- és CSRF-ellenőrzésen mennek át. A háttérfolyamat és az admin műveletei naplózási és ellenőrzési feladatokat is ellátnak.

A kódban lévő automatikus takarítás nem általános törlési ígéret: az archivált régi rendelésekre és hírekre háromhónapos, a lezárt panaszokra 28 napos feltételek láthatók, és a törlés friss mentéshez kötött. Más adattípusok, mentések, távoli szolgáltatók és jogszabályi kötelezettségek külön megőrzési rendet igényelnek. Az adatkezelési tájékoztató nem helyettesíti a konfiguráció tényleges vizsgálatát.

## 10. Ellenőrzések és hibakeresés

A projekt gyökerében futtatható parancsok:

```powershell
npm run build:partner-react
npm run test:partner
npm run test:tracking
node --test tests/address-search.test.js tests/registration-address-demo.test.js
```

A tesztprogramok között van szolgáltatóhelyettesítő egység- és integrációs ellenőrzés is; ezek nem bizonyítják automatikusan a tényleges PostgreSQL-szervert, Geoapify-hozzáférést, GPS-méréseket, telefonos push-t vagy éles böngészős felhasználói utat. Az esetleg kihagyott teszteket külön kell számontartani.

**Nincs partneri autó a térképen:** ellenőrizd a mai tényleges rendelést, dátumot és túrát, a napi járműbeosztást, a pontos címszöveghez tartozó jóváhagyott pontot, a túra távolságát, az érvényes és friss helyadatot, a jóváhagyott fiókot és az időzónát. A szolgáltató elérhetetlensége is ugyanahhoz az általános képernyőhöz vezethet.

**Nem menthető a jármű:** ellenőrizd, hogy a választott naphoz az adott túra tartozik-e, és hogy egy korábbi áthelyezés nem helyezte-e át azt. Napváltáskor új túraválasztás szükséges.

**Címkeresés nem működik:** ellenőrizd a megfelelő folyamat konfigurációját, a kulcs jogosultságát, a hálózatot és a szolgáltató kvótáját. Ne írd ki és ne küldd el a kulcsot hibakeresési naplóban. A regisztrációs találat lejárhat vagy elveszhet folyamatújraindításkor; ilyenkor újra kell keresni.

**Bekapcsolás előtt:** a hozzáférési és adatkezelési jogosultságokat, a térképes és geokódolási feltételeket, a mentésből való visszaállítást, a háttérmunkást, a PostgreSQL-versenyhelyzeteket, a felhasználói eszközöket és a valós push-kézbesítést a célkörnyezetben külön kell ellenőrizni. A járműhelyek nyilvános vagy idegen partnernek történő megosztása nem része a feladatnak.
