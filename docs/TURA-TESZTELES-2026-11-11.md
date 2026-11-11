# Túrák kezelése – tesztelési jelentés

Dátum: 2026. november 11. A vizsgálat a helyi munkaváltozatra és izolált tesztadatokra vonatkozik.

## Elvégzett ellenőrzések

- `npm run build:partner-react`: TypeScript-ellenőrzés és React build sikeres.
- `npm run test:partner`: 143 sikeres, 1 kihagyott. A PostgreSQL-integrációs teszthez külön dedikált tesztadatbázis szükséges.
- `npm run test:tracking`: 43 sikeres, köztük a túrák kezelésének szerveroldali és HTTP-integrációs tesztjei.
- `node scripts/partner-route-management-smoke.cjs`: izolált SQLite-adatbázissal és helyettesített járműszolgáltatóval, mobil Chromium nézetben sikeres. A próba létrehoz, módosít, partnerhez és járműhöz rendel egy túrát, ellenőrzi az azonos partnerhez tartozó azonos napi ütközés és a hozzárendelt túra törlésének elutasítását, majd a hozzárendelések megszüntetése után törli azt.
- `node scripts/partner-reschedule-smoke.cjs`: izolált mobil böngészőben sikeres túraáthelyezés és rendelésmódosítás.

## Ellenőrzött szabályok

- Egy vagy több heti nap megadása, módosítása és a változás megőrzése a migráció újbóli futtatása után.
- Legfeljebb 20 aktív túra; a törölt túra nem számít bele a korlátba. A régi rendelés és a túra történeti rekordja megmarad.
- Új túra hozzárendelése partnerhez, naphoz és járműhöz; eltérő partnerek külön túrái lehetnek ugyanazon a napon. Azonos partnernél a heti nap és a jövőbeli egyedi áthelyezések ütközése ellenőrzött.
- Partnerhez rendelt túra törlésének elutasítása; a mai vagy jövőbeli rendelést, járműbeosztást vagy áthelyezést érintő törlés tiltása. A heti nap módosítása nem érvényteleníthet mai vagy jövőbeli rendelést vagy beosztást.
- Munkatársi munkamenet és CSRF ellenőrzése; létrehozási, módosítási és törlési műveletek szerveroldali kezelése; a törlés naplózása.

Egy nap több túra is futhat, de egy partnerhez ugyanarra a napra legfeljebb egy túra rendelhető. Az új hozzárendelés, a heti menetrend módosítása és az áthelyezés is elutasítja az ütközést. A korábbi verzióban már létrejött rendelések olvashatók és megmaradnak.

## A vizsgálat korlátai

A teszt nem használt valós partneradatot, éles HolAzAutó-bejelentkezést vagy valódi járművet. Nem bizonyítja a tényleges PostgreSQL-szerver, az éles tárhely, a telefonos push vagy az összes böngésző és akadálymentességi eszköz működését. A kódváltozás a vizsgálat idején helyi munkaváltozat; önmagában nincs a tárhelyre telepítve.
