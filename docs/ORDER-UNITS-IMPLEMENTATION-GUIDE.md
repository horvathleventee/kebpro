# Termékegységek és minimális rendelés: megvalósítási útmutató

Ez az útmutató abból indul ki, hogy a portál eddig csak tesztüzemben működött. A tesztárak, mentett listák, piszkozatok és rendelések az éles indulás előtt törölhetők vagy újra létrehozhatók, ezért nincs szükség éles adatok migrálására. Törlés előtt érdemes megerősíteni, hogy mely adatokat szeretné a cég megtartani.

## 1. A hús súlyának és a minimumrendelésnek a meghatározása

A jelenlegi számítás minden kartont 10 kg-nak, minden darabot pedig 1 kg-nak vesz. A termékkatalógusban azonban eltérő kartonsúlyok szerepelnek, a kebabnyársak pedig különböző súlyban kaphatók. Emiatt az ellenőrzés nem méri megbízhatóan a meghirdetett 20 kg-os minimumot.

A fejlesztés előtt ezeket az üzleti szabályokat kell tisztázni:

- A minimum minden esetben 20 kg hús, vagy két karton önmagában is elegendő akkor is, ha együtt kevesebb mint 20 kg?
- Mennyi az egyes kartonok nettó hússúlya? Van olyan termék, amely többféle kartonméretben kapható?
- A darabra értékesített kebabnál hogyan választja ki a partner a nyárs súlyát? Az ár darabra vagy kilogrammra vonatkozik?
- Mely termékek számítanak bele a minimumba? Mi történjen azokkal, amelyeknek nincs ismert, állandó súlyuk?

A válaszokat a termékekhez vagy termékváltozatokhoz tartozó adatokként kell tárolni, nem pedig a mértékegységből vagy a terméknévből kikövetkeztetni. Egy állandó súlyú kartonnál megadható a kartononkénti kilogramm. A változó súlyú kebabnál választható méreteket lehet felajánlani, vagy be kell kérni és ellenőrizni kell a darabonkénti súlyt. Ha egy rendelési sorban különböző súlyú darabok is lehetnek, ezeket külön változatként kell kezelni. Ugyanazokat az adatokat használja a rendelési felület és a szerveroldali ellenőrzés.

A szerver a mennyiségek figyelembevételével számolja ki a teljes hússúlyt, és vesse össze a jóváhagyott minimummal. A kosárban a partner is lássa a minimumba beszámító súlyt és a még szükséges mennyiséget. A végső ellenőrzés a szerveren történjen.

**Ellenőrzés:** a határérték alatti, pontosan azt elérő és afeletti rendelések; különböző húskészítmények együttes rendelése; nem húskészítmények; minden kartonméret; változó súlyú darabok; hiányzó vagy érvénytelen súly. A kiválasztott változathoz tartozó árat és megjelenített egységet is ellenőrizni kell.

## 2. Az árak előkészítése az előírt rendelési egységekhez

Az új rendelési felület minden terméknél a hozzá rendelt egységet engedi használni. Egy másik egységhez korábban beállított ár nem érvényes automatikusan. Mivel a jelenlegi adatok tesztadatok, nem szükséges a régi árakat átváltani; a változó súlyú termékeknél az automatikus átváltás egyébként is hibás lehetne.

Az éles indulás előtt a tesztárakat vissza kell állítani vagy felül kell írni, majd minden rendelhető termékhez és egységhez meg kell adni a helyes alapárat. A megállapodott egyedi partnerárakat is rögzíteni kell. A munkatársi árbeállító felületen jelenjen meg a termék előírt rendelési egysége; célszerű ezt alapértelmezésként is kiválasztani. A partnerek meghívása előtt ellenőrizni kell, hogy minden aktív termékhez tartozik-e használható ár, mert hiányzó ár esetén a rendszer nem engedi elküldeni a rendelést.

