# Kebpro Partner – helyi PWA-alapverzió

## Indítás

Futtatás: npm run partner:preview

Előnézet: http://localhost:3002/partner/

Partner: http://localhost:3002/partner/ — regisztráció és jelszavas belépés.
Céges felület (csak közvetlen címről): http://localhost:3002/partner-admin/
Az első indításkor létrehozott admin belépési adatai: data/partner-admin-access.txt (Gitből kizárva).
A regisztráció a Regisztrációk menüben hagyható jóvá, kötelező túrabeosztással, vagy elutasítható.
Függő/elutasított partner nem léphet be. Két külön cookie és PWA-scope; párhuzamosan használhatók.
A korábbi, jelszó nélküli munkamenetek érvénytelenné válnak. A rendelési adatok megmaradnak.
A jelszavak sózott scrypt lenyomatként tárolódnak. A bootstrap fájl helyi belépési titok, ne publikáld.
A teszteléshez jóváhagyott bemutató partner belépése: data/partner-preview-access.json (Gitből kizárva).

Az alkalmazás 127.0.0.1-re köt, csak helyi kapcsolatot és helyi Host fejlécet fogad.
NODE_ENV=production esetén nem indul. A rendszer továbbra is helyi prototípus; nincs élesre telepítve.

A meglévő weboldal npm start parancsa változatlan. A partnerfelület külön folyamat;
a server.js és a meglévő rendelési útvonalak nem használják a demo modult.
Ez a változtatás normál weboldal-telepítéskor nem publikál partnerbelépőt.

## Kipróbálás

1. Lépj be vevőként. Nézd meg a következő kiszállítást és a határidőt.
2. Az „Új rendelés” oldalon válassz terméket, mennyiséget és egységet.
3. Tekintsd át, majd véglegesítsd a rendelést. Nincsenek árak vagy fizetés.
4. A „Rendeléseim” oldalon megjelenik a beküldés azonosítója és állapota.
5. Nyisd meg a külön céges címet, és jelentkezz be. Válaszd ki a rendelés kiszállítási napját.
6. Ellenőrizd a partnerlistát, a termékösszesítést, és válts rendelési állapotot.
7. A hírszerkesztőben írj egy teszthírt. Az árak szabad szövegként szerepelhetnek.
8. A vevői híroldalon megjelenik a közlemény. Az értesítési naplóban csak azokhoz
   készül hírről bejegyzés, akik a beállításoknál kérték azt.

A kiszállítás előtti 14:00 után az adott rendelés már zárt.
A próbához válassz egy másik, későbbi túrájú partnert, vagy a céges felületen
állítsd át egy még nem válaszoló mintapartner túrabeosztását.
A tesztelésből megmaradt mintarendelés és a kifejezetten mintaakcióként megjelölt hír
csak a helyi adatbázisban található.

## Mi működik?

- Három elkülönített mintapartner, két minta kiszállítási túra.
- A meglévő magyar termékkatalógus beolvasása az első adatbázis-indításkor.
- Árak nélküli rendelés, kg / db / karton egységekkel.
- Rendelés áttekintése, egyedi azonosító, duplikált beküldés elleni védelem.
- Egy válasz partnerenként és kiszállítási naponként, vagy „Most nem kérek”.
- Saját rendelési előzmények, korábbi tételek betöltése újrarendeléshez.
- Túra és nap szerinti adminlista, hiányzó válaszok, egységenkénti összesítés, nyomtatás.
- Beérkezett / visszaigazolva / összekészítve állapot.
- Céges hírek, akciók közzététele; a szöveg HTML-ként nem futtatható.
- Partnerenként állítható hír- és emlékeztető-beállítás.
- Túranapok, emlékeztető és határidő módosítása.
- Service worker, manifest, alkalmazásikon, offline magyarázó oldal.
- Session alapú szerepkör- és partnerelválasztás, szerveroldali validálás, CSRF-védelem.
- A személyes oldalakat és rendelési adatokat a service worker nem gyorsítótárazza.

## Emlékeztető és push – pontos állapot

Alapbeállítás: kiszállítás előtt egy nappal 09:00 emlékeztető, 14:00 rendelési zárás,
Europe/Budapest időzónában. A nyári/téli időszámítást a futtatókörnyezet kezeli.

Az önálló helyi folyamat percenként ellenőrzi az emlékeztetőket. Az admin
„Emlékeztetők ellenőrzése” gombja ugyanezt futtatja. Csak az adott idősávban,
a másnapi túra még nem válaszoló, emlékeztetőt kérő partnerei kapnak naplóbejegyzést.
Partnerenként és kiszállításonként egyszer; a napló újraindítás után is megmarad.

A web-push csomag VAPID-kulcsokat készít az első indításkor; a kulcsok a helyi
adatbázisban maradnak. A felület böngészőengedély után PushSubscription
regisztrációt tud tárolni. A service worker fel van készítve push eseményre.
A „Helyi próbaértesítés” csak a jelenlegi eszközön hívja a showNotificationt.

