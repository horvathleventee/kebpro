# Figyelmeztetés kis mennyiségű rendelésnél – követelmények és megvalósítási terv

## Cél és egyeztetett működés

A portál fogadja a kis mennyiségű rendeléseket is. Ha a rendelés nem éri el a jóváhagyott mennyiségi határt, a partner figyelmeztetést kap arról, hogy a mennyiség várhatóan nem elegendő, és a Kebpro munkatársa telefonon keresheti. A figyelmeztetés nem akadályozza a rendelés elküldését, és nem ígéri, hogy biztosan történik telefonhívás.

Az adminisztrációs felületen az ilyen rendelés egyértelmű jelölést kap. A partner telefonszáma minden rendelésnél megjelenik, nem csak a kis mennyiségűeknél, hogy szükség esetén a munkatárs kapcsolatba léphessen vele.

A 20 kg-os határba csak a húskészítmények súlya számít bele. A kétkartonos alternatíva a jogosult gyorsfagyasztott (Gy.F.) kebabtermékekre és a Gy.F. pulled pork termékre vonatkozik. A különböző jogosult termékek kartonjai összeadhatók. A számítás alábbi nyitott részletei tisztázandók a fejlesztés előtt. A rendelés elfogadásának többi feltétele – például az érvényes ár és rendelési határidő – továbbra is érvényes.

## Partneri felület

- A kosárban, a rendelés ellenőrzése előtt jelenjen meg az állapot, és változzon meg, amikor a partner módosítja a tételeket vagy mennyiségeket.
- Ha a rendelés nem éri el a határt, javasolt szöveg: „A rendelt mennyiség várhatóan nem elegendő a kiszállításhoz. Rendelésedet elküldheted, de előfordulhat, hogy a Kebpro munkatársa telefonon felkeres egyeztetés céljából.”
- A figyelmeztetés látszódjon a végső ellenőrzésnél is, de az elküldés gomb maradjon használható. Sikeres mentés után a szokásos visszaigazolás jelenjen meg.
- Ha az állapot a rendelkezésre álló adatokból nem dönthető el, ne állítsuk sem azt, hogy a határ teljesült, sem azt, hogy biztosan nem teljesült. Ehelyett kérjünk egyeztetést, vagy jelenítsük meg, milyen adat hiányzik.

## Adminisztrációs felület

- A rendeléskártyán, az új és archivált rendelések között is jelenjen meg jól látható szöveges jelölés, például: „Mennyiségi határ alatt – telefonos egyeztetés szükséges lehet”. Ne csak szín jelezze az állapotot.
- Ha a mennyiségi állapot nem számítható ki megbízhatóan, külön jelölés jelenjen meg: „Mennyiség nem ellenőrizhető – egyeztetés szükséges lehet”.
- Minden rendelésnél jelenjen meg a partner telefonszáma. Mobilon lehet kattintható telefonhivatkozás; hiányzó számnál „Nincs megadva telefonszám” szerepeljen, ne egy üres mező.
- A jelölés a rendelés módosítása után az új tartalomnak megfelelően frissüljön. A telefonhívás lehetősége önmagában nem jelent automatikus hívást, értesítést vagy feladatkiosztást.

## Tisztázandó üzleti szabályok

Az alábbiak nem dönthetők el egyértelműen a jelenlegi leírásból; a megvalósítás előtt véglegesíteni kell őket:

1. **A 20 kg összetétele:** a különböző húskészítmények súlya összeadható-e? A nem húsból készült termékek nem számítanak bele.
2. **Két karton:** a jogosult termékek kartonjai összeadhatók; a jogosult termékek teljes listáját véglegesíteni kell.
3. **Jogosult termékkör:** a gyorsfagyasztott csirke- és marhahúsos kebab, valamint a Gy.F. pulled pork beletartozik; meg kell erősíteni, hogy van-e további jogosult termék.
4. **Változó súlyok:** a darabra rendelt kebabnyársak súlya eltérhet, és egyes kartonok többféle súlyban szerepelnek. Hogyan választja ki vagy adja meg a partner a tényleges súlyt? Melyik változathoz milyen ár tartozik?
5. **Hiányos adatok:** ha egy rendelés súlya nem ismert, melyik tájékoztató szöveg és adminjelölés a megfelelő? A rendelés ettől még elfogadható legyen.
6. **Telefonszám forrása:** a rendelésnél mindig a partner aktuális száma jelenjen meg, vagy a rendeléskor érvényes számot kell megőrizni? Ha több kapcsolattartó van, melyik az elsődleges?

A 20 kg és a két karton összehasonlításánál pontosan a határértéket elérő rendelés már teljesíti az adott feltételt. A két alternatíva kapcsolatát a jóváhagyott szabály szerint kell alkalmazni; a kétkartonos kivételt nem szabad minden kartonos termékre kiterjeszteni.

