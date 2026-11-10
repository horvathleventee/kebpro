# HolAzAutó – biztonságos helyi próba

A képernyőn megnyitott `38980`-as bemutató mindig szimulált adatokat használ. Az ebben az útmutatóban szereplő `38981`-es próba külön helyi SQLite adatbázissal indul, és valódi járműhelyeket kérhet le. Kizárólag erre a számítógépre kötődik; az alapértelmezett adatbázis és a staging-adatbázis beállításait nem használja. Élő push üzenetet nem küld.

1. Kérj a HolAzAutótól API-hoz engedélyezett teszt- vagy korlátozott hozzáférést, a fiókhoz tartozó HTTPS alapcímet és legalább egy tesztjármű numerikus `DeviceAsset` azonosítóját. Tisztázd a hozzáférést, a kvótát, a pozíciófrissítést és a token lejáratát. A webes bejelentkezési cím nem feltétlenül az API alapcíme.
2. A projekt gyökerében lévő, Git által figyelmen kívül hagyott `.env.portal.local` fájlba privát módon add meg az alábbiakat. Ha a fájl már létezik, a meglévő tartalmát ne töröld; a megfelelő sorokat módosítsd. Az értékek helyére a valódi adatokat írd. Ne küldd el a jelszót chatben vagy képernyőképen.

```dotenv
PORTAL_TRACKING_ENABLED=true
HOLAZAUTO_ORIGIN=https://AZ_API_ALAPCIME
HOLAZAUTO_LOGIN=AZ_API_FELHASZNALO
HOLAZAUTO_PASSWORD=AZ_API_JELSZO
```

Az alapcím csak HTTPS eredet lehet útvonal, perjel utáni API-útvonal, felhasználónév vagy jelszó nélkül. Speciális karaktereknél a dotenv idézőjelezési szabályait használd; a fájlhoz csak az illetékes helyi felhasználó férjen hozzá. A titkokat ne tedd forráskódba vagy Gitbe.
3. A projektkönyvtárban futtasd `node scripts/tracking-live-preview.cjs`. Nyisd meg a `http://127.0.0.1:38981/partner-admin/` címet. Az első induláskor generált céges belépési adatok a `data/tracking-live-preview/admin-access.txt` privát fájlba kerülnek. Ha a port foglalt vagy a fájlhoz nem férsz hozzá, a folyamat hibát jelez; a már létező adatbázist vagy belépési fájlt ne töröld automatikusan.
4. A **Járműkövetés** fül az admin számára kérdezi le a fiók járműveit. A rendszámot az API adott eszközének saját mezőjéből jeleníti meg; ha ott hiányzik, a munkatárs a helyi járműkatalógusban megadhatja. A **Túrához rendelés** résznél válassz napot, túrát és autót közvetlenül a listából; az azonosítót nem kell külön felvenni. A beosztás csak a kiválasztott napra szól. Az eszközazonosító nem feltétlenül a rendszám.
5. A partneroldali teszthez ebben az elkülönített portálban létrehozott és admin által jóváhagyott tesztpartner, aznapi tényleges tesztrendelés és annak ellenőrzött szállítási pontja szükséges. A partner a **Beállítások** oldalon jelölhet pontot; a céges felületen a **Partner szállítási pontja** résznél válaszd ki, ellenőrizd és hagyd jóvá. A munkatárs javaslat nélkül is jelölhet pontot. A koordináták ugyanarra a partnerre és pontos címre később újra felhasználhatók. Pontatlan vagy bizonytalan helyet ne hagyj jóvá.
6. Teszteld külön a 20 km-en kívüli üzenetet, a 20 km-en belüli térképet, a másik partner kizárását és a járműcsere hatását. Az öreg vagy hiányzó pozíció nem jelenik meg. A tényleges telefonos pushhoz külön HTTPS staging, feliratkozás, VAPID-beállítás és percenkénti ütemezett munkás, valamint külön eszközteszt kell; ez a helyi próba a push kézbesítését nem bizonyítja.

A próba végén állítsd le a Node folyamatot; az alkalmazás leállításával a lekérdezések megszűnnek. Az éles szolgáltatói választ, a pontos 20 km-es viselkedést, a térképszolgáltatás és a helyadatok adatkezelési feltételeit, valamint a fiók és a jogosultságok biztonságát üzembe helyezés előtt külön kell ellenőrizni.