FONTOS: a portal/notifications.js tartalmaz tesztelt push-diszpécsert, de nincs bekötve éles futtatásra. Alapértelmezése dryRun: true. A helyi naplóbejegyzések simulation
állapotúak. A feliratkozás nem jelent működő távoli push-kézbesítést. A push nem küld valódi üzenetet. Az iPhone-os telepítést / push-engedélyezést ezen a
Windowsos localhost-próbán nem ellenőriztük valódi készüléken.

## Adattárolás és teszt

A data/partner-demo.sqlite külön SQLite-adatbázis. Az SMTP-adapter kizárólag a levelezési beállításokat olvassa a .env fájlból;
nem használja a weboldal adatbázisát vagy adminjelszavát. A jelszó-visszaállítás a weboldallal azonos SMTP-szolgáltatást használja.
A SQLite állomány és a kísérőfájlok gitignore alatt vannak.

A prototípus állapotát egy tranzakcióval módosított JSON sor tárolja SQLite-ban.
A módosítások sorosítottak; ez helyi demonstrációs tároló, nem a tervezett
többfelhasználós, éles adatbázisséma.

Tesztelés: npm run test:partner

A tesztek külön ideiglenes vagy memóriabeli adatbázist használnak. Ellenőrzik
az időzónát, határidőt, ismételt beküldést, mennyiségeket, partnerelválasztást,
összesítést, hírfeliratkozást, emlékeztető-deduplikációt, tárolást és HTTP-védelmeket.

## Következő fejlesztési lépések az éles pilothoz

- Éles fiókéletciklus: letiltás, munkatársi fiókok kezelése és auditnapló.
- Normalizált PostgreSQL-táblák, migrációk, mentések, naplózás és partnerimport.
- Tényleges termékkiszerelések, megengedett egységek, minimumok egyeztetése.
- Rendelésmódosítás / telefonon felvett rendelés munkafolyamata.
- A meglévő push-diszpécser bekötése valódi pending üzenetekhez és VAPID-kapcsolathoz. A modul tesztelt engedély-újraellenőrzést, lejáró küldési foglalást, 404/410 végponttörlést, korlátozott újrapróbálást és eszközönkénti állapotot tartalmaz. A korábbi simulation üzeneteket nem küldi ki.
- Megbízható szerveroldali ütemezés (serverless esetén külső cron/worker).
- Tartós HTTPS-tesztkörnyezet és valódi Android/iPhone telepítési, push- és offline-próbák.
- Hírek módosítása/visszavonása, akciók érvényessége, adatkezelési szövegek,
  mentési/üzemeltetési folyamat és fokozatos partneri pilot.

A hírekben megadott árak nem módosítják a termékkatalógust vagy a rendelési adatokat.

A push-diszpécser tesztjei helyettesített küldőfüggvényt használnak; ezek sem küldenek valódi push üzenetet. Összesen 19 teszt fut.

## Új belépési és mobilfelület

Kereshető termékválasztó különálló, legalább 64 px magas gombokkal. A Telepítési segítség a belépőn és belépés után is elérhető, Android/iPhone lépésekkel. Két külön manifest, service worker és PNG ikon. A telefonos telepítést valódi HTTPS-es környezetben kell még ellenőrizni.

A teljes ellenőrzés 19 tesztet tartalmaz, beleértve a függő hozzáférés tiltását, admin jóváhagyást, szerepkörhamisítás elutasítását, CSRF-et és a két PWA scope elkülönítését. Élesítés előtt még szükséges felhasználóletiltás, üzemi adatbázis és üzemeltetési beállítások.



## Jelszó-visszaállítás és e-mail

- Minimum 8, maximum 128 karakter. Ugyanaz a jelszó is megadható újra.
- Új partner regisztrációjához külön e-mail-cím kötelező, partnerenként egyedi.
- Az Elfelejtetted a jelszavad? űrlap partner- és céges belépőn is megtalálható.
- 30 percig érvényes, egyszer használható véletlen token; az adatbázisban csak SHA-256 lenyomat szerepel. A token a link töredékében van, nem a szerver URL-naplójában.
- Visszaállításkor az összes korábbi munkamenet és visszaállító link érvénytelenné válik; a regisztráció jóváhagyási állapota nem változik.
- A régi, e-mail nélküli mintafiókokhoz (beleértve a bootstrap admint) nem lehet e-mailes visszaállítást kérni. Ne társíts hozzájuk találomra e-mail-címet. A külön létrehozott Levente mintafiók már rendelkezik e-mail-címmel; az új munkatársak meghívásos folyamattal hozhatnak létre fiókot.
- A portal/mailer.js ugyanazokat az SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS és MAIL_FROM értékeket használja, mint a weboldal utils/mailer.js modulja. A jelszó-visszaállítás, az új partner regisztrációja és a céges meghívás is indít e-mailt. A partner adminjóváhagyása önmagában nem küld levelet.
- PORTAL_PUBLIC_ORIGIN a megbízható alkalmazás-eredet, nem a kérés Host fejléce. Alapérték http://localhost:3002. A localhost e-mail-link csak a helyi szervert futtató számítógépen használható; élesítés előtt HTTPS-es elérési cím szükséges.
- Fiókonként percenként egy kérés, IP-alapú kéréskorlát és általános válasz a fiók létezésének felfedése nélkül. SMTP-hibánál a token törlődik, a szerver hibanaplót ír; a jelszó változatlan.
- Automatikus tesztek helyettesített levélküldővel: nem küldenek e-mailt valódi címekre.



