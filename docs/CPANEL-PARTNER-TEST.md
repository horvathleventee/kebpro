# Privát cPaneles partner tesztkörnyezet

Ez a leírás fiktív adatokkal, zárt tesztre vonatkozik. A rendszer nem tekinthető élesre késznek: a jogi dokumentumok tervezetek, és a valódi PostgreSQL-kapcsolatot, e-mailt, telefonos push-t, ütemezést, külön tárhelyes mentést és visszaállítást még a szerveren ellenőrizni kell.

## Előfeltételek

1. A meglévő weboldal mentése és visszaállítási lehetősége. A Node alkalmazás rootja és indítófájlja marad a jelenlegi. A GitHub-frissítés önmagában nem bizonyítja, hogy a cPanelen futó példány frissült.
2. Külön üres PostgreSQL tesztadatbázis és ahhoz tartozó külön felhasználó, a tesztadatbázisban séma és táblák létrehozásához szükséges jogosultságokkal. A weboldal adatbázisát ne használd.
3. A cPanel tárhelyen működő HTTPS, valamint ellenőrizendő, hogy a helyi Passenger/proxy helyesen továbbítja a HTTPS protokollt. A privát tesztfelület HTTPS nélküli kapcsolatot elutasít.
4. Működő SMTP. A levelek valóban kimennek, teszteléshez kizárólag saját e-mail-címeket használj.

## A Node alkalmazás külön tesztváltozói

Az alábbi változókat a szerveren kell megadni. A jelenlegi weboldal beállításait ne töröld, jelszavakat ne ossz meg és ne commitolj. A tesztmód alapértelmezetten kikapcsolt.

| Név | Rendeltetés |
| --- | --- |
| `PORTAL_STAGING_ENABLED` | `true` kapcsolja be a privát partner tesztútvonalakat. |
| `PORTAL_DATABASE_URL` | A külön tesztadatbázis PostgreSQL URL-je, a cPanelben megadott teljes névvel és felhasználóval. A jelszó URL-speciális karaktereit kódolni kell. |
| `PORTAL_PUBLIC_ORIGIN` | Pontos HTTPS eredet, például `https://kebpro.hu`, útvonal nélkül. |
| `PORTAL_TEST_USER` | A külön tesztkapu neve, 4–64 ékezet nélküli karakter. |
| `PORTAL_TEST_PASSWORD` | A tesztkapu külön, legalább 8 karakteres jelszava, kettőspont nélkül. |
| `PORTAL_BOOTSTRAP_USER` | A legelső tesztadmin felhasználóneve. |
| `PORTAL_BOOTSTRAP_PASSWORD` | A legelső tesztadmin külön, legalább 10 karakteres jelszava. |
| `PORTAL_BOOTSTRAP_EMAIL` | A tesztadmin saját e-mail-címe jelszó-visszaállításhoz. |

A bootstrap változók az első fiók létrehozása után eltávolíthatók. Későbbi átírásuk nem módosítja a létrehozott fiókot. A portál meglévő `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` beállításokat használhatja.

## Első próba

Csak a felkészített kód telepítése és a biztonsági ellenőrzés után indítsd újra a webalkalmazást. Ellenőrizd először a főoldalt és a weboldal űrlapjait, majd a `/partner/` és `/partner-admin/` HTTPS címeket. Előbb a tesztkapu adatait kéri a böngésző, utána az alkalmazás saját bejelentkezését. Saját címekkel, tesztpartnerekkel ellenőrizd a regisztrációt, jóváhagyást, rendelést és jelszó-visszaállítást. A privát tesztkapu PWA-val és a Passenger HTTPS-továbbításával való tényleges együttműködését telefonon még ellenőrizni kell.

Hibás vagy nem elérhető partner-konfiguráció esetén a partnerútvonal 503-as választ ad, a weboldal tovább futhat. Naplóban csak általános hiba szerepel; jelszavakat ne másolj hibajelentésbe.

## Háttérfolyamat

Passenger esetén a webalkalmazás folyamata nem megbízható időzítő. A `scripts/partner-staging-worker.cjs` egyszer fut és leáll; percenkénti cPanel cronként csak a szolgáltató által támogatott, ellenőrzött beállítással használható. A cron nem feltétlenül örökli a Node alkalmazás változóit: a szükséges privát változókat külön `.env.portal.local` fájlból is olvassa. A fájl csak az adott felhasználó számára legyen olvasható, ne legyen nyilvános, és ne kerüljön Gitbe. A pontos Node végrehajtható útvonalat a cPanel virtuális környezetében kell ellenőrizni. Egyetlen cron feladatot állíts be.

`PORTAL_BACKUP_DIR` abszolút, a projektmappán és a nyilvános webmappán kívüli, privát könyvtár. A lokális alkalmazásmentés alapból 14 példányt tart meg; **nem helyettesíti a külön tárhelyen tárolt PostgreSQL-mentést és visszaállítási próbát**. A worker a megőrzési szabály szerint törölhet archivált tesztrendeléseket; a valós adatokra vonatkozó megőrzést még jóvá kell hagyni.

A távoli push alapértelmezetten szimulált. `PORTAL_PUSH_LIVE=true` és `PORTAL_VAPID_SUBJECT=mailto:...` csak kifejezetten saját teszteszközös ellenőrzéshez állítható be. A tényleges push-kézbesítés, cPaneles időzítés és a monitor külön szerveres próbát igényel.

Leállításhoz előbb kapcsold ki a cron feladatot, majd `PORTAL_STAGING_ENABLED=false` és a szolgáltatói előírás szerint indítsd újra az alkalmazást. A tesztadatbázis nem törlődik automatikusan.
