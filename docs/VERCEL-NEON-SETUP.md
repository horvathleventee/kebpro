# Vercel + Neon beállítás

## 1. Neon connection string
A Neon projektben a `Connect` gombra kattintva másold ki a teljes `postgresql://...` kapcsolatot.

## 2. Vercel Environment Variables
A Vercel projektben `Settings -> Environment Variables` alatt importáld vagy add meg az alábbi kulcsokat:

- DB_ADAPTER=postgres
- DATABASE_URL=postgresql://...
- COMPANY_NAME=Kiskunhalasi Kebpro Kft.
- COMPANY_PHONE=+36 70 451 5003
- COMPANY_PHONE2=+36 70 451 5002
- COMPANY_FAX=+36 77 426 014
- COMPANY_EMAIL=info@kebpro.hu
- COMPANY_ADDRESS=Szegedi út 8., 6400 Kiskunhalas, HUNGARY
- ENABLE_EMAIL=true vagy false
- NOTIFICATION_EMAIL=info@kebpro.hu
- MAIL_FROM=kebpro.webform@gmail.com
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=465
- SMTP_SECURE=true
- SMTP_USER=kebpro.webform@gmail.com
- SMTP_PASS=GMAIL_APP_PASSWORD
- ADMIN_USER=admin
- ADMIN_PASS=eros_admin_jelszo

Importálható minta: `.env.vercel.example`

## 3. Új deploy
Environment változó módosítás után mindig új deploy kell.

## 4. Ellenõrzés
Admin oldal:
- `/admin/igenyek`

Ha a DB kapcsolat rendben van, az admin oldalon az `Adatbázis állapot` panelnél ez látszik:
- adapter: `postgres`
- kapcsolat: `Rendben`

## 5. Neon SQL ellenõrzés
A Neon `Edit data` / SQL editor részében futtasd:

```sql
SELECT * FROM submissions ORDER BY created_at DESC;
SELECT * FROM app_settings;
```

## 6. Mit jelent az üres admin
Ha az admin üres, annak tipikus okai:
- a deploy még nem a friss env-ekkel fut
- nincs `DATABASE_URL` beállítva
- `DB_ADAPTER` nem `postgres`
- a form submit egy korábbi deployra ment

## 7. Elsõ rekord teszt
1. Nyisd meg az oldalt
2. Küldj be egy ajánlatkérést
3. Nyisd meg az admin oldalt
4. Futtasd le a Neon SQL lekérdezést

Ha mindkét helyen megjelenik a rekord, a mentés rendben mûködik.