## Céges munkatársi meghívások

A Túrák és partnerek menü tetején található a Céges munkatársak meghívása rész. Minden jóváhagyott céges admin meghívhat további, azonos jogosultságú munkatársat. A felület külön jelzi a teljes céges hozzáférést, és küldés előtt megmutatja a címzettet.

A meghívó e-mailben érkezik, 24 óráig érvényes, egyszer használható és visszavonható. Az elfogadó saját felhasználónevet és legalább 8 karakteres jelszót választ. A fiók e-mail-címe kizárólag a meghívóból származik; az elfogadó nem módosíthatja. A link sikeres használata igazolja az e-mail-címet. Ezután a céges belépőn jelentkezhet be, nyilvános adminregisztráció nincs.

Az adatbázis csak tokenlenyomatot tárol, azt a listázó API nem adja vissza. Lejárt, visszavont, felhasznált és sikertelenül elküldött meghívó nem aktiválhat fiókot. Újraküldéshez az aktív meghívót vissza kell vonni, majd új meghívást küldeni. IP-címenként óránként legfeljebb 10 küldési kérés engedélyezett. A localhost link csak ezen a gépen használható.

A kért Levente mintafiók kizárólag a helyi adatbázisban készült el, a megadott e-mail-címmel. A jelszó nem került forrásfájlba vagy dokumentációba; csak scrypt-lenyomatként tárolódik. A külön létrehozás önmagában nem jelenti az e-mail-cím visszaigazolását. A korábbi bootstrap admin továbbra is megmaradt.

A meghívások tesztjei helyettesített levélküldőt használnak; valódi meghívó csak a felületen jóváhagyott küldéskor indul.

## Napi túrák és automatikus frissítés

A helyi adatbázis egyszeri migrációja hét túrát hoz létre, hétfőtől vasárnapig egyet-egyet. A túra neve, emlékeztetője és határideje módosítható; a hozzá tartozó hétköznap rögzített. A korábbi túralista previousRoutes alatt megmarad, a partnerek a migrációkori következő kiszállításuk hétköznapjára kerülnek. A korábbi rendelések napja, tételei és állapota változatlan; túraazonosítójuk a kiszállítás napjához igazodik, a régi azonosító previousRouteId alatt megmarad. A beosztást az élesítés előtt egyeztetni kell a céggel.

A rendelési nézet külön kártyákon mutatja a rendeléseket, állapotszűrőkkel, partner/azonosító kereséssel, külön válaszhiány-, szállításkihagyás- és összesítő nézettel. A nap és túra kiválasztása azonnal frissíti a listát.

Az aktív alkalmazás 5 másodpercenként lekéri a szerepkörének megfelelő adatokat; újra előtérbe kerüléskor és hálózat-visszatéréskor is ellenőriz. Ez helyi polling, nem távoli push. A napló, hírek, regisztrációk és rendelések újratöltés nélkül frissülnek. Szerkesztett mező vagy nyitott párbeszédablak esetén a háttérfrissítés vár; a piszkozatok és a kosár megmaradnak. Hálózati hiba esetén a meglévő adatok megmaradnak és a felület újrapróbálkozik. Az időjelző a legutóbbi sikeres ellenőrzést mutatja.

20 automatizált teszt sikeres. Böngészőben külön munkamenetből leadott mintarendeléssel ellenőrizve az automatikus megjelenés, valamint távoli túraátnevezés közben a helyi piszkozat megőrzése. A helyi mintarendelés „Automatikus frissítés · mintapartner” néven megmaradt, e-mail vagy valódi push nem ment ki.


## Regisztrációs visszaigazoló e-mail

A sikeres új partnerregisztráció után a rögzített e-mail-címre automatikusan elküldjük a cég/üzlet nevét, kapcsolattartót, szállítási címet, telefonszámot, e-mail-címet és normalizált felhasználónevet. A levél külön jelzi a céges jóváhagyásra váró állapotot. A jelszó és annak lenyomata nem szerepel a levélsablon bemeneti adatai között; a sablon kizárólag megengedett mezőket használ.

A küldés a regisztráció mentése után történik. SMTP-hiba esetén a fiók megmarad, a felület külön jelzi a sikertelen levélküldést; automatikus újraküldés egyelőre nincs. Hibás vagy ismételt regisztráció nem küld új levelet. Korábban létrehozott fiókokra nincs visszamenőleges küldés.

22 teszt sikeres, beleértve a levéltartalmat, címzettet, jelszó kizárását, ismételt regisztráció és SMTP-hiba kezelését. A tesztküldő helyettesített; a tesztek nem küldenek valódi e-mailt.