## Műszaki megközelítés

1. **Termékadatok:** a jogosult termékeket és a megbízható súlyokat vagy választható változatokat egyértelmű termékadatként kell kezelni. Nem szabad minden kartont automatikusan 10 kg-nak vagy minden darabot 1 kg-nak tekinteni. Az egyedi termékazonosítók vagy explicit tulajdonságok előnyösebbek a szabad szövegű név alapján történő besorolásnál.
2. **Közös szabály:** készüljön egy jól tesztelhető számítás, amely a jóváhagyott szabályok alapján legalább három állapotot ad: határt teljesít, határ alatt van, illetve nem állapítható meg. A szerver számítása legyen az irányadó; a felület azonos szabályból vagy a szervertől kapott eredményből jelenítse meg az állapotot.
3. **Rendelés leadása:** a `portal/domain.js` jelenlegi, 20 kg alatt hibát dobó ellenőrzését figyelmeztető állapot számítása váltsa fel. A szerver a kliens által küldött jelölést ne fogadja el ellenőrzés nélkül. A rendelés létrehozásakor és módosításakor is számolni kell.
4. **Rendelési adatok:** a szabályok változásának és az előzményeknek megfelelően meg kell határozni, hogy az állapot és a felhasznált súlyadatok pillanatképként tárolódnak-e. A régi rendelések kezelését és az ismeretlen adatok megjelenítését is meg kell tervezni. Mivel az eddigi adatok tesztadatok, a jóváhagyott tesztadatok alaphelyzetbe állíthatók; éles migráció nem feltétlenül szükséges.
5. **Partneri és adminfelület:** a partneri kosár és jóváhagyás figyelmeztetést mutat; az admin rendeléslistája megjeleníti a szerver által meghatározott állapotot és a telefonszámot. A meglévő kódban van partner- és felhasználói telefonszámra épülő visszaesési logika; ezt következetesen és a jóváhagyott kapcsolattartási szabállyal összhangban kell használni. A telefonszámot csak a jogosult munkatársi válaszban szabad az adminfelület számára rendelkezésre bocsátani.
6. **Árak és egységek:** a meglévő, egységekhez kötött ár- és akcióbeállításokat a végleges termékváltozatokhoz kell igazítani. A súlyváltozat bevezetése nem jelenthet feltételezett árátváltást.

## Elfogadási és tesztelési terv

- 20 kg alatt a figyelmeztetés megjelenik, a rendelés mégis sikeresen elküldhető, az admin pedig látja a jelölést.
- Pontosan 20 kg-nál és felette a súlyfeltétel teljesül a véglegesített számítás szerint.
- Egy jogosult Gy.F. kartonnál a kivétel nem teljesül; két jogosult kartonnál teljesül. Nem jogosult termék kartonja nem számít bele a kétkartonos kivételbe. Két különböző jogosult termékből rendelt egy-egy karton is teljesíti a kivételt; a Gy.F. pulled pork kartonjait is bele kell számítani.
- Ismeretlen súlynál a partner és az admin is az egyeztetett, bizonytalanságot jelző üzenetet látja; a rendelés továbbra is leadható.
- A kosár módosításakor a figyelmeztetés frissül. Egy korábban leadott rendelés módosítása az adminjelölést is frissíti; az archiválás és visszaállítás nem veszíti el azt.
- A telefonszám kis és megfelelő mennyiségű, új és archivált rendelésekben is látható; hiányzó szám esetén egyértelmű jelzés jelenik meg. Partneri jogosultsággal más partner száma nem érhető el.
- Az ár, egység, jogosultság, ismételt kérés és rendelési határidő meglévő ellenőrzése továbbra is működik. Az új tesztek bekerülnek a szokásos partneri tesztparancsba, a korábbi tesztek adatai pedig a végleges szabályokhoz igazodnak.
- Böngészős végigpróbálás partnerként és munkatársként, asztali és mobil nézetben, beleértve a figyelmeztetés olvashatóságát és a telefonhivatkozást.

## Javasolt végrehajtási sorrend

1. A nyitott üzleti és kapcsolattartási kérdések jóváhagyása, a jogosult termékek és súlyok listájának véglegesítése.
2. A termékadatok és a háromállapotú szabály kialakítása, majd célzott szerveroldali tesztelése.
3. A tiltás megszüntetése és a rendelés létrehozási, illetve módosítási folyamatának frissítése.
4. A partneri figyelmeztetés és az adminjelölés, valamint a minden rendelésnél látható telefonszám megvalósítása.
5. A tesztadatok és árak egyeztetett rendezése, az automatikus tesztek frissítése és futtatása, végül a teljes folyamat kézi ellenőrzése.

Ez a dokumentum megvalósítási terv; önmagában nem módosítja a portál működését.

