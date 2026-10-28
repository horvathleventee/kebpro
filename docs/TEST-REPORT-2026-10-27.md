# Átfogó helyi ellenőrzés – 2026. október 27.

A partner- és adminalkalmazás elkülönített tesztadataival történt. A tesztek sem valódi e-mailt, sem valódi push-üzenetet nem küldtek.

- Teljes automatizált csomag: 61 sikeres, 0 hibás, 0 kihagyott, helyi PostgreSQL-lel. Az árak és bejelentések PostgreSQL-es tárolása, visszaolvasása és adminnaplózása is ellenőrizve.
- Mobil Chrome: partner és admin külön böngészőkörnyezet, 390×844; belépés, árak, kosár és piszkozat újratöltés, rendelés, bejelentés, adminválasz, összekészítés, adminmenü és figyelmeztetés-számláló. A leadott ár későbbi módosítás után változatlan. Ellenőrizve az asztali navigáció megjelenése. Oldalhibát nem észleltünk.
- Npm biztonsági ellenőrzésben két magas súlyosságú hiba javítva: multer 2.5.0, body-parser 2.4.0. Az új teljes audit eredménye: 0 ismert sérülékenység.
- HTTPS: saját teszttanúsítvány megbízhatósága és a nem megbízható tanúsítvány elutasítása, biztonságos cookie, CSRF és idegen Origin ellenőrizve.

## Helyi terhelés

Az izolált teszt minden felhasználóval belép, saját adatot kér, párhuzamosan kétszer ugyanazt a rendelést küldi, archivál és visszaolvassa az állapotot. Az adott lépcső kérésenkénti p95 ideje (nem egy rendelés teljes átfutása):

| Párhuzamos partner | PostgreSQL p95 | SQLite p95 |
| --- | ---: | ---: |
| 10 | 0,40 s | 1,01 s |
| 100 | 2,72 s | 17,14 s |
| 200 | 6,59 s | nem futott |

A PostgreSQL 10/100/200-as lépcsője összesen 310 külön rendelést és archiválást igazolt; a SQLite 10/30/100-as lépcső 140-et. A két kör nem egyidejűleg futott; a 200-as fokozat alatt egy mobilos teszt is futott, ezért az idő nem elkülönített benchmark. Az IP-alapú limitet a terhelőprogram csak a tesztpéldányban megemelte. Egyetlen helyi mérés nem igazolja a tényleges tárhely kapacitását vagy az egész napos működést.

Jelentések: `output/load-postgres-extended-2026-10-27.json`, `output/load-sqlite-disk.json`, `output/postgres-pricing-complaint-2026-10-27.txt`.

## Hátralévő éles ellenőrzések

A jelenlegi app csak helyi bemutató, és production üzemmódban szándékosan nem indul. Éles telepítési kialakítás, domain/HTTPS/proxy, folyamatfelügyelet, PostgreSQL-adatbázis, valódi Android és iPhone push, SMTP-próba, külső titkosított mentés és visszaállítás, illetve éles szerveres terhelés még szükséges. A GPS-integráció nincs bekötve. Az árak áfatartalma és a bejelentések megőrzési ideje még egyeztetendő. A helyi ellenőrzés nem bizonyítja, hogy minden lehetséges hiba megszűnt.

## Újrafuttatás

- `npm run test:partner:postgres-local`: teljes csomag és alap terhelés saját helyi PG-példánnyal.
- `$env:PORTAL_LOAD_STAGES='10,100,200'; npm run test:partner:postgres-local`: kibővített terhelés, maximum 300 egyidejű partner/lépcső.
- `npm run test:partner:load`: külön lemezes SQLite, 10/30/100 partner.
- Mobil/asztali Chrome próba: `npm install --prefix .local-tests/browser --no-save --ignore-scripts playwright-core`, majd `node scripts/partner-ui-smoke.cjs`. Chrome más helyen: `PORTAL_TEST_CHROME_PATH`. Ez külön memóriás tesztadatbázist és szintetikus fiókokat használ.