## Egyszerűsített mobil rendeléskezelés

A rendeléskezelő két kategóriája: Új rendelések és Archivált rendelések. Az új listában minden archiválatlan rendelés látszik kiszállítási naptól függetlenül. A nagy pipás gomb azonnal archivál, az archívumból visszaállítható. Az admin műveletét és idejét a szerver rögzíti (archivedBy, archivedAt). Ismételt archiválási kérés nem módosítja az eredeti időpontot. Az archiválás a partnernél Feldolgozva állapotot mutat; nem jelenti a kiszállítás megtörténtét.

Az archívum alapból az összes archivált rendelést mutatja, a rendelés időpontja szerint csökkenően (legfrissebb elöl). A rendezés és a napszűrés alapja átállítható archiválási időpontra. A napszűrés Europe/Budapest szerinti napot használ. A partner/azonosító kereső mindkét kategóriában működik, az automatikus frissítés megmaradt. Korábbi rendelésekre nem találunk ki archiválási időpontot: azok a pipás műveletig az új listában maradnak.

24 automatizált teszt sikeres. Telefonméretű böngészőben ellenőrizve a pipás archiválás, a két kategória számlálója, a dátumszűrés és a visszaállítás. Kizárólag az Automatikus frissítés mintapartner tesztrendelése lett archiválva a próbában.

## Rendelésmódosítás, híváslista és gyors rendelés

- A partner a saját, következő 14 napra eső kiszállításai közül választhat. Egy partner több napi túrához is hozzárendelhető, már a regisztráció jóváhagyásakor is. A korábbi egyetlen túrás beosztás továbbra is olvasható. Függő kiszállítással érintett nap nem távolítható el a beosztásból.
- A rendelés vagy kihagyás a kiszállítás előtti napi határidőig módosítható. A szerver ellenőrzi a jogosultságot, határidőt és verziót; párhuzamos szerkesztés nem írhatja felül észrevétlenül az újabb változatot. A korábbi tételek és állapot megmaradnak a változástörténetben. Archivált rendelés módosításkor visszakerül az új listába, Módosítva jelzéssel. A rendelés lemondása is megjelenik az adminnak.
- A Kit hívjunk? menü a kiválasztott kiszállítási napra és túrára mutatja a még nem válaszolt partnereket. Az érvényes telefonszám telefonon hívható; a szállítást kihagyók külön szerepelnek.
- A termékek csillaggal kedvenccé tehetők. Partnerenként legfeljebb 20 névvel ellátott rendelési lista menthető, felülírható, betölthető és törölhető. A lista mentése vagy betöltése önmagában nem ad le rendelést. A mentett összeállítás független a később módosított rendeléstől.

28 automatizált teszt sikeres. A többnapos beosztás, határidő, módosítás/verzióütközés, archiválás utáni újranyitás, lemondás és a partnerenként elkülönített listák/kedvencek is ellenőrzöttek. Telefonméretű böngészőben végigpróbálva a mintapartner 1 kg-os rendelésének archiválása és 3 kg-ra módosítása, valamint az eredeti 1 kg-os mentett lista betöltése egy másik kiszállításra. A bemutatóadatok helyben megmaradtak; valódi e-mail vagy push nem ment ki a próbák során. Összekészítési lista nem része ennek a fejlesztésnek.

## Megbízhatósági alapok (helyi, élesítés előkészítése)