**Ellenőrzés:** a partner minden aktív terméket a hozzá rendelt egységben tud megrendelni, és a megfelelő alap- vagy egyedi árat látja; hiányzó árnál egyértelmű üzenetet kap; a rendszer észleli, ha az ár az ellenőrzés és az elküldés között megváltozik.

## 3. Régi tesztrendelések, listák és piszkozatok kezelése

A mentett listák, piszkozatok és korábbi rendelések még tartalmazhatnak olyan egységeket, amelyeket az új szerveroldali ellenőrzés elutasít. Tesztüzem után a legegyszerűbb megoldás az elavult tesztadatok törlése, valamint a böngészőben helyileg tárolt piszkozatok törlése a teszteszközökön. Azokat a tesztadatokat meg kell őrizni, amelyeket a cég kifejezetten szeretne megtartani. Az új tesztrendeléseket és listákat már a végleges egységekkel kell létrehozni.

Ha az éles indulás után változik egy rendelési egység, külön tervre lesz szükség: azonosítani kell az érintett rekordokat, tájékoztatni kell a felhasználókat a szükséges javításokról, és kerülni kell a mennyiségek vagy árak észrevétlen átváltását, ha az átváltás nem egyértelmű.

**Ellenőrzés:** lista létrehozása és újbóli betöltése a végleges egységekkel; piszkozat visszaállítása; rendelés szerkesztése és sikeres elküldése. Ha régi rekordok megmaradnak, ellenőrizni kell, hogy a felhasználók felismerik és javítani tudják az érvénytelen tételeket.

## 4. Akciók kezelése a rendelési egységekkel

Az akciók szerveroldali ellenőrzése és munkatársi űrlapja jelenleg csak a kg és db egységet támogatja. A kizárólag kartonban, zacskóban vagy csomagban rendelhető termékek tényleges rendelési egységére így nem állítható be akció.

Ha minden termék lehet akciós, a szerveroldali ellenőrzést és a munkatársi űrlapot ki kell terjeszteni az összes támogatott rendelési egységre. A kedvezmény a kiválasztott egységre vonatkozzon, és a végső ár legyen azonos a partneri felületen és a rendelés elküldésekor. Ha az akciók csak bizonyos termékekre vagy egységekre vonatkozhatnak, ezt a korlátozást egyértelműen jelezni kell a munkatársi felületen.

**Ellenőrzés:** fix és levonásos akció minden támogatott egységnél; egyedi partnerárak; akció eltávolítása; árváltozás a rendelés jóváhagyása közben.

## 5. Automatikus és kézi ellenőrzések

A meglévő rendelési tesztadatokat a végleges egységekhez, árakhoz és minimális mennyiségekhez kell igazítani, hogy a partneri tesztcsomag ismét ellenőrizze az eredeti működési eseteket. Az új egységteszteket be kell venni az `npm run test:partner` parancsba, vagy olyan tesztparancsot kell használni, amely biztosan futtatja őket. Külön tesztek szükségesek a jóváhagyott súlyszabályokra, a régi rekordok kezelésére, ahol ez releváns, valamint a támogatott egységek akcióira.

Futtatni kell a partneri tesztcsomagot és a TypeScript-ellenőrzést, majd böngészőben végig kell próbálni a folyamatot munkatársként és partnerként: árak beállítása, a minimumnak megfelelő rendelés leadása, lista mentése és betöltése, rendelés módosítása. Végül ellenőrizni kell, hogy a munkatársi oldalon helyes mennyiségek, egységek, árak és végösszeg jelennek-e meg.

## Javasolt munkasorrend

1. Az üzleti szabályok egyeztetése: minimumrendelés, terméksúlyok, változatok és árazási egységek.
2. A termék- és változatsúlyok, valamint a szerveroldali minimumellenőrzés megvalósítása; a rendelési felület frissítése.
3. A munkatársi ár- és akcióbeállítások igazítása a rendelési egységekhez.
4. A jóváhagyott tesztadatok visszaállítása és az induló árak beállítása.
5. Az automatikus tesztek frissítése és futtatása, majd a munkatársi és partneri folyamat kézi ellenőrzése.
