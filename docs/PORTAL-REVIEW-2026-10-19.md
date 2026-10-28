# Helyi teljesítmény- és biztonsági ellenőrzés – 2026-10-19

## Elvégzett javítások
- Két partneroldali rendelési állapot: Beérkezett és archiválás után Feldolgozva. A köztes állapot API megszűnt. Visszaállításkor és partnermódosításkor ismét Beérkezett.
- A partner nézetben a 14 napos szállítási lehetőségek számítása kérésenként egyszer történik, nem minden korábbi rendelésnél újra. 1000 szintetikus rendelés, 8 helyi mérés: medián előtte 172,65 ms, utána 0,38 ms. Ez a safePartner adat-előkészítés, nem teljes oldalbetöltési vagy éles terhelési mérés. Reprodukció: node scripts/benchmark-partner.cjs.
- Az automatikus lekérdezések nem halmozódnak lassú kapcsolatnál, offline állapotban nem indulnak. A már meglévő háttérlap-szüneteltetés megmaradt.
- Érvénytelen vagy hiányzó munkamenetsütinél nincs felesleges adatbázis-olvasás.
- Nyilvános statikus fájlok ETag alapján újraellenőrizhetők: változatlan fájlra 304. Hitelesített oldalak és API-k továbbra is no-store.
- Közben megszűnt/letiltott felhasználónál a módosítás előtti ellenőrzés 401-et ad, nem belső hibát.
- Függőségek kompatibilis frissítése; Nodemailer 10.1.7 és SQLite3 6.0.1. Utóbbi Node >=20.17.0-t igényel; helyi Node 22.11.0-val tesztelve. Levél összeállítása stream transporttal ellenőrizve, tényleges levélküldés nélkül.

## Ellenőrzések és korlátok
- 54 sikeres teszt, 1 kihagyott valódi PostgreSQL-integrációs teszt (nincs tesztadatbázis).
- Jogosultság, CSRF, partneradatok elkülönítése, letiltott fiók, jelszóhelyreállítás, rendelésverzió-ütközés és archiválás ellenőrzései sikeresek.
- npm audit --omit=dev: 0 ismert sérülékenység a vizsgálat idején. A fejlesztői nodemon/chokidar/braces lánc 3 magas besorolású jelzése megmaradt; éles környezetben npm ci --omit=dev és normál Node indítás szükséges. Automatikus force downgrade nem történt.
- Ez célzott forráskód-ellenőrzés és automatizált tesztelés, nem teljes penetrációs teszt. Nincs biztonsági garancia.
- A portál továbbra is helyi bemutató, production indítása tiltott. Élesítéshez külön konfiguráció kell: HTTPS, Secure sütik, helyes reverse proxy / Origin kezelés és megbízható szerveroldali folyamatfelügyelet.
- PostgreSQL íráskor még teljes állapotot olvasó kompatibilitási réteg; az admin teljes rendeléslistát kap. Nagy adatmennyiségnél további célzott lekérdezések és lapozás szükséges. A lokális gyorsulás nem igazolja a nagy többfelhasználós terhelhetőséget.
- A végleges szerveren még PostgreSQL-próba, mobilhálózatos betöltésmérés, párhuzamos rendelési terhelés, SMTP-kézbesítés és mentés-visszaállítási próba szükséges. A fő weboldal közös függőségeket használ, így annak űrlapjait és e-mail-folyamatait is ellenőrizni kell az éles frissítés előtt.