- Fiókok kezelése: Túrák és partnerek > Fiókok hozzáférése. Admin és jóváhagyott partner letiltható/visszaengedhető. Saját fiók és az utolsó aktív admin nem tiltható le. A letiltás megszünteti a munkameneteket, visszaállító tokeneket és partneri eszközfeliratkozásokat; visszaengedéskor ezek nem állnak helyre automatikusan. A letiltott munkatárs függő meghívói visszavonódnak. A rendelések megmaradnak.
- Az adminmódosítások és a hozzájuk tartozó naplóbejegyzések ugyanabban az adatbázis-tranzakcióban mentődnek. Naplózott: túrabeállítás, partnerbeosztás, rendelésállapot/archiválás, hírek, fiókállapot, meghívók állapota. Munkatárs-azonosító, név, időpont, művelet, engedélyezett előtte/utána mezők. Jelszó, token, munkamenet és VAPID-kulcs nem kerül a naplóba. Az admin az utolsó 100 eseményt láthatja az Értesítési naplóban; az adatbázis a teljes naplót őrzi. Ez még nem külső, manipuláció ellen védett auditarchívum.
- A háttérfolyamat induláskor és percenként fut, azonos folyamatban átfedő futások összevonva. Nem kell hozzá megnyitott böngésző. Magyar idő szerinti emlékeztetési ablakban pótolja az elmaradt ellenőrzést; határidő után nem küld késői emlékeztetőt. A gép/szerver leállásakor nem fut: éles környezetben folyamatosan felügyelt folyamat vagy külső ütemező szükséges.
- Push: alapból szimuláció. PORTAL_PUSH_LIVE=true csak PORTAL_PUBLIC_ORIGIN=https://... és PORTAL_VAPID_SUBJECT=mailto:... mellett engedélyezhető. Az új üzenetek ekkor kerülnek távoli küldési sorba. Korábbi szimulációk nem indulnak el utólag. VAPID-kulcs az adatbázisban tartós; meg kell őrizni. A küldő újrapróbálkozik, figyeli a leiratkozást/letiltást, törli a lejárt eszközöket. A push nem garantált kézbesítés: összeomlás utáni újrapróbálkozáskor ismétlés lehetséges, a telefonos értesítések azonosító alapján csoportosulnak.
- Mentés: induláskor, majd legalább 24 óránként ellenőrzőösszeggel ellátott JSON-pillanatkép. Alapkönyvtár data/backups, felülírható PORTAL_BACKUP_DIR változóval. Az utolsó 14 mentés marad meg. Ideiglenes fájl ellenőrzése után átnevezéssel válik véglegessé; sérült mentés nem lép a sikeres mentés helyébe. Jelenleg ugyanazon gépen van, nem titkosított távoli mentés! Fiókadatokat és kulcsokat tartalmaz; ne kerüljön Gitbe vagy publikus könyvtárba. Windows alatt a mentési könyvtár ACL-jét az üzemeltetésnek kell beállítania.
- Visszaállítás: node scripts/partner-restore.js BACKUP.json UJ-adatbazis.sqlite. Csak új fájlt hoz létre, meglévőt nem ír felül. Ellenőrzi a mentést és a visszaolvasást, minden belépést/jelszó-visszaállítást és függő meghívót érvénytelenít, a függő pushokat visszavonja, szimulációra áll. Az új adatbázisra átállás külön üzemeltetési lépés, leállított szerver mellett.

34 automatizált teszt sikeres; beleértve a HTTP-s letiltást, régi munkamenet érvénytelenítését, atomi naplózást, sérült mentés felismerését és visszaolvasást, a háttérküldés helyettesített hálózati próbáját. A helyi adatbázis első automatikus mentéséből külön új SQLite fájlba sikeres visszaállítási próba történt. Valódi push nem ment ki.

Éles indulás előtt még szükséges: a tárhely és a tartós adatbázis véglegesítése; HTTPS-es staging és valódi Android/iPhone távoli push próba; folyamatfelügyelet és hibariasztás; titkosított, másik gépre/tárhelyre másolt mentés és helyreállítási gyakorlat. A preview localhost- és production-tiltása változatlan, ez a munka nem éles telepítés.

## Helyi rendelési piszkozat

A partner kosara, megjegyzése, kiválasztott kiszállítási napja és módosításkor a rendelésverzió automatikusan localStorage-ba mentődik, partnerazonosítónként külön kulccsal. Ugyanabban a böngészőben/eszközön, sikeres bejelentkezés és adatbetöltés után visszatöltődik; másik partnerhez nem töltjük be. Nem szerveroldali szinkron és nem teljes offline rendeléskezelés. Internet nélkül újranyitva a kapcsolathiány-oldal látszik; a mentett piszkozat a kapcsolat visszatérésekor használható. Böngészőadat-törlés vagy privát mód miatt elveszhet. Megosztott eszközön a böngésző helyi adataihoz hozzáférő személy olvashatja; nem titkosított tároló.

A „Piszkozat – még nincs beküldve” jelzés minden partneri nézetben látható. A mentés hibáját külön jelzi. Sikeres rendelés/válasz után törlődik; sikertelen hálózati kéréskor megmarad. A kérésazonosító is megmarad: elveszett visszaigazolás után újranyitáskor a szerver rendeléstörténetével egyeztetve felismeri a már befogadott kérést. Lejárt kiszállítási napot nem ír át csendben. A piszkozat külön törölhető megerősítéssel. Egy partnernek ezen a böngészőn egy aktuális piszkozata van; több fül egyidejű szerkesztése nem egyesül automatikusan.

40 teszt sikeres. Böngészőben a bemutatópartner 3 kg-os kosara és megjegyzése újratöltés után megmaradt; a próba nem küldött be rendelést. A termékek kg/db/karton szabályai változatlanok.

## Tartós partnerbelépés és értesítési bevezető

Új partnerbelépéskor 90 napos, rögzített lejáratú szerveroldali munkamenet és azonos élettartamú HttpOnly/SameSite cookie készül. Nem gördülő hosszabbítás: 90 nap után új belépés kell. A korábbi munkamenetek lejárata nem változik. Az adminbelépés továbbra is 24 órás. Kijelentkezés, letiltás és jelszó-visszaállítás változatlanul visszavonja a hozzáférést.

A partnerfelület első sikeres betöltésekor eszközönként és partnerenként értesítési felhívás jelenik meg. A böngésző engedélykérését kizárólag az Értesítések bekapcsolása gomb kattintása indítja. Most nem/Escape vagy sikeres feliratkozás után a felhívás helyileg elnémul; a Beállításokban az engedélyezés továbbra is elérhető. Tiltott engedélynél beállítási útmutatás, nem támogatott környezetben telepítési tájékoztató jelenik meg. A felhívás nem kapcsolja be önkényesen az akciós értesítéseket, és nem engedélyezi a szerver távoli push módját.

