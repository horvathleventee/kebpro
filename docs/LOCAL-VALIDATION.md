# Helyi HTTPS és terhelési próbák

## Parancsok
- `npm run partner:https`: külön, átmeneti HTTPS-bemutató a https://localhost:3443/partner-admin/ címen. Újraindításkor a tesztadatok elvesznek. A véletlen tesztbelépés az ignorált `.local-tests/https-access.json` fájlban van. A 3002-es bemutató adatai érintetlenek.
- `npm run test:partner:load`: HTTPS alatt 10, 30, majd 100 párhuzamos partner, friss, külön lemezes SQLite-adatbázison. Jelentés: `output/load-sqlite-disk.json`.
- `npm run test:partner:postgres-local`: Windows helyi PostgreSQL-példány létrehozása véletlen szabad porton, a teljes tesztcsomag és ugyanaz a terhelési próba. A végén a saját szerverét leállítja. Jelentés: `output/load-postgres.json`.

A PostgreSQL-teszt Windows-binárisai külön, az alkalmazás függőségeitől elkülönülő könyvtárban találhatók. Új gépen előkészítés:

```powershell
npm install --prefix .local-tests/runtime @embedded-postgres/windows-x64@18.4.0-beta.17 --ignore-scripts
npm run test:partner:postgres-local
```

Bináriscsomag forrása: https://github.com/leinelissen/embedded-postgres. A tényleges PostgreSQL-verziót a teszt kiírja. A rendszer nem telepít Windows-szolgáltatást, nem használja a weboldal DATABASE_URL beállítását, és csak 127.0.0.1-en figyel. Egyedi tesztadatkönyvtárat és véletlen jelszót készít. A PostgreSQL-teszt adatbázisában az integrációs és terhelési próba a saját létrehozott sémáját törli; ide ne tegyél megőrzendő adatot.

Másik, már futó helyi PostgreSQL-nél a `PORTAL_TEST_DATABASE_URL` környezeti változó megadható a terhelési tesztnek. Csak localhost és `kebpro_test_` kezdetű, portal séma nélküli adatbázis engedélyezett. Távoli szervert a terhelőprogram szándékosan nem céloz.

## HTTPS
Az OpenSSL 30 napos, localhost és 127.0.0.1 nevekre érvényes saját teszttanúsítványt készít a `.local-tests/tls/` alatt. Windows alatt a Git OpenSSL-jét keresi; más elérési út a `PORTAL_TEST_OPENSSL` változóval adható meg. A kulcsot és tesztjelszavakat ne töltsd fel a tárhelyre.

A teszt kizárólag a saját kérésküldőjében bízik meg ebben a tanúsítványban; nem kapcsolja ki a TLS-ellenőrzést, és nem módosítja a gép tanúsítványtárát. A böngésző emiatt figyelmeztetést mutathat a 3443-as címen. Ez nem nyilvánosan hitelesített HTTPS, és nem igazolja még a böngészős PWA/push működését. Lejárt teszttanúsítványt újra kell generálni.

Ellenőrzések: titkosított kérés, explicit megbízhatósági lánc, alapértelmezetten elutasított saját tanúsítvány, Secure/HttpOnly/SameSite sütik, érvénytelen Origin és hiányzó CSRF elutasítása.

## Terhelési forgatókönyv
Minden partner belép, megnyitja a felületet, lekéri a saját adatait, kétszer egyszerre beküldi ugyanazt a rendelést, majd az admin archiválja. Végül a partner visszaolvassa a Feldolgozva állapotot. A próba ellenőrzi, hogy az ismételt beküldések ugyanazt az azonosítót adják, nincs idegen rendelés a partnernél, és a rendelés- és archiválásszám pontosan egyezik.

Ez összesen 140 partner és 980 üzleti HTTP-kérés a három fokozatban, a biztonsági előellenőrzéseken felül. A jelentés fokozatonként medián, p95 és maximális kérésidőt közöl. A belépési és globális kéréskorlát csak a tesztpéldányban magasabb, mert minden szimulált partner ugyanarról az IP-ről jön; a normál alkalmazás alapértékei változatlanok.

A tesztben nincs valódi e-mail, push vagy ügyféladat. A tanúsítványok, adatbázisok és letöltött binárisok ignorált fájlok. A mérés HTTP- és adatbázis-terhelést vizsgál, nem böngészős renderelést, mobilinternetet vagy órákig tartó üzemi terhelést.

## Amihez még tesztszerver szükséges
A végleges domain tanúsítványa, HTTPS-átirányítás, reverse proxy, Secure sütik a proxy mögött, folyamatfelügyelet, valódi telefonos push és a tárhely kapacitása csak a tényleges telepítési környezetben ellenőrizhető. A jelenlegi app production indítása továbbra is tiltott; a helyi HTTPS nem oldja fel ezt. Következő lépés külön tesztcím és tesztadatbázis, aztán fokozatos szerveres próba. A helyi eredmény nem élesítési jóváhagyás.

## 2026-10-20-i helyi eredmények

PostgreSQL 18.4, Windows x64, Node 22.11.0. Az adatbázis-séma létrehozásakor talált foglalt indexnév (`session_user`) javítva `session_user_id_idx` névre. A PostgreSQL-teszt takarítása már nem takarja el az eredeti sémahibát. Teljes tesztcsomag: **55 sikeres, 0 hibás, 0 kihagyott**.

| Párhuzamos partner | SQLite lemez p95 | PostgreSQL p95 | PostgreSQL medián |
| --- | ---: | ---: | ---: |
| 10 | 1046 ms | 270 ms | 65 ms |
| 30 | 4414 ms | 512 ms | 202 ms |
| 100 | 17646 ms | 1745 ms | 834 ms |

A 100-as PostgreSQL-kör teljes üzleti folyamatának ideje 5,50 másodperc, leglassabb egyedi kérése 2,20 másodperc volt. A p95 az összes vizsgált útvonal kérésidejének közös percentilise, nem egyetlen rendelés teljes átfutása. A terhelési forgatókönyv minden fokozatban egyszer futott, ezért ezek pillanatfelvételek, nem garantált kapacitásértékek.

Mindkét adatbázison összesen 140 egyedi, archivált rendelés, 0 terhelési teszthiba, 0 duplikált rendelés. A PostgreSQL-tesztszerver a végén leállt. A teszt során nem történt tényleges e-mail- vagy push-küldés. A SQLite eredménye alapján nagy párhuzamos terhelésre a helyi tároló nem megfelelő; a PostgreSQL-es irány indokolt. A teljes állapotot olvasó írási réteg és a teljes adminlista későbbi skálázási korlát marad.

Géppel olvasható jelentések: `output/load-sqlite-disk.json`, `output/load-postgres.json`; teljes tesztkimenet: `output/postgres-local-validation.txt`.
