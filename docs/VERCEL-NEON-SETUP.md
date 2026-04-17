# Vercel + Neon be�ll�t�s

## 1. Neon connection string
A Neon projektben a `Connect` gombra kattintva m�sold ki a teljes `postgresql://...` kapcsolatot.

## 2. Vercel Environment Variables
A Vercel projektben `Settings -> Environment Variables` alatt import�ld vagy add meg az al�bbi kulcsokat:

- DB_ADAPTER=postgres
- DATABASE_URL=postgresql://...
- COMPANY_NAME=Halasi Kebpro Kft.
- COMPANY_PHONE=+36 70 451 5003
- COMPANY_PHONE2=+36 70 451 5002
- COMPANY_FAX=+36 77 426 014
- COMPANY_EMAIL=info@kebpro.hu
- COMPANY_ADDRESS=Szegedi �t 8., 6400 Kiskunhalas, HUNGARY
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

Import�lhat� minta: `.env.vercel.example`

## 3. �j deploy
Environment v�ltoz� m�dos�t�s ut�n mindig �j deploy kell.

## 4. Ellen�rz�s
Admin oldal:
- `/admin/igenyek`

Ha a DB kapcsolat rendben van, az admin oldalon az `Adatb�zis �llapot` paneln�l ez l�tszik:
- adapter: `postgres`
- kapcsolat: `Rendben`

## 5. Neon SQL ellen�rz�s
A Neon `Edit data` / SQL editor r�sz�ben futtasd:

```sql
SELECT * FROM submissions ORDER BY created_at DESC;
SELECT * FROM app_settings;
```

## 6. Mit jelent az �res admin
Ha az admin �res, annak tipikus okai:
- a deploy m�g nem a friss env-ekkel fut
- nincs `DATABASE_URL` be�ll�tva
- `DB_ADAPTER` nem `postgres`
- a form submit egy kor�bbi deployra ment

## 7. Els� rekord teszt
1. Nyisd meg az oldalt
2. K�ldj be egy aj�nlatk�r�st
3. Nyisd meg az admin oldalt
4. Futtasd le a Neon SQL lek�rdez�st

Ha mindk�t helyen megjelenik a rekord, a ment�s rendben m�k�dik.