41 teszt sikeres, beleértve a 90 napos partner- és 1 napos admincookie/munkamenet ellenőrzését. A felhívás helyi böngészőben megjelent; valódi értesítési engedélyt a próba nem adott meg.

## Belépés meghosszabbítása lejárat előtt

Partnerenként, az aktuális munkamenet utolsó 7 napjában az app megnyitásakor/aktív használatakor felhívás jelenik meg. Ez appon belüli jelzés, nem távoli push. Megerősítéskor a szerver és a HttpOnly cookie lejárata az aktuális időponttól 90 napra változik, kizárólag ezen a munkameneten. Ismételt azonos kérés nem hosszabbít újra. Lejárt, letiltott, másik fiókhoz tartozó vagy adminmunkamenet nem hosszabbítható ezen a végponton; CSRF-védelem kötelező. A megerősítéshez nem kell újból jelszó, ezért ismételt jóváhagyással a hozzáférés tovább fenntartható; a kiléptetés/letiltás/jelszó-visszaállítás továbbra is megszünteti.

A Most nem/Escape 24 órára elhalasztja a felhívást, nem jelentkeztet ki. A Beállítások > Bejelentkezve maradás részben a pontos lejárat és a lenyitható magyarázat mindig elérhető, a hosszabbítás gomb az utolsó 7 napban jelenik meg. A magyarázat kitér az eszközönkénti működésre, lejáratra, közös telefonokra, a piszkozat és push különállóságára.

43 teszt sikeres: hétnapos határ, idempotencia, lejárat/letiltás, CSRF, cookie és eszközönkénti elkülönítés. Böngészőben a bemutatópartner korábbi rövid munkamenete sikeresen meghosszabbítva, piszkozat változatlanul megmaradt.

## PostgreSQL-előkészítés és üzemeltetési riasztások

Részletes átállási és üzemeltetési útmutató: docs/POSTGRES-OPERATIONS.md; változóminta: docs/portal.env.example. A helyi alapértelmezés továbbra is SQLite, PostgreSQL csak explicit PORTAL_DATABASE_URL mellett indul. Rekordonkénti PostgreSQL táblák, tranzakciók, külön importáló, célzott partner- és munkamenet-lekérdezés készült. Az üzleti írások átmenetileg teljes állapotképpel és soros tranzakciózárral dolgoznak; ezt a következő optimalizálási lépésben kell tovább bontani.

A független partner:monitor folyamat a titkos fejléccel védett /partner/health végpontot figyeli. 3 hibás ellenőrzés után riaszt, óránként legfeljebb ismétel, helyreálláskor külön levelet küld. SMTP-hiba esetén 5 perc után újrapróbálkozik. Címzett nincs automatikusan kiválasztva, csak PORTAL_ALERT_EMAIL alapján küld. 50 helyi teszt sikeres; a valódi PostgreSQL integrációs teszt adatbázis hiányában kihagyva. Ez nem éles PostgreSQL átállás vagy bekapcsolt éles felügyelet.

A riasztás címzettje a felhasználó által megadott címként az ignorált .env.portal.local fájlba került; külön véletlen monitor-token készült. A konfigurációt csak engedélyezett PORTAL_ kulcsokra tölti be a preview, importáló és monitor. Az éles riasztás még kikapcsolt (PORTAL_ALERTS_ENABLED=false). A partner-monitor --once --dry-run a futó helyi app összes ellenőrzését sikeresnek találta, levélküldés nélkül. Jelenleg 52 teszt sikeres, a PostgreSQL integrációs teszt futó tesztadatbázis hiányában kihagyva.

### Appon belüli rendelési visszajelzés
A partner kezdőlapján a legutóbbi rendelés állapota, a Rendeléseim oldalon minden rendelés állapotleírása és időpontja látható. Csak két rendelési állapot van: Beérkezett, archiválás után Feldolgozva. Nincs külön állapotválasztó. A régi confirmed/ready állapotok a partnernél Beérkezettként látszanak. Az archiválás Feldolgozva jelzést jelent, nem kiszállítást. A nyitott app automatikus frissítése állapotváltozáskor rövid üzenetet mutat; nincs hozzá e-mail vagy push-küldés. Elavult rendelésverzió vagy állapot felülírását a szerver elutasítja; partnermódosítás után ismét Beérkezett az állapot.

### 2026-10-20 – Valódi helyi PostgreSQL, HTTPS és terhelés
A docs/LOCAL-VALIDATION.md leírja a külön tesztpéldányokat és parancsokat. PostgreSQL 18.4-en a teljes csomag 55/55 sikeres, nincs kihagyott teszt. A kezdeti séma session_user indexnevét javítottuk, mert PostgreSQL-foglalt szó. HTTPS alatt a sütik Secure jelölést kapnak, és a módosító kérések Origin-ellenőrzése a tényleges HTTP/HTTPS protokollt követi. A HTTPS-terhelési próba 10/30/100 párhuzamos partnerrel, izolált tesztadatokkal mindkét tárolón 140 egyedi archivált rendelést igazolt. Éles domain/proxy, mobil böngésző és távoli push ellenőrzése továbbra is hátravan.

