const crypto=require('node:crypto');
// Demo texts are frozen snapshots. Replace them only by adding a new version after legal approval.
const docs=Object.freeze({
 terms:Object.freeze({version:'draft-2026-10-28',title:'Partnerfelület használati feltételei – tervezet',sections:[
  ['A tervezetről','Ez a helyi bemutatóhoz készült tervezet, nem végleges vagy jogilag jóváhagyott feltétel. A tényleges szolgáltatási és üzleti feltételeket a Halasi Kebpro Kft.-vel kell véglegesíteni.'],
  ['A felület célja','A jóváhagyott üzleti partnerek a felületen keresztül rendelést adhatnak le, kezelhetik a rendeléseiket, híreket olvashatnak, és rendeléshez kapcsolódó bejelentést küldhetnek.'],
  ['Regisztráció és hozzáférés','A regisztráció jóváhagyásra vár. A belépési adatok védelme a felhasználó feladata. A hozzáférés letiltható; a részletes jogosultsági és megszüntetési feltételeket külön egyeztetni kell.'],
  ['Rendelés és árak','A felület a rendelkezésre álló árat és kiszállítási határidőt mutatja. Az árak áfatartalmát, az egyeztetendő árú termékek kezelését és a rendelés üzleti következményeit a végleges dokumentumban kell meghatározni.'],
  ['Működés és értesítések','Az alkalmazás internetkapcsolattól és az eszköz beállításaitól függ. Az értesítések nem garantáltan kézbesülnek; a hír- és akcióértesítések külön állíthatók.'],
  ['Kapcsolat és panasz','A rendeléshez kapcsolódó probléma az alkalmazásban is jelezhető. A cég kapcsolattartási és panaszkezelési adatait a végleges változatban kell ellenőrizni.']
 ]}),
 privacy:Object.freeze({version:'draft-2026-10-28',title:'Partneralkalmazás adatkezelési tájékoztatója – tervezet',sections:[
  ['A tervezetről','Ez a helyi bemutatóhoz készült, hiányos tájékoztató. Az adatkezelőnek az éles indulás előtt kell véglegesítenie az adatokat, jogalapokat, címzetteket és megőrzési időket.'],
  ['A felületen kezelt adatok','A regisztráció cégnevet, kapcsolattartót, telefonszámot, címet, e-mail-címet, felhasználónevet és jelszólenyomatot kezel. A rendszer rendeléseket, mentett listákat, partnerárakat, bejelentéseket, munkatársi műveleteket és értesítési beállításokat is tárolhat.'],
  ['Értesítések és eszköz','Az értesítéshez a böngésző külön engedélye szükséges. Az eszközfeliratkozás adatait a rendszer tárolja. A rendelési piszkozat és bizonyos felületi beállítások az adott böngésző helyi tárhelyén lehetnek; a felhasználás és jogalap véglegesítendő.'],
  ['Megőrzés','A helyi példában a három hónapnál régebben archivált, elmúlt kiszállítású rendelések sikeres mentés után törlődhetnek. A mentett listák és bejelentések nem tartoznak ebbe a törlésbe. Az éles megőrzési és mentési szabályokat az adatkezelőnek kell meghatároznia.'],
  ['További egyeztetés','Az adatkezelő és elérhetőségei, az egyes célokhoz tartozó jogalapok, adatfeldolgozók és esetleges adattovábbítások, pontos tárolási idők, érintetti jogok, panasztételi lehetőség, valamint a tervezett GPS-kezelés véglegesítésre várnak.']
 ]})
});
function hash(doc){return crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex');}
function snapshot(kind){const d=docs[kind];return {version:d.version,hash:hash(d)};}
function resolve(kind,version){return docs[kind]?.version===version?docs[kind]:null;}
function verifyAcceptance(input){const terms=snapshot('terms'),privacy=snapshot('privacy');const {assert}=require('./domain');assert(input.termsAccepted===true,'A használati feltételek elfogadása szükséges.');assert(input.termsVersion===terms.version&&input.termsHash===terms.hash&&input.privacyVersion===privacy.version&&input.privacyHash===privacy.hash,'A dokumentumok időközben megváltoztak. Frissítsd az oldalt és olvasd el őket újra.',409);return {terms,privacy,termsDocument:JSON.stringify(docs.terms),privacyDocument:JSON.stringify(docs.privacy),acceptedAt:new Date().toISOString()};}
module.exports={snapshot,resolve,verifyAcceptance};
