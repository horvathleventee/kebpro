# Környezeti tájékoztató és csomagolási QR-kód

A nyomtatott QR-kód pontos, állandó célja: https://kebpro.hu/kornyezet
A localhost cím kizárólag fejlesztői előnézetre szolgál.

## Fájlok

- public/qr/kebpro-kornyezet.svg: vektoros, fekete kód fehér háttérrel.
- public/qr/kebpro-kornyezet.png: raszteres változat.
- utils/environment.js: magyar, angol és német tájékoztatószöveg.
- views/environment.ejs: az aloldal felépítése.
- public/css/environment.css: az aloldal megjelenése.

A kód Q hibajavítási szinttel és négy modulnyi fehér szegéllyel készült. A PNG-t független ZXing-visszaolvasással ellenőriztük. A környező fehér szegélyt a tördelés során meg kell tartani.

## Közzététel

Az oldalon két eredeti, angol nyelvű gyártói nyilatkozat érhető el megnyitás és letöltés gombokkal. A PDF-ek a public/pdf/kornyezet mappában vannak, dátumozott fájlnevekkel. Frissítéskor új fájlnévvel és a utils/environment.js hivatkozásainak módosításával kerülhető el a korábbi PDF gyorsítótárból történő kiszolgálása. Az első dokumentum keltezése 2026-01-21; az eredeti fájlnévben szereplő 2025-11-21 eltér ettől. A végleges, jóváhagyott tartalom ugyanitt frissíthető. A cím maradjon elérhető a nyomtatott csomagolások teljes használati ideje alatt, későbbi weboldalcsere után is.

A végleges tartalom feltöltésekor eltávolítható a /kornyezet útvonal X-Robots-Tag: noindex, follow fejléce, és az oldal hozzáadható a sitemaphez.

Nyomdai jóváhagyás előtt az éles HTTPS-címet, a végleges grafikai állomány QR-kódját, majd a tényleges méretű és anyagú próbanyomatot is ellenőrizni kell. A generált kód már az éles domainre mutat, nem a helyi előnézetre.

## Helyi indítás PowerShellből

```powershell
$env:DB_ADAPTER="memory"
$env:PORT="3000"
$env:ENABLE_EMAIL="false"
$env:ENABLE_CAREER_EMAIL="false"
node app.js
```

Előnézet: http://localhost:3000/kornyezet