### 2026-10-21 – Termékelérhetőség, napi teendők, lapozás, automatikus megőrzés
- Új céges Termékek menü: rendelés szüneteltetése és visszaengedés. A változtatás jogosultság- és CSRF-védett, a munkatársi naplóban rögzített. A korábbi rendelések tartalma nem módosul. A partner kosarában a letiltott termék figyelmeztetést kap; a szerver beküldéskor is ellenőrzi az elérhetőséget. A mentett listák megőrződnek, betöltésükkor a nem elérhető tételekről visszajelzés jelenik meg.
- Napi teendők a rendelési kezdőlapon: összes kezeletlen rendelés, következő napi túrából még nem válaszoló aktív partnerek, jóváhagyandó regisztrációk. A kártyák megnyitják a megfelelő nézetet. A letiltott partnereket a hívási lista kihagyja.
- Partnerelőzmények és céges rendeléslista: 25 tételes oldalak. A keresés, új/archivált állapot, archiválási/rendelési idő és budapesti napszűrés a teljes találati halmazon fut, majd következik a lapozás. Üresre fogyott utolsó oldal esetén visszalép az utolsó létezőre. Az aktuális kiszállítási válaszok külön érkeznek, ezért egy régebbi előzményoldal megnyitása nem rejti el a már leadott aktuális rendelést. PostgreSQL-en LIMIT/OFFSET lekérdezés, külön darabszám és rendezési indexek (séma 2); a háttérben történő módosítások továbbra is a korábbi tranzakciós kompatibilitási réteget használják. SQLite esetén a régi tárolási formátum miatt a szerver még teljes állapotot olvas, de csak az aktuális oldalt küldi le.
- A felhasználó kérésére 3 naptári hónapos megőrzés. Naponta egyszer, friss (legfeljebb 24 órás) sikeres mentés után törlődnek a három hónapnál régebben archivált, már elmúlt kiszállítású rendelések. A pontos határnapon lévő rekord a következő ellenőrzésig marad. Kezeletlen rendelések, nem archivált visszajelzések és a mentett rendelési sablonok nem törlődnek. Nincs visszamenőleges kézi adatbázis-takarítás; a normál worker végzi a szabály szerinti törlést. A mentési fájlok a meglévő 14 verziós szabály szerint kopnak ki, nem maradnak korlátlanul.
- Az Értesítési napló oldalon látszik a megőrzési szabály, az utolsó ellenőrzés és a legutóbbi törlésszám. A szabály a futó workerre támaszkodik; élesben szükséges annak folyamatfelügyelete.
- Tesztek: lapozási határok, keresés/napszűrés SQL és SQLite eredményegyezése, termékletiltás jogosultságai és szerveres ellenőrzése, hónapvégi határnap, friss mentés nélküli törléstiltás, sablonok megőrzése és mentés törlés előtti tartalma. Mobil adminfelületet böngészőben is ellenőriztük.

### Összekészítés, árkeresés és rendelési bejelentések

- Az admin Összekészítés menüje a választott napra és túrára beérkezett rendelésekből számol; az archivált rendeléseket is tartalmazza, a lemondásokat nem. A termékek külön mértékegységenként összegezve és partnerenként is megjelennek, megjegyzéssel. A már törölt régi rendeléseket nem lehet belefoglalni.
- A Termékek menüben termék- és partnernév alapján lehet keresni; egy partner kiválasztásakor megjelenik a rá érvényes alap- vagy egyedi ár mindhárom egységre. Az egyedi ár forrását külön jelzi, és ugyanitt szerkeszthető.
- A partner a Rendeléseim oldalon, saját rendelésnél szöveges bejelentést adhat le. A céges Bejelentések menüben az admin válaszolhat és nyitottra vagy lezártra állíthatja. A partner a választ az alkalmazáson belül olvassa. Nincs fájlcsatolás vagy külön push/e-mail. A bejelentés partneradatként tárolódik, a rendelés törlése után is megmarad; ennek megőrzési idejét az éles indulás előtt rendezni kell.
- Szerveroldali ellenőrzés köti a bejelentést a saját rendeléshez; az adminmódosítások verzióütközést és naplózást kapnak. A napló a bejelentés tartalmát és a válasz szövegét nem tárolja. A beküldés ismétlése ugyanazzal a kérésazonosítóval nem hoz létre új bejelentést.

## Partnerapp – jogi és adatvédelmi előkészítés (2026-10-28)

A partnerregisztrációnál külön, alapból üres, kötelező jelölőnégyzet vonatkozik a **helyi bemutatóhoz készült felhasználási feltételek tervezetére**. Az adatkezelési tervezet külön hivatkozás, nem kötelező marketing-hozzájárulás. A hír- és akcióértesítések változatlanul külön választhatók. A szerver szigorúan ellenőrzi a boolean elfogadást és a dokumentumok aktuális változatát, hashét; régi vagy hamis adatnál nem hoz létre fiókot és nem küld regisztrációs levelet. A felhasználórekord az elfogadás szerveridejét, verzióit, SHA-256 hashét és az ellenőrzött dokumentumok teljes JSON-pillanatképét őrzi; az adatkezelési dokumentum hashének tárolása nem bizonyítja, hogy ténylegesen elolvasták. A korábbi fiókokra nem készül visszamenőleg elfogadás. A dokumentumok helyi tervezetek, nem jogi jóváhagyások, és az alkalmazás továbbra is kizárólag helyi bemutató.

A dokumentumok: portal/legal.js, /partner/legal/terms/draft-2026-10-28 és /partner/legal/privacy/draft-2026-10-28. Éles jóváhagyott verziót új, változatlanul archivált dokumentumként kell hozzáadni; a meglévő verziót nem szabad felülírni. A későbbi módosítások közlése és a meglévő fiókok esetleges új elfogadása üzleti és jogi döntést igényel, erre még nincs folyamat.

### Ellenőrzendő indulás előtt a cég és jogász bevonásával

- Adatkezelő, kapcsolattartás, esetleges DPO és a jelenlegi honlap adatkezelési tájékoztatójának hatálya, pontossága; a honlap szövege nem fedi le automatikusan az app funkcióit.
- Valós adatfolyamatok és célonkénti jogalapok: B2B partnerkapcsolati személyek, regisztráció, hitelesítés, rendelések, szerződéses árak, kiszállítás, bejelentések, adminnapló, e-mail, technikai és marketingpush, hibamonitorozás. Szerződés elfogadása nem általános GDPR-hozzájárulás; reklámot és nem szükséges adatkezelést nem szabad a regisztrációhoz kötni.
- Érintetti jogok kérelmezése, személyazonosság ellenőrzése, teljesítés, törlés/helyesbítés és kivételek, a magyar NAIH-hoz fordulás tájékoztatása; a jelenlegi rendszerben nincs teljes automatizált érintetti jogkezelés.
- Adatmegőrzés: jelenleg a már elmúlt kiszállítású, három hónapnál régebben archivált rendelés friss mentés után törölhető; kezeletlen rendelések és mentett listák megmaradnak, a bejelentésekre és eseménynaplóra nincs automatikus törlési szabály. A mentés alapból helyi és 14 változatot őriz. Előbb üzleti és jogi megőrzési kötelezettségeket kell felmérni; ne tekintsék a három hónapot automatikusan megfelelőnek minden célra.
- Tárhely, SMTP, push-szolgáltatók, mentés és esetleges GPS-szolgáltató szerepkörei, szükséges adatfeldolgozói szerződések és esetleges EU-n kívüli továbbítások. Szolgáltatónként tényleges tények alapján.
- Pushengedély, önkéntes marketingpreferencia és visszavonás bizonyíthatósága; jelenleg a preferencia tárolt állapot, nem teljes külön hozzájárulás-nyilvántartás. A böngésző jogosultsága önmagában nem dönti el a marketing jogalapját.
- Az alkalmazás által használt munkamenetsütik, service worker, helyi rendelési piszkozat, tartós bejelentkezés és pushfeliratkozás leltára; az ePrivacy és magyar szabályok szerinti tájékoztatás/jogalap vizsgálata célonként.
- Kockázatalapú biztonság: éles HTTPS, jogosultságok, kulcsok, hozzáférések, eseménynapló védelme, külön tárolt titkosított mentés és visszaállítás, rendszeres frissítés, incidenskezelés és szükség szerinti hatósági/érintetti értesítés. A lokális tesztek nem igazolják a végleges környezetet.
- A lehetséges GPS-funkció megvalósítása előtt a sofőröket érintő helyadatkezelés céljának, jogalapjának, tájékoztatásának, a korlátozott partneri láthatóságnak, megőrzésnek és szükség esetén hatásvizsgálatnak tisztázása.
- B2B szolgáltatási és kereskedelmi feltételek: partner képviseleti jogosultsága, megrendelés és visszaigazolás joghatása, nettó/bruttó, akciók, árváltozás, elérhetőség, reklamáció, felelősség, változtatás és kapcsolat. A DSA és egyéb előírások alkalmazhatósága konkrét működés és szerep alapján vizsgálandó, nem feltételezhető általánosan.

Elsődleges források: GDPR 13. és 28. cikk https://eur-lex.europa.eu/eli/reg/2016/679/oj ; Európai Bizottság tájékoztatása https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en ; EDPB szerződés és külön hozzájárulás https://www.edpb.europa.eu/system/files/2026-03/edpb-summary-guidelines2-2019-contractual-necessity-online-services_en.pdf ; NAIH https://www.naih.hu/adatkezeles-erintettjekent-fordulok-a-hatosaghoz/adatvedelmi-hatosagi-eljaras-gdpr . Ez műszaki előkészítés és nem végleges jogi vélemény.
